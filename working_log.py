# working_log.py — short-term operational history (encrypted ring buffer)
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict
from memory_paths import ensure_paths
from memory_crypto import write_encrypted, read_decrypted_text

MAX_ITEMS = 1000  # safe default, flushable

def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def _read() -> list[Dict[str, Any]]:
    p = ensure_paths()
    f = p.working_log_file
    if not Path(f).exists(): return []
    try:
        data = read_decrypted_text(f)
        return json.loads(data) if data.strip() else []
    except Exception:
        return []

def _write(items: list[Dict[str, Any]]):
    p = ensure_paths()
    write_encrypted(p.working_log_file, json.dumps(items, ensure_ascii=False, indent=2))

def append(event: str, extra: Dict[str, Any] | None = None):
    items = _read()
    items.append({"ts": _now(), "event": event, "data": extra or {}})
    if len(items) > MAX_ITEMS:
        items = items[-MAX_ITEMS:]
    _write(items)

def read_all() -> list[Dict[str, Any]]:
    return _read()

def clear():
    _write([])
