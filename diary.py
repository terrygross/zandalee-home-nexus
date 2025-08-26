# diary.py — personal + per-project diaries (encrypted)
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Iterable
from memory_paths import ensure_paths
from memory_crypto import write_encrypted, read_decrypted_text

def _ts() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def append_personal(entry: str):
    p = ensure_paths()
    text = read_decrypted_text(p.diary_file) if Path(p.diary_file).exists() else ""
    # Sparse timestamps: a single ISO + the line
    text += f"[{_ts()}] {entry.strip()}\n"
    write_encrypted(p.diary_file, text)

def read_personal(last: int = 20) -> list[str]:
    p = ensure_paths()
    text = read_decrypted_text(p.diary_file) if Path(p.diary_file).exists() else ""
    lines = [l for l in text.splitlines() if l.strip()]
    return lines[-last:] if last > 0 else lines

# --- Project diaries ---
def project_diary_path(project_dir: Path) -> Path:
    dfile = project_dir / "diary" / "diary.log"
    if not dfile.exists(): dfile.write_text("", encoding="utf-8")
    return dfile

def append_project(project_dir: Path, entry: str):
    dfile = project_diary_path(project_dir)
    text = read_decrypted_text(dfile) if dfile.exists() else ""
    text += f"[{_ts()}] {entry.strip()}\n"
    write_encrypted(dfile, text)

def read_project(project_dir: Path, last: int = 50) -> list[str]:
    dfile = project_diary_path(project_dir)
    text = read_decrypted_text(dfile) if dfile.exists() else ""
    lines = [l for l in text.splitlines() if l.strip()]
    return lines[-last:] if last > 0 else lines
