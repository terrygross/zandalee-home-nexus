# core_guard.py
# Hardened guard for zandalee_core_laws.json
# - Verifies JSON structure + invariants
# - Verifies sha256 against signed .sig file (preferred) or hardcoded fallback
# - Ensures file is locked/read-only
# - CLI helpers: --print-hash, --write-sig

import os
import sys
import json
import hashlib
import time
import stat

LAWS_PATH = "zandalee_core_laws.json"
SIG_PATH = "zandalee_core_laws.sig"

# Fallback only. Prefer signature file.
EXPECTED_SHA256_FALLBACK = "62b764ee97abdcbd60a0489413a08d66f8d5ba1735ddd63aad85d08af6f24089"

# Set to "1" only in dev to bypass hard failures (e.g., when iterating locally).
DEV_BYPASS_ENV = "ZANDALEE_DEV_BYPASS"

# ---- utils ----

def _die(msg, code=1):
    print(f"⛔ {msg}")
    if os.getenv(DEV_BYPASS_ENV) == "1":
        print("⚠️  DEV BYPASS ENABLED: not exiting due to env override.")
        return False
    sys.exit(code)

def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def _read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _is_readonly(path):
    try:
        mode = os.stat(path).st_mode
        # POSIX bit: if writable by owner -> not readonly
        # On Windows, RO attribute maps to write bit too.
        return not bool(mode & stat.S_IWRITE)
    except Exception:
        # If we can’t stat, fail closed
        return False

# ---- structure validations ----

def _validate_core_structure(doc):
    # Required top-level keys
    required_top = ["locked", "core_laws", "core_identity"]
    for k in required_top:
        if k not in doc:
            _die(f"Core law JSON missing required field '{k}'")

    if not isinstance(doc["locked"], bool) or not doc["locked"]:
        _die("Core law JSON must be locked: locked: true")

    # core_laws: list of immutable laws
    if not isinstance(doc["core_laws"], list) or not doc["core_laws"]:
        _die("core_laws must be a non-empty list")

    seen_ids = set()
    for i, law in enumerate(doc["core_laws"], start=1):
        if not isinstance(law, dict):
            _die(f"core_laws[{i}] must be an object")
        for k in ["id", "title", "text", "immutable"]:
            if k not in law:
                _die(f"core_laws[{i}] missing '{k}'")
        if not law["immutable"]:
            _die(f"core_laws[{i}] must have immutable: true")
        if law["id"] in seen_ids:
            _die(f"Duplicate law id '{law['id']}'")
        seen_ids.add(law["id"])

    # core_identity
    cid = doc["core_identity"]
    for k in ["agent_name", "agent_role", "personality", "version"]:
        if k not in cid:
            _die(f"core_identity missing '{k}'")

    # Minimal sanity checks
    if not isinstance(cid["agent_name"], str) or not cid["agent_name"].strip():
        _die("core_identity.agent_name must be a non-empty string")
    if not isinstance(cid["version"], str) or not cid["version"].count("."):
        _die("core_identity.version should look like semantic versioning (e.g., '1.3.0')")

def _verify_signature(path=LAWS_PATH, sig_path=SIG_PATH):
    if not os.path.exists(sig_path):
        print("ℹ️ No signature file found; falling back to hardcoded hash check.")
        return None  # signal to use fallback

    try:
        sig = _read_json(sig_path)
    except Exception as e:
        _die(f"Signature file is invalid JSON: {e}")

    required = ["sha256", "filesize", "locked", "created_utc", "signer"]
    for k in required:
        if k not in sig:
            _die(f"Signature missing '{k}'")

    if not sig["locked"]:
        _die("Signature file must be locked=true")

    # Compare size + hash
    actual_size = os.path.getsize(path)
    if actual_size != sig["filesize"]:
        _die(f"Signature filesize mismatch. Expected {sig['filesize']}, got {actual_size}")

    actual_hash = _sha256(path)
    if actual_hash != sig["sha256"]:
        _die(f"Signature sha256 mismatch.\nExpected: {sig['sha256']}\nActual:   {actual_hash}")

    print("✅ Signature verified.")
    return True

def _verify_fallback_hash(path=LAWS_PATH):
    actual_hash = _sha256(path)
    if actual_hash != EXPECTED_SHA256_FALLBACK:
        _die(f"Core law file hash mismatch!\nExpected: {EXPECTED_SHA256_FALLBACK}\nActual:   {actual_hash}")
    print("✅ Hardcoded hash verified (fallback).")
    return True

def verify_laws_file(path=LAWS_PATH, sig_path=SIG_PATH):
    if not os.path.exists(path):
        _die("Core law file not found.")

    # Must be read-only
    if not _is_readonly(path):
        _die(f"{path} must be read-only (locked at filesystem level).")

    # Structure first
    try:
        doc = _read_json(path)
    except Exception as e:
        _die(f"Error parsing core law JSON: {e}")
    _validate_core_structure(doc)

    # Signature preferred
    used_sig = _verify_signature(path, sig_path)
    if used_sig is None:
        _verify_fallback_hash(path)

    print("🔒 Core law file verified and locked.")
    return True

# ---- CLI helpers ----
def _print_hash(path=LAWS_PATH):
    if not os.path.exists(path):
        _die("Core law file not found.")
    print(_sha256(path))

def _write_sig(path=LAWS_PATH, sig_path=SIG_PATH, signer="Terry"):
    """
    Create/overwrite the .sig with the current file hash & size. Locks the sig.
    Use this ONLY after you intentionally update the core laws file.
    """
    if not os.path.exists(path):
        _die("Core law file not found.")
    h = _sha256(path)
    size = os.path.getsize(path)
    created = int(time.time())
    # Best-effort: read version from the laws file
    try:
        version = _read_json(path)["core_identity"]["version"]
    except Exception:
        version = "unknown"

    sig = {
        "sha256": h,
        "filesize": size,
        "locked": True,
        "created_utc": created,
        "signer": signer,
        "version": version,
        "note": "Do not edit. Regenerate via core_guard --write-sig after intentional law updates."
    }
    with open(sig_path, "w", encoding="utf-8") as f:
        json.dump(sig, f, indent=2)
    # Try to set read-only
    try:
        os.chmod(sig_path, stat.S_IREAD)
    except Exception:
        pass
    print(f"✅ Wrote signature to {sig_path}")

def main(argv):
    if len(argv) > 1:
        cmd = argv[1]
        if cmd == "--print-hash":
            _print_hash()
            return
        if cmd == "--write-sig":
            signer = argv[2] if len(argv) > 2 else "Terry"
            _write_sig(signer=signer)
            return
        _die(f"Unknown option: {cmd}\nUsage: core_guard.py [--print-hash | --write-sig [signer]]")

    verify_laws_file()

if __name__ == "__main__":
    main(sys.argv)
