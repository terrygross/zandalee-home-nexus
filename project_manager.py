# project_manager.py
from __future__ import annotations
import os, re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict

DEFAULT_ROOT = Path.home() / "Documents" / "Zandalee" / "projects"

@dataclass
class ProjectInfo:
    name: str
    root: Path
    path: Path
    created: bool

def _sanitize(name: str) -> str:
    s = re.sub(r"[^\w\- ]+", "", name, flags=re.UNICODE).strip()
    s = re.sub(r"\s+", "_", s)
    return s[:64] if s else "untitled"

def get_projects_root() -> Path:
    base = Path(os.getenv("ZANDALEE_PROJECTS_DIR", str(DEFAULT_ROOT)))
    base.mkdir(parents=True, exist_ok=True)
    return base

def ensure_project(name: str) -> ProjectInfo:
    root = get_projects_root()
    safe = _sanitize(name)
    path = root / safe
    created = False
    if not path.exists():
        (path / "files").mkdir(parents=True, exist_ok=True)
        (path / "notes").mkdir(parents=True, exist_ok=True)
        (path / "diary").mkdir(parents=True, exist_ok=True)
        (path / "memory").mkdir(parents=True, exist_ok=True)
        (path / "diary" / "README.txt").write_text("Project diary entries (one line per event).\n", encoding="utf-8")
        created = True
    os.environ["ZANDALEE_ACTIVE_PROJECT"] = str(path)  # lightweight context handoff
    return ProjectInfo(name=safe, root=root, path=path, created=created)

def active_project_path() -> Optional[Path]:
    p = os.getenv("ZANDALEE_ACTIVE_PROJECT")
    return Path(p) if p else None

def list_projects() -> Dict[str, str]:
    root = get_projects_root()
    out = {}
    for d in sorted(root.glob("*")):
        if d.is_dir():
            out[d.name] = str(d)
    return out
