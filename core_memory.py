# core_memory.py — permanent family memory helpers (encrypted on disk via memory_crypto hooks upstream)
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict
from memory_paths import ensure_paths
from memory_crypto import write_encrypted, read_decrypted_text

SCHEMA = {"family": {}, "laws": [], "skills": [], "events": []}

def _path() -> Path:
    return ensure_paths().core_memory_file

def load() -> Dict[str, Any]:
    p = _path()
    try:
        text = read_decrypted_text(p)
        data = json.loads(text) if text.strip() else {}
    except Exception:
        data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, dict): data = {}
    # merge defaults
    out = {**SCHEMA, **data}
    return out

def save(data: Dict[str, Any]):
    # validate minimal shape
    for k in SCHEMA.keys():
        data.setdefault(k, SCHEMA[k])
    write_encrypted(_path(), json.dumps(data, ensure_ascii=False, indent=2))
