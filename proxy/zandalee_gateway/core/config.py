import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # ..\..\proxy\
CFG_PATH = BASE_DIR / "salad_config.json"

def load_cfg() -> dict:
    try:
        with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        cfg = {}

    # defaults
    cfg.setdefault("base", "")
    cfg.setdefault("apiKey", "")
    cfg.setdefault("model", "qwen2.5-coder:32b")
    cfg.setdefault("configLocked", False)
    cfg.setdefault("voiceBackend", "sapi")
    cfg.setdefault("voiceBase", "http://127.0.0.1:8759")
    cfg.setdefault("openInternet", True)
    return cfg

def save_cfg(patch: dict) -> dict:
    try:
        with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
            cfg = json.load(f)
    except Exception:
        cfg = {}

    if cfg.get("configLocked", False):
        # only allow unlocking flip while locked
        if patch.get("configLocked") is False:
            cfg["configLocked"] = False
        else:
            raise RuntimeError("Config is locked. Set configLocked=false first to modify.")
    else:
        for k, v in (patch or {}).items():
            if v is None:
                continue
            if isinstance(v, str) and not v.strip():
                continue
            cfg[k] = v

    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg

def cfg_get(key, default=None):
    try:
        return load_cfg().get(key, default)
    except Exception:
        return default
