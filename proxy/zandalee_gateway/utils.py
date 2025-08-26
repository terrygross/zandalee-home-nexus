import json
import os
import re
import html
import subprocess
from typing import List, Optional
from urllib.parse import urlparse
from .config import cfg_get

# -------------------- Helpers --------------------

def ps_run(code: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    """Run a PowerShell command with captured output."""
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", code],
        input=stdin or "",
        capture_output=True,
        text=True,
    )

def jsonl_append(path: str, obj: dict):
    """Append a JSON object to a JSONL file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def jsonl_read_all(path: str) -> List[dict]:
    """Read all valid JSONL records from a file."""
    if not os.path.exists(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            try:
                out.append(json.loads(s))
            except Exception:
                continue
    return out

def _json_read(path: str, default=None):
    """Read a JSON file with fallback."""
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception:
        return default if default is not None else {}

def _json_write(path: str, obj):
    """Write a JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

SAFE_SCHEMES = {"http", "https"}

def is_blocked_scheme(scheme: str) -> bool:
    """Check if a URL scheme is blocked."""
    blocked = set(cfg_get("blockedSchemes", []) or [])
    return scheme.lower() in blocked

def normalize_and_check_url(raw: str) -> str:
    """Normalize and validate a URL."""
    u = (raw or "").strip()
    if not u:
        raise ValueError("Empty URL.")
    p = urlparse(u)
    if not p.scheme:
        u = "http://" + u
        p = urlparse(u)
    if p.scheme.lower() not in SAFE_SCHEMES or is_blocked_scheme(p.scheme):
        raise ValueError(f"Blocked or unsupported scheme: {p.scheme}")
    if not p.netloc:
        raise ValueError("URL missing host.")
    return u

def dangerous_ext(path: str) -> bool:
    """Check if a file extension is blocked."""
    blocked = set(cfg_get("blockedExtensions", []) or [])
    _, ext = os.path.splitext((path or "").lower())
    return ext in blocked

def ua_headers():
    """Get User-Agent headers for HTTP requests."""
    return {"User-Agent": cfg_get("userAgent", "Zandalee/1.0")}

_Q_START = re.compile(r'^\s*(what|why|how|who|where|when|which|can|should|could|please|tell|explain|define|write|generate|give|show)\b', re.I)
_TS_LINE = re.compile(r'^\s*\d{1,2}:\d{2}(:\d{2})?\s*$')
_LABELS = re.compile(r'^\s*(chat|voice|tts|mic|on|off|settings|gateway)\s*$', re.I)

def extract_prompt(raw: str) -> str:
    """Extract the best user question/command from messy UI text."""
    if not raw:
        return ""
    lines = [ln.strip() for ln in str(raw).splitlines() if ln.strip()]
    lines = [ln for ln in lines if not _TS_LINE.match(ln) and not _LABELS.match(ln)]
    for ln in reversed(lines):
        m = re.search(r'I received your message:\s*(.+)', ln, flags=re.I | re.S)
        if m:
            tail = m.group(1).strip()
            q = re.findall(r'["“](.*?)["”]', tail, flags=re.S)
            if q and q[-1].strip():
                return q[-1].strip()
            return re.split(r'[\r\n]+', tail, 1)[0].strip().strip('"“”')
    for ln in reversed(lines):
        if len(ln) <= 220 and (_Q_START.search(ln) or '?' in ln):
            return ln
    for ln in reversed(lines):
        if len(ln) <= 220:
            return ln
    return re.sub(r'^\s*(message|text|content)\s*:\s*', '', raw, flags=re.I).strip()[:220]

def clean_for_tts(text: str, remove_urls: bool = True, max_length: int = 320) -> str:
    """Clean text for TTS, removing code, HTML, and optionally URLs."""
    if not text:
        return ""
    s = html.unescape(str(text))
    s = re.sub(r"```.*?```", "", s, flags=re.S)
    s = re.sub(r"`([^`]*)`", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    if remove_urls:
        s = re.sub(r"https?://\S+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    m = re.match(r"(.{1,300}?[\.!\?])(\s|$)", s)
    if m:
        s = m.group(1).strip()
    if len(s) > max_length:
        s = s[:max_length - 3].rstrip() + "…"
    return s

def extract_model_text(resp) -> str:
    """Extract assistant text from API responses."""
    if not resp:
        return ""
    if isinstance(resp, str):
        return resp.strip()
    if isinstance(resp, dict):
        v = (
            resp.get("message", {}).get("content") or
            (resp.get("choices") or [{}])[0].get("message", {}).get("content") or
            resp.get("output_text") or
            resp.get("content") or
            resp.get("response") or
            resp.get("text") or
            ""
        )
        return str(v).strip()
    return ""