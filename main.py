# main.py — Zandalee all-in-one with .env validation
from __future__ import annotations
import os, sys, json, time, threading, queue, subprocess, re
from dataclasses import dataclass
from pathlib import Path
from datetime import datetime

# --- .env early ---
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception:
    pass

APP_ROOT = Path(__file__).parent.resolve()

# =========================
#  ENV VALIDATION (STRICT)
# =========================
def _mask_secret(s: str) -> str:
    if not s:
        return ""
    if len(s) <= 10:
        return "•••"
    return f"{s[:6]}…{s[-4:]}"

def _as_bool(v: str | None, default: bool = True) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")

def _validate_env_or_exit() -> dict:
    """
    Validates critical .env keys and normalizes optional ones.
    Exits the process with code 1 if a required key is missing or clearly malformed.
    """
    issues: list[str] = []
    warnings: list[str] = []

    # --- Required keys (hard stop if missing) ---
    required = {
        "TOGETHER_API_KEY": lambda v: isinstance(v, str) and len(v) >= 10 and v.startswith(("tgp_", "tga_", "tgpt_", "tgv_")),
        "ZANDALEE_LAWS_TOKEN": lambda v: isinstance(v, str) and len(v) >= 16,
    }

    env = {k: os.getenv(k) for k in set(required.keys()) | {"PORCUPINE_ACCESS_KEY", "KEEP_SCREENSHOTS", "MAX_SCREENSHOT_CACHE_MB"}}

    for k, checker in required.items():
        v = env.get(k)
        if not v:
            issues.append(f"Missing required env: {k}")
        else:
            try:
                ok = checker(v)
            except Exception:
                ok = False
            if not ok:
                issues.append(f"Env value looks malformed: {k} (= {_mask_secret(v)})")

    # --- Optional (warn) ---
    porcupine = env.get("PORCUPINE_ACCESS_KEY")
    if porcupine in (None, "", '"', "''"):
        warnings.append("PORCUPINE_ACCESS_KEY not set — hotword will be disabled.")
    else:
        # superficial shape check; real SDK will validate more deeply
        if len(porcupine) < 20:
            warnings.append("PORCUPINE_ACCESS_KEY looks very short; hotword may fail.")

    # Screenshots settings
    keep_ss = _as_bool(env.get("KEEP_SCREENSHOTS"), True)
    os.environ["KEEP_SCREENSHOTS"] = "true" if keep_ss else "false"

    max_cache_raw = env.get("MAX_SCREENSHOT_CACHE_MB", "200")
    try:
        max_cache = int(str(max_cache_raw).strip())
        if max_cache <= 0:
            raise ValueError
        os.environ["MAX_SCREENSHOT_CACHE_MB"] = str(max_cache)
    except Exception:
        warnings.append(f"MAX_SCREENSHOT_CACHE_MB invalid ({max_cache_raw!r}); defaulting to 200.")
        os.environ["MAX_SCREENSHOT_CACHE_MB"] = "200"
        max_cache = 200  # normalized

    # Decide fate
    if issues:
        print("\n[ENV CHECK] ❌ Critical configuration problems detected:\n  - " + "\n  - ".join(issues))
        if warnings:
            print("\n[ENV CHECK] Also noted warnings:\n  - " + "\n  - ".join(warnings))
        print("\nFix the issues in your .env and start again.")
        sys.exit(1)

    if warnings:
        print("[ENV CHECK] ⚠️  Warnings:\n  - " + "\n  - ".join(warnings))

    # Minimal success summary (masked)
    print("[ENV CHECK] ✅ Environment OK:")
    print(f"  • TOGETHER_API_KEY = {_mask_secret(env['TOGETHER_API_KEY'] or '')}")
    print(f"  • ZANDALEE_LAWS_TOKEN = {_mask_secret(env['ZANDALEE_LAWS_TOKEN'] or '')}")
    print(f"  • PORCUPINE_ACCESS_KEY = {_mask_secret(porcupine or '') if porcupine else '(not set)'}")
    print(f"  • KEEP_SCREENSHOTS = {os.environ['KEEP_SCREENSHOTS']}")
    print(f"  • MAX_SCREENSHOT_CACHE_MB = {os.environ['MAX_SCREENSHOT_CACHE_MB']}")

    return {
        "TOGETHER_API_KEY": env["TOGETHER_API_KEY"],
        "ZANDALEE_LAWS_TOKEN": env["ZANDALEE_LAWS_TOKEN"],
        "PORCUPINE_ACCESS_KEY": porcupine,
        "KEEP_SCREENSHOTS": keep_ss,
        "MAX_SCREENSHOT_CACHE_MB": int(os.environ["MAX_SCREENSHOT_CACHE_MB"]),
    }

# Run validation before any heavy imports that might depend on keys
_ENV_OK = _validate_env_or_exit()

# --- Modules (tolerant imports) ---
tts = None
try:
    import tts as tts  # optional direct-mode
except Exception as e:
    print(f"[BOOT] WARNING: tts import failed: {e}")

_stt = None
try:
    import google_speech_to_text as _stt
except Exception as e:
    print(f"[BOOT] WARNING: google_speech_to_text import failed: {e}")

_orch = None
try:
    import orchestrator as _orch
except Exception as e:
    print(f"[BOOT] WARNING: orchestrator import failed: {e}")

# Console aesthetics
try:
    from colorama import init as colorama_init, Fore, Style
    colorama_init(autoreset=True)
except Exception:
    class _N: RESET_ALL=""; BRIGHT=""; GREEN=""; CYAN=""; YELLOW=""; RED=""
    Fore = Style = _N()

# ---- Rich HUD (Live updates) ----
RICH_AVAILABLE = False
try:
    from rich.console import Console, Group
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.rule import Rule
    from rich.box import ROUNDED
    from rich.progress import BarColumn, TextColumn, Progress
    rc = Console()
    RICH_AVAILABLE = True
except Exception:
    rc = None  # type: ignore

# --- Security guard ---
try:
    from security import Security
    SEC = Security()
except Exception:
    class _SecFallback:
        def __init__(self): self.token_env = os.getenv("ZANDALEE_LAWS_TOKEN") or ""
        def list_policy(self): return True, {"domains": {"allow": [], "block": []}, "apps": {"allow": [], "block": []}}
        def allow_domain(self, v): return True, f"allowed: {v}"
        def block_domain(self, v): return True, f"blocked: {v}"
        def allow_app(self, v): return True, f"allowed: {v}"
        def block_app(self, v): return True, f"blocked: {v}"
        def save_policy(self): return True, "ok"
        def evaluate(self, **_): return "allow", "default-allow"
        def authorize_core_law_change(self, token): return bool(self.token_env and token and token == self.token_env)
    SEC = _SecFallback()

# --- Optional audio monitor deps ---
_SD_OK = _NP_OK = False
try:
    import sounddevice as sd
    _SD_OK = True
except Exception:
    sd = None  # type: ignore
try:
    import numpy as np
    _NP_OK = True
except Exception:
    np = None  # type: ignore

# --- Paths & logs ---
APP_DIR = Path(os.getenv("APPDATA") or Path.home()) / "Zandalee"
APP_DIR.mkdir(parents=True, exist_ok=True)
VOICE_CFG_PATH = APP_DIR / "voice_config.json"
LOG_DIR = Path.cwd() / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
SESSION_LOG = LOG_DIR / f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

def log(line: str, src: str = "SYSTEM"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    color = {"SYSTEM": Fore.YELLOW, "ZANDALEE": Fore.CYAN + Style.BRIGHT, "FATHER": Fore.GREEN, "ERROR": Fore.RED}
    msg = f"[{ts}] [{src}] {line}"
    print(color.get(src, "") + msg + Style.RESET_ALL)
    try:
        with open(SESSION_LOG, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

# --- Config model ---
@dataclass
class ZConfig:
    INPUT_DEVICE_ID: int | None = None
    VOICE_HINT: str = "en_GB-southern_english_female-low"
    SAMPLE_RATE: int = 16000
    CORE_LAWS_PATH: str = str(APP_ROOT / "zandalee_core_laws.json")
    SECURITY_POLICY_PATH: str = str(APP_ROOT / "security_policy.json")

    def export_env(self):
        os.environ.setdefault("CORE_LAWS_PATH", self.CORE_LAWS_PATH)
        os.environ.setdefault("SECURITY_POLICY_PATH", self.SECURITY_POLICY_PATH)
        os.environ.setdefault("ZANDALEE_TRANSPORT", "STDIO")  # voice service transport default

# --- Mic ensure (stub for future) ---
def ensure_input_device(cfg: ZConfig) -> ZConfig:
    return cfg

# --- VU/latency state ---
_VU = {"ok": True, "rms": 0.0, "peak": 0.0, "level": 0, "listening": False, "speaking": False, "device_name": "default"}
_LAT = {"stt_ms": 0, "llm_ms": 0, "tts_ms": 0, "total_ms": 0}

def _set_vu(ok=None, rms=None, peak=None, level=None, listening=None, speaking=None, device_name=None):
    if ok is not None: _VU["ok"] = ok
    if rms is not None: _VU["rms"] = rms
    if peak is not None: _VU["peak"] = peak
    if level is not None: _VU["level"] = level
    if listening is not None: _VU["listening"] = listening
    if speaking is not None: _VU["speaking"] = speaking
    if device_name is not None: _VU["device_name"] = device_name

def _set_lat(stt_ms=0, llm_ms=0, tts_ms=0, total_ms=0):
    _LAT.update(dict(stt_ms=stt_ms, llm_ms=llm_ms, tts_ms=tts_ms, total_ms=total_ms))

# --- SAFE speaker: uses voice_client.py over STDIO when present ---
def _speak(text: str | None) -> int:
    if not text:
        return 0
    _set_vu(speaking=True)
    t0 = time.perf_counter()
    try:
        vc_path = APP_ROOT / "voice_client.py"
        if vc_path.exists():
            cmd = [sys.executable, str(vc_path), "--transport", "STDIO", "--speak", str(text)]
            subprocess.Popen(cmd, cwd=str(APP_ROOT),
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=False)
        else:
            print(f"[ZANDALEE] {text}")
    except Exception as e:
        log(f"speak failed: {e}", "ERROR")
        print(text)
    finally:
        ms = int((time.perf_counter() - t0) * 1000)
        _set_vu(speaking=False)
    return ms

# --- Live mic VU monitor (background thread) ---
def _start_vu_monitor(cfg: ZConfig, stop: threading.Event):
    if not (_SD_OK and _NP_OK):
        _set_vu(ok=False); return
    device_id = cfg.INPUT_DEVICE_ID
    try:
        devs = sd.query_devices()
        name = devs[device_id]["name"] if (device_id is not None and 0 <= device_id < len(devs)) else "default"
    except Exception:
        name = "default"
    _set_vu(device_name=name)

    sr = cfg.SAMPLE_RATE
    blocksize = max(256, int(sr * 0.02))  # ~20ms

    def audio_cb(indata, frames, time_info, status):
        try:
            x = np.frombuffer(indata, dtype=np.int16).astype(np.float32) / 32768.0
            if x.size == 0: return
            rms = float(np.sqrt(np.mean(x**2)))
            peak = float(np.max(np.abs(x)))
            vu = int(min(100, max(0, (20.0 * rms) ** 1.2 * 100)))
            _set_vu(rms=rms, peak=peak, level=vu)
        except Exception:
            pass

    kwargs = dict(samplerate=sr, channels=1, dtype="int16", blocksize=blocksize, callback=audio_cb)
    if device_id is not None:
        kwargs["device"] = device_id

    def run():
        try:
            with sd.RawInputStream(**kwargs):
                while not stop.is_set():
                    time.sleep(0.05)
        except Exception as e:
            log(f"VU monitor error: {e}", "ERROR"); _set_vu(ok=False)

    threading.Thread(target=run, daemon=True).start()

# --- Fancy console HUD ---
def _render_hud(cfg: ZConfig):
    if not RICH_AVAILABLE:
        print("="*74)
        print("  ZANDALEE — voice online  ".center(74, " "))
        print("="*74)
        return "hud"

    vu_level = _VU["level"]; listening = _VU["listening"]; speaking = _VU["speaking"]; device_name = _VU["device_name"]
    from rich.console import Group
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.rule import Rule
    from rich.box import ROUNDED
    from rich.progress import BarColumn, TextColumn, Progress

    vu_bar = Progress(TextColumn("[bold]Mic[/]"), BarColumn(transient=True, bar_width=30), TextColumn("{task.percentage:>3.0f}%"), expand=False)
    vu_bar.add_task("vu", total=100, completed=vu_level)

    lt = Table.grid(expand=True); lt.add_column(justify="left"); lt.add_column(justify="right")
    ltxt = f"STT: {_LAT['stt_ms']} ms   •   LLM: {_LAT['llm_ms']} ms   •   TTS: {_LAT['tts_ms']} ms   •   TOTAL: {_LAT['total_ms']} ms"
    left = Text.assemble(("Mic: ", "bold"), f"{device_name}  ",
                         ("Voice: ", "bold"), cfg.VOICE_HINT, "  ",
                         ("State: ", "bold"), ("Listening", "green") if listening else ("Speaking", "cyan") if speaking else ("Idle", "dim"))
    right = Text(datetime.now().strftime("%H:%M:%S"), style="dim"); lt.add_row(left, right)

    header = Panel.fit(lt, title=Text(" Z A N D A L E E ", style="bold cyan"),
                       subtitle=Text("voice • security • actions • logs", style="dim"),
                       border_style="cyan", box=ROUNDED)
    meter_panel = Panel.fit(Group(vu_bar, Text(ltxt)), title="Live Meters", border_style="magenta", box=ROUNDED)
    return Group(header, meter_panel, Rule(style="cyan"))

# --- Core laws helpers + commands ---
def _load_core_laws(path: str) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as e:
        log(f"Failed to load core laws: {e}", "ERROR"); return {}

def _try_set_core_laws(laws: dict) -> bool:
    try:
        if _orch and hasattr(_orch, "set_core_laws"):
            token = input("Enter core-laws token: ").strip()
            if not SEC.authorize_core_law_change(token):
                log("Core-law change denied (invalid token).", "ERROR"); _speak("Core law change denied."); return False
            _orch.set_core_laws(laws, token=token)  # type: ignore
            log("Core laws updated.", "SYSTEM"); _speak("Core laws updated."); return True
    except Exception as e:
        log(f"Failed to set core laws: {e}", "ERROR")
    return False

def _show_help_short():
    print(":help | :mic.recalibrate | :laws.status | :laws.reload | :laws.update <path> | :policy.list")
    print(":policy.allow domain <host> | :policy.allow app <exe>")
    print(":policy.block domain <host>  | :policy.block app <exe>")
    print(":mem.learn … | :mem.search … | :mem.stats | :mem.snapshot | :mem.rollup [YYYY-MM]")
    print(":project.new \"Name\" | :project.switch \"Name\" | :project.list")

# --- Policy & memory console commands (delegate to security/memory modules) ---
def _handle_command(line: str, cfg: ZConfig, laws_path: str, MEM) -> bool:
    low = line.strip().lower()
    # laws
    if low == ":laws.status":
        print(f"Core laws: {laws_path}"); return True
    if low == ":laws.reload":
        laws = _load_core_laws(laws_path); _try_set_core_laws(laws); return True
    if low.startswith(":laws.update"):
        parts = line.split(maxsplit=1)
        if len(parts) < 2: print("Usage: :laws.update <path>"); return True
        path = parts[1].strip().strip('"')
        laws = _load_core_laws(path); _try_set_core_laws(laws); return True

    # security policy
    if low == ":policy.list":
        ok, data = SEC.list_policy(); print(json.dumps(data, indent=2) if ok else data); return True
    if low.startswith(":policy.allow") or low.startswith(":policy.block"):
        parts = line.split()
        if len(parts) < 4:
            print("Usage: :policy.allow|:policy.block domain|app <value>"); return True
        op = parts[0].split('.')[1]; kind = parts[1].lower(); val = " ".join(parts[2:]).strip()
        if op == "allow":
            ok, msg = (SEC.allow_domain(val) if kind=="domain" else SEC.allow_app(val) if kind=="app" else (False,"usage"))
        else:
            ok, msg = (SEC.block_domain(val) if kind=="domain" else SEC.block_app(val) if kind=="app" else (False,"usage"))
        print(msg); ok2, msg2 = SEC.save_policy(); print(("saved: " if ok2 else "save failed: ") + msg2)
        _speak("Policy updated."); return True

    # memory & projects
    if low.startswith(":mem.") or low.startswith(":project."):
        try:
            import memory_commands as mcmd
            # Ask memory_commands to run its own env sanity check (token present, etc.)
            if hasattr(mcmd, "validate_env_for_memory"):
                mcmd.validate_env_for_memory(speak=_speak)
            if mcmd.handle(line, MEM, _speak, SEC=SEC): 
                return True
        except Exception as e:
            print(f"memory console error: {e}")
        return True

    if low in (":help", "help"):
        _show_help_short(); return True

    return False

# --- Input loops ---
def _text_input_loop(q: queue.Queue, stop: threading.Event):
    _show_help_short()
    while not stop.is_set():
        try:
            s = input("> ").strip()
            if not s: continue
            q.put({"kind":"text","text":s})
            if s.lower() in ("exit", "quit"): stop.set(); break
        except EOFError:
            stop.set(); break
        except Exception as e:
            print(f"[ERROR] text loop: {e}"); time.sleep(0.2)

def _voice_input_loop(q: queue.Queue, stop: threading.Event, cfg: ZConfig):
    if not _stt:
        print("[SYSTEM] STT module not available; voice loop disabled."); return
    listen_fn = None
    for cand in ("listen_once", "record_and_transcribe", "transcribe_request"):
        if hasattr(_stt, cand): listen_fn = getattr(_stt, cand); break
    if not listen_fn:
        print("[SYSTEM] No compatible STT listen function; voice loop disabled."); return
    print("[SYSTEM] Voice loop active.")
    while not stop.is_set():
        try:
            kwargs = {}
            if cfg.INPUT_DEVICE_ID is not None: kwargs["device_id"] = cfg.INPUT_DEVICE_ID
            if "sample_rate" in getattr(listen_fn, "__code__", type("c", (), {"co_varnames": ()})).co_varnames:
                kwargs["sample_rate"] = cfg.SAMPLE_RATE
            t0 = time.perf_counter()
            text = listen_fn(**kwargs) if kwargs else listen_fn()
            stt_ms = int((time.perf_counter() - t0) * 1000)
            if isinstance(text, str) and text.strip():
                q.put({"kind":"voice","text":text.strip(),"timings":{"stt_ms":stt_ms}})
        except Exception as e:
            print(f"[ERROR] voice loop: {e}"); time.sleep(0.2)

# --- Main ---
def main():
    cfg = ZConfig(); cfg.export_env()
    cfg = ensure_input_device(cfg)

    # Core laws (read-only bootstrap to orchestrator)
    core_laws = _load_core_laws(cfg.CORE_LAWS_PATH)
    if _orch and hasattr(_orch, "set_core_laws"):
        try:
            _orch.set_core_laws(core_laws, token=None)  # type: ignore
            print("[SYSTEM] Core laws provided to orchestrator (read-only init).")
        except Exception as e:
            print(f"[ERROR] Orchestrator refused initial laws: {e}")

    # Initialize memory
    import memory as zmem
    MEM = zmem.Memory()  # encryption auto-enables if ZANDALEE_LAWS_TOKEN is set

    # HUD / VU
    stop_ev = threading.Event()
    _start_vu_monitor(cfg, stop_ev)

    # Queues + threads
    q: queue.Queue = queue.Queue()
    threading.Thread(target=_text_input_loop, args=(q, stop_ev), daemon=True).start()
    # Optional voice loop:
    # threading.Thread(target=_voice_input_loop, args=(q, stop_ev, cfg), daemon=True).start()

    if RICH_AVAILABLE:
        rc.print(_render_hud(cfg))  # type: ignore

    _speak("Zandalee is online.")

    # Main event loop
    while not stop_ev.is_set():
        try:
            msg = q.get(timeout=0.1)
        except queue.Empty:
            continue

        kind = msg.get("kind"); text = (msg.get("text") or "").strip()
        if not text:
            continue

        # 1) exit/quit
        if text.lower() in ("exit", "quit"):
            _speak("Goodbye."); break

        # 2) natural project trigger
        m = re.match(r"^zandalee\s+we\s+are\s+(starting|beginning|kicking\s*off)\s+a\s+new\s+project\s+(.+)$", text, flags=re.IGNORECASE)
        if m:
            import project_manager as pm
            name = m.group(2).strip().strip('"')
            info = pm.ensure_project(name)
            _speak(f"Project {info.name} {'created' if info.created else 'opened'}.")
            print(json.dumps({"ok": True, "project": info.name, "path": str(info.path), "created": info.created}, indent=2))
            continue

        # 3) console commands (:mem.*, :project.*, :policy.*, :laws.*)
        if text.startswith(":"):
            if _handle_command(text, cfg, cfg.CORE_LAWS_PATH, MEM):
                continue

        # 4) fallback → orchestrator agent
        if _orch and hasattr(_orch, "handle_instruction"):
            try:
                _orch.handle_instruction(text, _speak)  # your existing flow
            except Exception as e:
                print(f"[ERROR] orchestrator: {e}")
                _speak("I hit an error in the orchestrator.")
        else:
            print("No orchestrator wired. Echo:", text)

    stop_ev.set()
    _speak("Session closed.")

if __name__ == "__main__":
    main()
