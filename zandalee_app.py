from __future__ import annotations
import os, sys, json, time, threading, subprocess, importlib
from dataclasses import dataclass
from pathlib import Path

APP_ROOT = Path(__file__).parent.resolve()
UI_DIR = APP_ROOT / "ui" / "dist"
INDEX_HTML = UI_DIR / "index.html"

# --- env
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception:
    pass

# --- optional deps
_sd = _np = None
try:
    import sounddevice as _sd  # pip install sounddevice
except Exception:
    _sd = None
try:
    import numpy as _np       # pip install numpy
except Exception:
    _np = None

# --- orchestrator / memory (optional)
_orch = None
try:
    import orchestrator as _orch
except Exception:
    _orch = None

MEM = None
try:
    memory = importlib.import_module("memory")
    MEM = memory.Memory()
except Exception:
    MEM = None

# --- small helpers
CFG_DIR = Path(os.getenv("APPDATA") or Path.home() / "AppData" / "Roaming") / "Zandalee"
CFG_DIR.mkdir(parents=True, exist_ok=True)
VOICE_CFG = CFG_DIR / "voice_config.json"

def _load_voice_cfg() -> dict:
    try:
        return json.loads(VOICE_CFG.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _save_voice_cfg(d: dict) -> None:
    try:
        VOICE_CFG.write_text(json.dumps(d, indent=2), encoding="utf-8")
    except Exception:
        pass

def _get_input_device_id() -> int | None:
    cfg = _load_voice_cfg()
    v = cfg.get("input_device_id")
    return int(v) if isinstance(v, int) or (isinstance(v, str) and v.isdigit()) else None

def _set_input_device_id(dev_id: int | None) -> None:
    cfg = _load_voice_cfg()
    if dev_id is None:
        cfg.pop("input_device_id", None)
    else:
        cfg["input_device_id"] = int(dev_id)
    _save_voice_cfg(cfg)

def _speak_via_client(text: str) -> bool:
    if not text:
        return True
    vc = APP_ROOT / "voice_client.py"
    if not vc.exists():
        return False
    try:
        subprocess.Popen(
            [sys.executable, str(vc), "--transport", "STDIO", "--speak", str(text)],
            cwd=str(APP_ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=False,
        )
        return True
    except Exception:
        return False

# ----- status model
@dataclass
class Status:
    online: bool = True
    project: str = os.getenv("ZANDALEE_ACTIVE_PROJECT") or "(none)"
    voice_name: str = "en_GB-southern_english_female-low"
    speech_enabled: bool = True
    listening: bool = False
    speaking: bool = False
    hotword: bool = bool(os.getenv("PORCUPINE_ACCESS_KEY"))
    vu_level: int = 0
    lat_stt: int = 0
    lat_llm: int = 0
    lat_tts: int = 0
    lat_total: int = 0
    input_device_id: int | None = _get_input_device_id()

STATUS = Status()

# ----- mic utils
def _list_mics() -> list[dict]:
    if _sd is None:
        return []
    try:
        devs = _sd.query_devices()
        out = []
        for i, d in enumerate(devs):
            if d.get("max_input_channels", 0) > 0:
                out.append({
                    "id": i,
                    "name": d.get("name", f"Device {i}"),
                    "sr": int(d.get("default_samplerate", 16000) or 16000),
                    "channels": int(d.get("max_input_channels", 1)),
                    "selected": (i == STATUS.input_device_id),
                })
        return out
    except Exception:
        return []

def _measure_mic(dev_id: int | None, seconds: float = 1.0) -> dict:
    if _sd is None or _np is None:
        return {"ok": False, "error": "sounddevice/numpy not available"}
    sr = 16000
    frames = max(256, int(sr * 0.02))
    peak = 0.0
    rms_acc = []
    def cb(indata, frames_, time_info, status):
        nonlocal peak, rms_acc
        try:
            x = _np.frombuffer(indata, dtype=_np.int16).astype(_np.float32) / 32768.0
            if x.size:
                peak = max(peak, float(_np.max(_np.abs(x))))
                rms_acc.append(float(_np.sqrt(_np.mean(x**2))))
        except Exception:
            pass
    kwargs = dict(samplerate=sr, channels=1, dtype="int16", blocksize=frames, callback=cb)
    if dev_id is not None:
        kwargs["device"] = dev_id
    try:
        with _sd.RawInputStream(**kwargs):
            t0 = time.perf_counter()
            while (time.perf_counter() - t0) < seconds:
                time.sleep(0.05)
    except Exception as e:
        return {"ok": False, "error": str(e)}
    if not rms_acc:
        return {"ok": False, "error": "no samples"}
    rms = float(sum(rms_acc) / len(rms_acc))
    return {"ok": True, "rms": rms, "peak": float(peak)}

def _wizard_pick() -> dict:
    """Sweep all input devices, pick the one with the highest peak."""
    devs = _list_mics()
    if not devs:
        return {"ok": False, "error": "no input devices"}
    best = None
    best_score = -1.0
    _speak_via_client("Starting microphone setup.")
    for d in devs:
        _speak_via_client(f"Testing {d['name']}. Please say: testing one two three.")
        time.sleep(0.6)
        m = _measure_mic(d["id"], seconds=1.1)
        if not m.get("ok"):
            continue
        score = float(m.get("peak", 0.0))
        if score > best_score:
            best_score = score
            best = (d, m)
        time.sleep(0.2)
    if not best:
        _speak_via_client("I could not detect a working microphone.")
        return {"ok": False, "error": "no usable mic"}
    d, m = best
    _set_input_device_id(d["id"])
    STATUS.input_device_id = d["id"]
    _speak_via_client(f"Selected {d['name']}.")
    return {"ok": True, "device": d, "metrics": m}

# ----- Bridge exposed to JS
class Bridge:
    # -- general
    def get_status(self) -> dict:
        try:
            d = dict(STATUS.__dict__)
            d["voice_available"] = True  # voice_client exists
            d["mics"] = _list_mics()
            return {"ok": True, "status": d}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def set_speech_enabled(self, enabled: bool) -> dict:
        STATUS.speech_enabled = bool(enabled)
        return {"ok": True, "speech_enabled": STATUS.speech_enabled}

    def speak(self, text: str) -> dict:
        if not STATUS.speech_enabled:
            return {"ok": False, "error": "speech disabled"}
        ok = _speak_via_client(text)
        return {"ok": bool(ok)}

    # -- memory shortcuts (optional)
    def mem_learn(self, text: str, kind: str = "semantic", tags: str = "", importance: float = 0.5, relevance: float = 0.5) -> dict:
        try:
            if not MEM:
                return {"ok": False, "error": "memory not available"}
            tags_list = [t.strip() for t in (tags or "").split(",") if t.strip()]
            rid = MEM.remember(text, kind=kind, tags=tags_list, importance=float(importance), relevance=float(relevance))
            return {"ok": True, "id": rid}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # -- mic controls
    def mic_list(self) -> dict:
        return {"ok": True, "devices": _list_mics()}

    def mic_use(self, device_id: int) -> dict:
        try:
            dev_id = int(device_id)
            _set_input_device_id(dev_id)
            STATUS.input_device_id = dev_id
            return {"ok": True, "selected": dev_id}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def mic_test(self, device_id: int | None = None) -> dict:
        dev_id = int(device_id) if device_id is not None else _get_input_device_id()
        m = _measure_mic(dev_id, seconds=1.0)
        return m if m.get("ok") else {"ok": False, "error": m.get("error", "test failed")}

    def mic_setup(self) -> dict:
        return _wizard_pick()

    # -- STT (best effort: optional google_speech_to_text)
    def stt_once(self, prompt: str = "") -> dict:
        try:
            gstt = importlib.import_module("google_speech_to_text")
        except Exception:
            return {"ok": False, "error": "google_speech_to_text.py not available"}
        kwargs = {}
        if STATUS.input_device_id is not None:
            kwargs["device_id"] = STATUS.input_device_id
        try:
            STATUS.listening = True
            t0 = time.perf_counter()
            text = None
            for fn in ("listen_once", "record_and_transcribe", "transcribe_request"):
                if hasattr(gstt, fn):
                    text = getattr(gstt, fn)(**kwargs) if kwargs else getattr(gstt, fn)()
                    break
            STATUS.listening = False
            STATUS.lat_stt = int((time.perf_counter() - t0) * 1000)
            return {"ok": True, "text": (text or "").strip()}
        except Exception as e:
            STATUS.listening = False
            return {"ok": False, "error": str(e)}

# ----- JS shim so the UI can call both window.api.* and legacy window.n_* names
JS_SHIM = r"""
window.api = window.pywebview?.api || window.api || {};
window.n_get_status   = () => window.api.get_status();
window.n_speakenabled = (v) => window.api.set_speech_enabled(!!v);
window.n_speak        = (t) => window.api.speak(String(t || ''));
window.n_miclist      = () => window.api.mic_list();
window.n_micuse       = (id) => window.api.mic_use(Number(id));
window.n_mictest      = (id) => window.api.mic_test(id);
window.n_micwizard    = () => window.api.mic_setup();

// optional: single-shot STT for quick “Say now…”
window.n_stt_once     = (prompt='') => window.api.stt_once(String(prompt || ''));
"""

def main():
    try:
        import webview
    except Exception:
        print("pywebview not installed. Run: pip install pywebview")
        return

    if not INDEX_HTML.exists():
        webview.create_window("Zandalee (UI missing)", url="about:blank", width=900, height=600)
        webview.start(debug=True)
        return

    url = INDEX_HTML.as_uri()
    win = webview.create_window(
        "Zandalee",
        url=url,
        width=1100,
        height=760,
        resizable=True,
        confirm_close=True,
        js_api=Bridge(),
    )

    # inject our JS shim when the page is loaded
    def _on_loaded():
        try:
            win.evaluate_js(JS_SHIM)
            # greet/status to confirm bridge is hot
            win.evaluate_js("console.log('Zandalee bridge ready:', Object.keys(window.api||{}));")
        except Exception:
            pass

    win.events.loaded += _on_loaded
    webview.start(debug=False, http_server=False)

if __name__ == "__main__":
    main()
