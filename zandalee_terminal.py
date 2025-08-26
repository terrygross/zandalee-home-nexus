# zandalee_terminal.py — stable TUI (no flicker), long-paste friendly
# - PromptToolkit multiline input (Shift+Enter for newline, Enter to send)
# - Renders the Rich UI ONLY on events (no continuous reflow)
# - All :mem.* / :project.* / :policy.* / :laws.* commands supported
# - Voice via voice_client.py (STDIO) if present
# - .env validation with masked secrets

from __future__ import annotations
import os, sys, time, json, threading, re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from collections import deque
import importlib

# ----------------------------
# .env (validate, mask, normalize)
# ----------------------------
def _mask_secret(s: str) -> str:
    if not s: return ""
    if len(s) <= 10: return "•••"
    return f"{s[:6]}…{s[-4:]}"

def _as_bool(v: str | None, default=True) -> bool:
    if v is None: return default
    return v.strip().lower() in ("1","true","yes","y","on")

def _env_check() -> dict:
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    except Exception:
        pass

    issues, warns = [], []
    env = {}
    env["TOGETHER_API_KEY"] = os.getenv("TOGETHER_API_KEY")
    env["ZANDALEE_LAWS_TOKEN"] = os.getenv("ZANDALEE_LAWS_TOKEN")
    if not env["TOGETHER_API_KEY"] or len(env["TOGETHER_API_KEY"]) < 10:
        issues.append("Missing or malformed TOGETHER_API_KEY")
    if not env["ZANDALEE_LAWS_TOKEN"] or len(env["ZANDALEE_LAWS_TOKEN"]) < 16:
        issues.append("Missing or too-short ZANDALEE_LAWS_TOKEN")

    env["PORCUPINE_ACCESS_KEY"] = os.getenv("PORCUPINE_ACCESS_KEY", "")
    if not env["PORCUPINE_ACCESS_KEY"]:
        warns.append("Hotword disabled (no PORCUPINE_ACCESS_KEY).")

    env["KEEP_SCREENSHOTS"] = "true" if _as_bool(os.getenv("KEEP_SCREENSHOTS"), True) else "false"
    os.environ["KEEP_SCREENSHOTS"] = env["KEEP_SCREENSHOTS"]

    try:
        cache_raw = os.getenv("MAX_SCREENSHOT_CACHE_MB", "200").strip()
        env["MAX_SCREENSHOT_CACHE_MB"] = str(max(1, int(cache_raw)))
    except Exception:
        env["MAX_SCREENSHOT_CACHE_MB"] = "200"
        warns.append("MAX_SCREENSHOT_CACHE_MB invalid; using 200MB.")

    os.environ.setdefault("ZANDALEE_TRANSPORT", "STDIO")

    print("[ENV] ✅ OK" if not issues else "[ENV] ❌ Problems detected")
    print(f"  • TOGETHER_API_KEY = {_mask_secret(env['TOGETHER_API_KEY'] or '')}")
    print(f"  • ZANDALEE_LAWS_TOKEN = {_mask_secret(env['ZANDALEE_LAWS_TOKEN'] or '')}")
    print(f"  • PORCUPINE_ACCESS_KEY = {_mask_secret(env['PORCUPINE_ACCESS_KEY']) if env['PORCUPINE_ACCESS_KEY'] else '(not set)'}")
    print(f"  • KEEP_SCREENSHOTS = {env['KEEP_SCREENSHOTS']}")
    print(f"  • MAX_SCREENSHOT_CACHE_MB = {env['MAX_SCREENSHOT_CACHE_MB']}")
    if warns: print("  ⚠ " + " | ".join(warns))
    if issues:
        for i in issues: print("  ✖ " + i)
        sys.exit(1)
    return env

ENV = _env_check()

# ----------------------------
# Imports (tolerant)
# ----------------------------
APP_ROOT = Path(__file__).parent.resolve()

_orch = None
try:
    import orchestrator as _orch
except Exception as e:
    print(f"[BOOT] WARNING: orchestrator import failed: {e}")

MEM = None
try:
    memory = importlib.import_module("memory")
    MEM = memory.Memory()  # encryption auto-enables with token
except Exception as e:
    print(f"[BOOT] WARNING: memory import failed: {e}")

mcmd = None
try:
    mcmd = importlib.import_module("memory_commands")
except Exception as e:
    print(f"[BOOT] WARNING: memory_commands import failed: {e}")

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
        def evaluate(self, **_): return "allow", "default"
        def authorize_core_law_change(self, token): return bool(self.token_env and token and token == self.token_env)
    SEC = _SecFallback()

# Optional audio monitor for VU
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

# Rich (for pretty rendering)
from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.box import ROUNDED
from rich.layout import Layout
from rich.progress import BarColumn, TextColumn, Progress

# PromptToolkit (input)
from prompt_toolkit import PromptSession
from prompt_toolkit.history import InMemoryHistory
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.formatted_text import HTML

# ----------------------------
# State / Config
# ----------------------------
@dataclass
class ZConfig:
    INPUT_DEVICE_ID: int | None = None
    VOICE_HINT: str = "en_GB-southern_english_female-low"
    SAMPLE_RATE: int = 16000

cfg = ZConfig()

console = Console()
LOG_DIR = Path.cwd() / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
SESSION_LOG = LOG_DIR / f"terminal_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

def _log(line: str, src: str = "SYSTEM"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"[{ts}] [{src}] {line}"
    try:
        with open(SESSION_LOG, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

# Conversation buffer (last N)
MAX_MSGS = 500
messages: deque[dict] = deque(maxlen=MAX_MSGS)
def add_msg(role: str, text: str):
    messages.append({"role": role, "text": text, "ts": datetime.now().strftime("%H:%M:%S")})
    _log(text, "FATHER" if role=="FATHER" else "ZANDALEE" if role=="ZANDALEE" else "SYSTEM")

# VU & latency
VU = {"ok": True, "level": 0, "device_name": "default"}
LAT = {"stt_ms": 0, "llm_ms": 0, "tts_ms": 0, "total_ms": 0}
STATE = {
    "listening": False,
    "speaking": False,
    "project": os.getenv("ZANDALEE_ACTIVE_PROJECT") or "(none)",
    "hotword": bool(ENV["PORCUPINE_ACCESS_KEY"])
}

# ----------------------------
# Voice output (safe STDIO)
# ----------------------------
def speak(text: str | None):
    if not text: return
    STATE["speaking"] = True
    try:
        vc = APP_ROOT / "voice_client.py"
        if vc.exists():
            import subprocess
            subprocess.Popen([sys.executable, str(vc), "--transport", "STDIO", "--speak", str(text)],
                             cwd=str(APP_ROOT),
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=False)
    except Exception as e:
        add_msg("SYSTEM", f"TTS failed: {e}")
    finally:
        STATE["speaking"] = False

# ----------------------------
# Mic VU monitor (background)
# ----------------------------
def start_vu_monitor(stop: threading.Event):
    if not (_SD_OK and _NP_OK):
        VU["ok"] = False
        return
    def cb(indata, frames, _time, status):
        try:
            x = np.frombuffer(indata, dtype=np.int16).astype(np.float32) / 32768.0
            if x.size == 0: return
            rms = float(np.sqrt(np.mean(x**2)))
            vu = int(min(100, max(0, (20.0 * rms) ** 1.2 * 100)))
            VU["level"] = vu
        except Exception:
            pass
    kwargs = dict(samplerate=cfg.SAMPLE_RATE, channels=1, dtype="int16",
                  blocksize=max(256, int(cfg.SAMPLE_RATE*0.02)), callback=cb)
    try:
        devs = sd.query_devices()
        VU["device_name"] = devs[cfg.INPUT_DEVICE_ID]["name"] if (cfg.INPUT_DEVICE_ID is not None and 0 <= cfg.INPUT_DEVICE_ID < len(devs)) else "default"
    except Exception:
        VU["device_name"] = "default"
    def run():
        try:
            with sd.RawInputStream(**kwargs):
                while not stop.is_set():
                    time.sleep(0.05)
        except Exception:
            VU["ok"] = False
    threading.Thread(target=run, daemon=True).start()

# ----------------------------
# Render UI (single-shot)
# ----------------------------
def render_top_bar() -> Panel:
    state = "Listening" if STATE["listening"] else "Speaking" if STATE["speaking"] else "Idle"
    status = Text.assemble(
        ("ZANDALEE ", "bold cyan"),
        ("[online]  ", "green"),
        ("Mic: ", "bold"), f"{VU['device_name']}  ",
        ("Voice: ", "bold"), f"{cfg.VOICE_HINT}  ",
        ("State: ", "bold"), state + "  ",
        ("Hotword: ", "bold"), ("ON  ", "green") if STATE["hotword"] else ("OFF  ", "dim"),
        ("Project: ", "bold"), (Path(STATE["project"]).name if STATE["project"] != "(none)" else "(none)"),
        ("  Time: ", "bold"), datetime.now().strftime("%H:%M:%S")
    )
    return Panel(status, border_style="cyan", box=ROUNDED)

def render_meters() -> Panel:
    vu_bar = Progress(TextColumn("Mic"), BarColumn(bar_width=30), TextColumn("{task.percentage:>3.0f}%"), expand=False)
    vu_bar.add_task("vu", total=100, completed=VU["level"])
    lat = f"STT: {LAT['stt_ms']} ms  •  LLM: {LAT['llm_ms']} ms  •  TTS: {LAT['tts_ms']} ms  •  TOTAL: {LAT['total_ms']} ms"
    body = Group(vu_bar, Text(lat))
    return Panel(body, title="Live Meters", border_style="magenta", box=ROUNDED)

def render_conversation(max_lines: int = 500) -> Panel:
    tbl = Table.grid(expand=True)
    tbl.add_column(no_wrap=True, ratio=1)
    tbl.add_column(ratio=16)
    for m in list(messages)[-max_lines:]:
        role = m["role"]; ts = m["ts"]
        label = f"[{ts}] {role}:"
        style = "cyan" if role=="ZANDALEE" else "white" if role=="FATHER" else "yellow"
        tbl.add_row(Text(label, style=style, overflow="fold"), Text(m["text"], overflow="fold"))
    return Panel(tbl, title="Conversation", border_style="white", box=ROUNDED)

def build_layout() -> Layout:
    layout = Layout()
    layout.split(
        Layout(name="header", size=3),
        Layout(name="body"),
    )
    layout["body"].split_row(
        Layout(name="left", ratio=3),
        Layout(name="right", ratio=1)
    )
    layout["header"].update(render_top_bar())
    layout["left"].update(render_conversation())
    layout["right"].update(render_meters())
    return layout

def refresh_ui(clear: bool = True):
    if clear: console.clear()
    console.print(build_layout())

# ----------------------------
# Routing
# ----------------------------
def _natural_project_trigger(text: str) -> str | None:
    m = re.match(r"^zandalee\s+we\s+are\s+(starting|beginning|kicking\s*off)\s+a\s+new\s+project\s+(.+)$", text, re.IGNORECASE)
    return m.group(2).strip().strip('"') if m else None

def route_text(text: str):
    global MEM
    line = text.strip()
    if not line: return
    add_msg("FATHER", line)

    # Commands
    if line.startswith(":"):
        if mcmd and hasattr(mcmd, "handle"):
            try:
                handled = mcmd.handle(line, MEM, speak, SEC=SEC)
                if handled:
                    return
            except Exception as e:
                add_msg("SYSTEM", f"Command error: {e}")
                return

    # Natural project trigger
    pname = _natural_project_trigger(line)
    if pname:
        try:
            pm = importlib.import_module("project_manager")
            info = pm.ensure_project(pname)
            STATE["project"] = str(info.path)
            add_msg("SYSTEM", f"Project {info.name} {'created' if info.created else 'opened'} at {info.path}")
            speak(f"Project {info.name} ready.")
            return
        except Exception as e:
            add_msg("SYSTEM", f"Project error: {e}")
            return

    # Orchestrator
    if _orch and hasattr(_orch, "handle_instruction"):
        t0 = time.perf_counter()
        try:
            _orch.handle_instruction(line, speak)
        except Exception as e:
            add_msg("SYSTEM", f"Orchestrator error: {e}")
        finally:
            LAT["llm_ms"] = int((time.perf_counter() - t0) * 1000)
    else:
        # Fallback: echo + store as working note
        if MEM:
            try:
                rid = MEM.remember(line, kind="working", tags=["console"])
                add_msg("SYSTEM", f"(no orchestrator wired) stored working note id={rid}")
            except Exception as e:
                add_msg("SYSTEM", f"(no orchestrator) note failed: {e}")

# ----------------------------
# Terminal loop (no Rich.Live)
# ----------------------------
def run_terminal():
    stop_ev = threading.Event()
    start_vu_monitor(stop_ev)

    kb = KeyBindings()
    history = InMemoryHistory()
    session = PromptSession(history=history, multiline=True)

    @kb.add("c-m")    # Ctrl+M → toggle listen (visual)
    def _(event):
        STATE["listening"] = not STATE["listening"]
        refresh_ui()

    @kb.add("c-l")    # Ctrl+L → clear conversation
    def _(event):
        messages.clear()
        refresh_ui()

    @kb.add("f5")     # F5 → manual refresh
    def _(event):
        refresh_ui()

    @kb.add("escape") # Esc → stop TTS (signal)
    def _(event):
        STATE["speaking"] = False

    instruction_bar = HTML(
        "<b>Enter</b> send • <b>Shift+Enter</b> newline  |  "
        "<b>Ctrl+M</b> mic  •  <b>Ctrl+L</b> clear  •  <b>F5</b> refresh  •  <b>Esc</b> stop TTS"
    )

    speak("Zandalee terminal ready.")
    refresh_ui(clear=True)

    while True:
        # dynamic quick status in prompt (no heavy redraw)
        prompt_label = "\n> "
        try:
            text = session.prompt(
                prompt_label,
                key_bindings=kb,
                include_default_pygments_style=False,
                bottom_toolbar=lambda: HTML(
                    f"Mic {VU['level']}% | State: "
                    f"{'Listening' if STATE['listening'] else 'Speaking' if STATE['speaking'] else 'Idle'} "
                    f"| Project: {(Path(STATE['project']).name if STATE['project']!='(none)' else '(none)')}"
                ) if True else instruction_bar
            )
        except (KeyboardInterrupt, EOFError):
            add_msg("SYSTEM", "Exiting…")
            speak("Session closed.")
            break

        if not text.strip():
            continue
        if text.strip().lower() in ("exit","quit"):
            add_msg("SYSTEM", "Goodbye."); speak("Goodbye."); break

        route_text(text)
        refresh_ui(clear=True)

    stop_ev.set()

# ----------------------------
# Entry
# ----------------------------
if __name__ == "__main__":
    run_terminal()
