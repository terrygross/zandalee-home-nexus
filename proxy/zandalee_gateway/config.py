import os
import json
from pathlib import Path

# -------------------- Paths & Data Dirs --------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HOME = os.environ.get("ZANDALEE_HOME") or os.path.join(os.path.expanduser("~"), "Documents", "Zandalee")
os.makedirs(HOME, exist_ok=True)

DATA_DIR = os.path.join(HOME, "data")
DOCS_DIR = os.path.join(DATA_DIR, "docs")
MEM_PATH = os.path.join(DATA_DIR, "memories.jsonl")
DIARY_PATH = os.path.join(DATA_DIR, "diary.jsonl")
AUDIO_CFG_PATH = os.path.join(DATA_DIR, "audio.json")
PERMS_PATH = os.path.join(DATA_DIR, "approvals.jsonl")
CFG_PATH = os.path.join(BASE_DIR, "salad_config.json")
FAMILY_DIR = os.path.join(DATA_DIR, "family")
SHARED_DIR = os.path.join(DATA_DIR, "family", "_shared")
SHARED_DOCS_DIR = os.path.join(SHARED_DIR, "docs")
SHARED_CHAT_JSONL = os.path.join(SHARED_DIR, "shared_chat.jsonl")
AVATAR_DIR = os.path.join(DATA_DIR, "avatars")
SAFETY_LOG = os.path.join(DATA_DIR, "safety_audit.jsonl")
USERS_JSON = os.path.join(FAMILY_DIR, "users.json")
INVITES_JSON = os.path.join(FAMILY_DIR, "invites.json")
SESSIONS_JSON = os.path.join(FAMILY_DIR, "sessions.json")
AUDIT_ACK_JSON = os.path.join(DATA_DIR, "audit_ack.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(FAMILY_DIR, exist_ok=True)
os.makedirs(SHARED_DIR, exist_ok=True)
os.makedirs(SHARED_DOCS_DIR, exist_ok=True)
os.makedirs(AVATAR_DIR, exist_ok=True)

_config_cache = None

def load_cfg() -> dict:
    """Load and cache salad_config.json with defaults."""
    global _config_cache
    if _config_cache is None:
        try:
            with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
                _config_cache = json.load(f)
        except FileNotFoundError:
            _config_cache = {}
        except Exception as e:
            raise RuntimeError(f"Cannot read salad_config.json: {e}")

        _config_cache.setdefault("base", "")
        _config_cache.setdefault("apiKey", "")
        _config_cache.setdefault("model", "qwen2.5-coder:32b")
        _config_cache.setdefault("voiceBackend", "sapi")
        _config_cache.setdefault("voiceBase", "http://127.0.0.1:8759")
        _config_cache.setdefault("openInternet", True)
        _config_cache.setdefault("browser", "chrome")
        _config_cache.setdefault("browserFlags", ["--new-window"])
        _config_cache.setdefault("blockedSchemes", ["file", "ftp", "data", "javascript", "chrome", "about", "ms-settings"])
        _config_cache.setdefault("blockedExtensions", [".exe", ".msi", ".bat", ".cmd", ".ps1", ".vbs", ".scr"])
        _config_cache.setdefault("downloadMaxBytes", 20_000_000)
        _config_cache.setdefault("fetchMaxTextBytes", 2_000_000)
        _config_cache.setdefault("allowedMimePrefixes", ["text/", "application/json"])
        _config_cache.setdefault("userAgent", "Zandalee/1.0 (+local; family)")
        _config_cache.setdefault("blockedTLDs", ["zip", "mov", "country", "click", "gq", "tk", "ml", "cf"])
        _config_cache.setdefault("suspiciousKeywords", ["login", "verify", "gift", "free", "bonus", "crypto", "wallet", "bank"])
        _config_cache.setdefault("maxRedirects", 5)
        _config_cache.setdefault("quarantineDir", os.path.join(DOCS_DIR, "Quarantine"))
        _config_cache.setdefault("riskThresholdWarn", 40)
        _config_cache.setdefault("riskThresholdBlock", 75)
        _config_cache.setdefault("configLocked", False)
    return _config_cache

def save_cfg(patch: dict) -> dict:
    """Update and save salad_config.json, respecting lock."""
    global _config_cache
    cfg = load_cfg().copy()
    cleaned = {k: v for k, v in (patch or {}).items() if v is not None and (not isinstance(v, str) or v.strip())}
    
    if cfg.get("configLocked", False):
        if set(cleaned.keys()) == {"configLocked"} and cleaned["configLocked"] is False:
            cfg["configLocked"] = False
        else:
            raise RuntimeError("Config is locked. Set configLocked=false first to modify.")
    
    cfg.update(cleaned)
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    _config_cache = cfg
    return cfg

def cfg_get(key, default=None):
    """Get a config value with fallback."""
    try:
        return load_cfg().get(key, default)
    except Exception:
        return default