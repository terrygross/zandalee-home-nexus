# memory_paths.py — single source of truth for memory locations
from __future__ import annotations
import os
from pathlib import Path
from dataclasses import dataclass

# Windows default: C:\Users\<user>\Documents\Zandalee\zandalee_memories
DEFAULT_ROOT = Path.home() / "Documents" / "Zandalee" / "zandalee_memories"

def _resolve_root() -> Path:
    # Prefer new var; fall back to legacy
    root = os.getenv("ZANDALEE_MEMORY_ROOT") or os.getenv("ZANDALEE_MEM_DIR")
    return Path(root) if root else DEFAULT_ROOT

@dataclass
class MemoryPaths:
    root: Path
    db: Path
    journal_dir: Path
    snapshots_dir: Path
    diary_file: Path
    working_log_file: Path
    core_memory_file: Path

def ensure_paths() -> MemoryPaths:
    root = _resolve_root()
    journal = root / "journal"
    snaps = root / "snapshots"
    diary = root / "diary.log"
    wlog = root / "working_log.json"
    core = root / "core_memory.json"

    root.mkdir(parents=True, exist_ok=True)
    journal.mkdir(parents=True, exist_ok=True)
    snaps.mkdir(parents=True, exist_ok=True)
    if not diary.exists(): diary.write_text("", encoding="utf-8")
    if not core.exists(): core.write_text('{"family":{},"laws":[],"skills":[],"events":[]}', encoding="utf-8")

    return MemoryPaths(
        root=root,
        db=root / "mem.db",
        journal_dir=journal,
        snapshots_dir=snaps,
        diary_file=diary,
        working_log_file=wlog,
        core_memory_file=core,
    )
