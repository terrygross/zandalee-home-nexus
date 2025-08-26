import os
import sys
import shutil
import hashlib
import json
import time
import difflib
from pathlib import Path
from datetime import datetime

# ---------- SETTINGS ----------
PROJECT_ROOT = Path(__file__).resolve().parent
LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "self_update.log"
CURRENT_VERSION_FILE = PROJECT_ROOT / "CURRENT_VERSION.txt"

# Do NOT allow changes to these without a separate, manual process.
PROTECTED_PATHS = [
    "zandalee_core_laws.json",
    "core_guard.py",
    "family_traits.json",
]

# Folders/files we never copy into a new version
EXCLUDE = {
    ".git", ".venv", "venv", "__pycache__", ".pytest_cache",
    "build", "dist", "logs", "screenshots", ".mypy_cache",
    "*.pyc", "*.pyo", "*.pyd", "*.spec"
}

# ---------- UTIL ----------
def log(msg: str):
    LOG_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def read_current_version() -> str:
    if CURRENT_VERSION_FILE.exists():
        return CURRENT_VERSION_FILE.read_text(encoding="utf-8").strip()
    # default to folder name that contains this file
    return PROJECT_ROOT.name

def write_current_version(folder_name: str):
    CURRENT_VERSION_FILE.write_text(folder_name + "\n", encoding="utf-8")
    log(f"Set CURRENT_VERSION -> {folder_name}")

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def should_exclude(path: Path) -> bool:
    p = path.name.lower()
    if any(p.endswith(suffix.lower().replace("*", "")) and suffix.startswith("*") for suffix in EXCLUDE if suffix.startswith("*")):
        return True
    parts = set(path.parts)
    if parts & set(EXCLUDE):
        return True
    return False

def walk_files(root: Path):
    for p in root.rglob("*"):
        if p.is_file() and not should_exclude(p.relative_to(root)):
            yield p

# ---------- INTEGRITY ----------
def build_integrity_manifest(root: Path) -> dict:
    manifest = {}
    for f in walk_files(root):
        rel = str(f.relative_to(root)).replace("\\", "/")
        manifest[rel] = sha256_file(f)
    return manifest

def verify_protected_unchanged(prev_root: Path, new_root: Path):
    for rel in PROTECTED_PATHS:
        a = prev_root / rel
        b = new_root / rel
        if not a.exists() or not b.exists():
            raise RuntimeError(f"Protected file missing in one of the trees: {rel}")
        ha, hb = sha256_file(a), sha256_file(b)
        if ha != hb:
            raise RuntimeError(f"PROTECTED VIOLATION: {rel} was modified.")

# ---------- DIFF ----------
def file_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""

def diff_trees(prev_root: Path, new_root: Path) -> str:
    prev_files = {str(p.relative_to(prev_root)).replace("\\", "/") for p in walk_files(prev_root)}
    new_files  = {str(p.relative_to(new_root)).replace("\\", "/") for p in walk_files(new_root)}
    added = sorted(new_files - prev_files)
    removed = sorted(prev_files - new_files)
    common = sorted(prev_files & new_files)

    lines = []
    if added:  lines.append("## Added files\n" + "\n".join(f"- {a}" for a in added) + "\n")
    if removed:lines.append("## Removed files\n" + "\n".join(f"- {r}" for r in removed) + "\n")

    # Show textual diffs for changed files (best effort)
    for rel in common:
        a = prev_root / rel
        b = new_root / rel
        if a.suffix.lower() not in (".py", ".json", ".md", ".txt", ".toml", ".yaml", ".yml"):
            continue
        if sha256_file(a) == sha256_file(b):
            continue
        da = file_text(a).splitlines(keepends=False)
        db = file_text(b).splitlines(keepends=False)
        diff = difflib.unified_diff(da, db, fromfile=f"a/{rel}", tofile=f"b/{rel}", lineterm="")
        lines.append("\n".join(diff) + "\n")
    return "\n\n".join(lines).strip() or "_No textual changes detected (hash-only)._"  # unlikely in first copy

# ---------- CORE ----------
def copy_tree(src: Path, dst: Path):
    if dst.exists():
        raise FileExistsError(f"Destination already exists: {dst}")
    log(f"Copying from {src} -> {dst}")
    dst.mkdir(parents=True)
    for f in walk_files(src):
        rel = f.relative_to(src)
        out = dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, out)
    log("Copy complete.")

def next_version_name(base: str | None = None) -> str:
    # Folder pattern: Zandalee_vX.Y
    base = base or PROJECT_ROOT.name
    # Find siblings that match pattern
    parent = PROJECT_ROOT.parent
    siblings = [p.name for p in parent.iterdir() if p.is_dir() and p.name.startswith("Zandalee_v")]
    if not siblings:
        return "Zandalee_v1.1"
    def ver_key(name):
        try:
            tag = name.split("_v", 1)[1]
            major, minor = tag.split(".")
            return (int(major), int(minor))
        except Exception:
            return (0, 0)
    latest = sorted(siblings, key=ver_key)[-1]
    lmj, lmn = ver_key(latest)
    return f"Zandalee_v{lmj}.{lmn+1}"

def propose_new_version(notes: str = "") -> Path:
    current_folder = read_current_version()
    prev_root = PROJECT_ROOT if PROJECT_ROOT.name == current_folder else PROJECT_ROOT
    new_name = next_version_name()
    new_root = PROJECT_ROOT.parent / new_name

    copy_tree(prev_root, new_root)

    # Integrity & manifests
    manifest = build_integrity_manifest(new_root)
    (new_root / "integrity_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Enforce protected files unchanged vs previous active version
    verify_protected_unchanged(prev_root, new_root)

    # Diff summary (vs previous)
    diff_summary = diff_trees(prev_root, new_root)
    proposal = [
        f"# Change Proposal for {new_name}",
        "",
        "## Summary",
        notes or "_(no notes provided)_",
        "",
        "## Guard Rails",
        "- ✅ Core laws & protected files unchanged",
        "- ✅ Full manifest & hashes written to integrity_manifest.json",
        "- ✅ Requires explicit approval before activation",
        "",
        "## Diff",
        diff_summary
    ]
    (new_root / "CHANGE_PROPOSAL.md").write_text("\n".join(proposal), encoding="utf-8")

    log(f"Proposed new version: {new_name}")
    log(f"Awaiting approval -> create {new_root / 'APPROVED.txt'} or call apply_version('{new_name}')")
    return new_root

def smoke_test(root: Path) -> bool:
    """
    Minimal sanity: try importing key modules from the proposed tree.
    This runs in a separate interpreter path using PYTHONPATH trick.
    """
    log("Running smoke test...")
    sep = ";" if os.name == "nt" else ":"
    env = os.environ.copy()
    env["PYTHONPATH"] = str(root) + (sep + env["PYTHONPATH"] if "PYTHONPATH" in env else "")
    # You can expand these as your project grows
    checks = [
        "import orchestrator; print('OK orchestrator')",
        "import tts_agent; print('OK tts_agent')",
    ]
    for code in checks:
        cmd = [sys.executable, "-c", code]
        try:
            import subprocess
            out = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=20)
            if out.returncode != 0:
                log(f"Smoke test failed: {out.stderr.strip()}")
                return False
        except Exception as e:
            log(f"Smoke test error: {e}")
            return False
    log("Smoke test PASSED.")
    return True

def apply_version(folder_name: str):
    new_root = PROJECT_ROOT.parent / folder_name
    if not new_root.exists():
        raise FileNotFoundError(f"Version folder not found: {folder_name}")

    # Require APPROVED.txt (or override with env)
    approved = new_root / "APPROVED.txt"
    if not approved.exists() and not os.environ.get("ZANDALEE_FORCE_APPLY", ""):
        raise PermissionError(f"Approval gate: create {approved} to proceed (or set ZANDALEE_FORCE_APPLY=1).")

    # Basic integrity re-check at switch time
    current = read_current_version()
    prev_root = PROJECT_ROOT.parent / current if (PROJECT_ROOT.parent / current).exists() else PROJECT_ROOT
    verify_protected_unchanged(prev_root, new_root)

    # Optional smoke test again
    if not smoke_test(new_root):
        raise RuntimeError("Smoke test failed; refusing to switch.")

    write_current_version(folder_name)
    log(f"APPLIED version -> {folder_name}")

# ---------- CLI ----------
def main():
    import argparse
    p = argparse.ArgumentParser(description="Zandalee Self-Replicator with Guard Rails")
    sub = p.add_subparsers(dest="cmd")

    sp = sub.add_parser("propose", help="Prepare a new version folder")
    sp.add_argument("--notes", default="", help="Short notes for CHANGE_PROPOSAL.md")

    sa = sub.add_parser("apply", help="Switch CURRENT_VERSION to a proposed folder")
    sa.add_argument("folder", help="Folder name, e.g., Zandalee_v1.4")

    sub.add_parser("current", help="Show current version")
    args = p.parse_args()

    if args.cmd == "propose":
        new_root = propose_new_version(notes=args.notes)
        print(f"\nProposed: {new_root.name}\n- Review {new_root/'CHANGE_PROPOSAL.md'}\n- Then create {new_root/'APPROVED.txt'}\n- Finally run: python self_replicator.py apply {new_root.name}\n")
    elif args.cmd == "apply":
        apply_version(args.folder)
        print(f"Switched to: {args.folder}")
    else:
        print("Current:", read_current_version())

if __name__ == "__main__":
    main()
