# ollama_proxy.py — Zandalee Gateway
# - Proxies Ollama (Salad) /api/*
# - SAPI voice (/local/voices, /local/speak)
# - Memories (JSONL), Diary (JSONL)
# - Uploads (/local/upload) + Docs listing (/local/docs)
# - Mic Wizard (stub) endpoints
# - PC control (/local/keys, /local/mouse, /local/app) with permissions + anti-spam
# - Family Approval System (/permissions/*)
# - Internet guardrails: /local/open-url, /net/fetch, /net/download with risk scoring + quarantine
# - Safety audit trail + /safety/check
# - WebSocket at /ws (heartbeats + permission events)
# - Serves UI at /app (and mounts /assets), clean fallback at /
# - Reads salad_config.json with UTF-8-SIG (tolerates BOM)
# - UI path can be overridden with ZANDALEE_UI_DIR
# - Single-click UX: EXE auto-starts server and opens the UI

import os
import sys
import json
import uuid
import asyncio
import subprocess
import datetime as _dt
from typing import Optional, List
from pathlib import Path
from urllib.parse import urlparse
from zandalee_gateway.routers.api_proxy import router as api_router


import httpx
from fastapi import FastAPI, Request, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import (
    JSONResponse, PlainTextResponse, HTMLResponse, RedirectResponse
)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# -------------------- Paths & Data Dirs --------------------

BASE_DIR = os.path.dirname(__file__)
HOME = os.environ.get("ZANDALEE_HOME") or os.path.join(os.path.expanduser("~"), "Documents", "Zandalee")
os.makedirs(HOME, exist_ok=True)

DATA_DIR = os.path.join(HOME, "data")
DOCS_DIR = os.path.join(DATA_DIR, "docs")
MEM_PATH = os.path.join(DATA_DIR, "memories.jsonl")
DIARY_PATH = os.path.join(DATA_DIR, "diary.jsonl")
AUDIO_CFG_PATH = os.path.join(DATA_DIR, "audio.json")
PERMS_PATH = os.path.join(DATA_DIR, "approvals.jsonl")
CFG_PATH = os.path.join(BASE_DIR, "salad_config.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)

# -------------------- Helpers --------------------

def load_cfg() -> dict:
    cfg = {}
    try:
        with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        cfg = {}
    except Exception as e:
        raise RuntimeError(f"Cannot read salad_config.json: {e}")

    # Core defaults
    cfg.setdefault("base", "")
    cfg.setdefault("apiKey", "")
    cfg.setdefault("model", "qwen2.5-coder:32b")
    cfg.setdefault("voiceBackend", "sapi")
    cfg.setdefault("voiceBase", "http://127.0.0.1:8759")

    # Internet + guardrail defaults
    cfg.setdefault("openInternet", True)
    cfg.setdefault("browser", "chrome")  # or "msedge"
    cfg.setdefault("browserFlags", ["--new-window"])
    cfg.setdefault("blockedSchemes", ["file", "ftp", "data", "javascript", "chrome", "about", "ms-settings"])
    cfg.setdefault("blockedExtensions", [".exe", ".msi", ".bat", ".cmd", ".ps1", ".vbs", ".scr"])
    cfg.setdefault("downloadMaxBytes", 20_000_000)   # 20 MB
    cfg.setdefault("fetchMaxTextBytes", 2_000_000)   # 2 MB
    cfg.setdefault("allowedMimePrefixes", ["text/", "application/json"])
    cfg.setdefault("userAgent", "Zandalee/1.0 (+local; family)")

    # Safety net defaults
    cfg.setdefault("blockedTLDs", ["zip", "mov", "country", "click", "gq", "tk", "ml", "cf"])
    cfg.setdefault("suspiciousKeywords", ["login", "verify", "gift", "free", "bonus", "crypto", "wallet", "bank"])
    cfg.setdefault("maxRedirects", 5)
    cfg.setdefault("quarantineDir", os.path.join(DOCS_DIR, "Quarantine"))
    cfg.setdefault("riskThresholdWarn", 40)   # ask non-admins to confirm
    cfg.setdefault("riskThresholdBlock", 75)  # block everyone
    cfg.setdefault("configLocked", False)     # when True: POST /config rejects changes
    return cfg

def save_cfg(patch: dict) -> dict:
    cfg = {}
    try:
        if os.path.exists(CFG_PATH):
            with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
    except Exception:
        cfg = {}

    # Ignore None / empty-string updates
    cleaned = {}
    for k, v in (patch or {}).items():
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        cleaned[k] = v

    # Respect lock
    if cfg.get("configLocked", False):
        # Only allow unlocking explicitly
        if set(cleaned.keys()) == {"configLocked"} and cleaned["configLocked"] is False:
            cfg["configLocked"] = False
        else:
            raise RuntimeError("Config is locked. Set configLocked=false first to modify.")

    cfg.update(cleaned)
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg

def _cfg_get(key, default=None):
    try:
        return load_cfg().get(key, default)
    except Exception:
        return default

def ps_run(code: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", code],
        input=stdin or "",
        capture_output=True,
        text=True,
    )

def _jsonl_append(path: str, obj: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def _jsonl_read_all(path: str) -> List[dict]:
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

SAFE_SCHEMES = {"http", "https"}

def _is_blocked_scheme(scheme: str) -> bool:
    blocked = set((_cfg_get("blockedSchemes", []) or []))
    return scheme.lower() in blocked

def _normalize_and_check_url(raw: str) -> str:
    u = (raw or "").strip()
    if not u:
        raise ValueError("Empty URL.")
    p = urlparse(u)
    if not p.scheme:
        u = "http://" + u
        p = urlparse(u)
    if p.scheme.lower() not in SAFE_SCHEMES or _is_blocked_scheme(p.scheme):
        raise ValueError(f"Blocked or unsupported scheme: {p.scheme}")
    if not p.netloc:
        raise ValueError("URL missing host.")
    return u

def _dangerous_ext(path: str) -> bool:
    blocked = set((_cfg_get("blockedExtensions", []) or []))
    _, ext = os.path.splitext((path or "").lower())
    return ext in blocked

def _ua_headers():
    return {"User-Agent": _cfg_get("userAgent", "Zandalee/1.0")}

# === Auth & Family – storage paths (under HOME/data/family) ===
import secrets, hashlib, hmac, time
from fastapi import HTTPException

FAMILY_DIR = os.path.join(DATA_DIR, "family")
os.makedirs(FAMILY_DIR, exist_ok=True)

USERS_JSON    = os.path.join(FAMILY_DIR, "users.json")
INVITES_JSON  = os.path.join(FAMILY_DIR, "invites.json")
SESSIONS_JSON = os.path.join(FAMILY_DIR, "sessions.json")
AUDIT_ACK_JSON = os.path.join(DATA_DIR, "audit_ack.json")  # seen flags for superadmin audit

def _json_read(path: str, default):
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default

def _json_write(path: str, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)

def _now_s() -> int:
    return int(time.time())

def _hash_pw(password: str, salt: str | None = None) -> dict:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000, dklen=32)
    return {"salt": salt, "hash": dk.hex()}

def _verify_pw(password: str, rec: dict) -> bool:
    salt = rec.get("salt", "")
    expected = rec.get("hash", "")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000, dklen=32).hex()
    return hmac.compare_digest(dk, expected)

def _new_token() -> str:
    return secrets.token_urlsafe(32)

def _require_role_auth_header(authorization: str, roles=("admin","superadmin")) -> dict:
    token = (authorization or "").replace("Bearer ","").strip()
    sessions = _json_read(SESSIONS_JSON, {})
    sess = sessions.get(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    users = _json_read(USERS_JSON, {})
    user = users.get(sess.get("user_id",""))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("role") not in roles:
        raise HTTPException(status_code=403, detail="Insufficient role")
    return user

# Ensure JSON stores exist
for pth in (USERS_JSON, INVITES_JSON, SESSIONS_JSON, AUDIT_ACK_JSON):
    if not os.path.exists(pth):
        _json_write(pth, {} if pth.endswith(".json") else {})

# Bootstrap a default superadmin if users db is empty
_users = _json_read(USERS_JSON, {})
if not _users:
    uid = "u_0001"
    _users[uid] = {
        "id": uid,
        "email": "superadmin@local",
        "name": "Super Admin",
        "family": "Zandalee",
        "role": "superadmin",
        "pw": _hash_pw("admin"),
        "created_s": _now_s(),
        "home_dir": os.path.join(FAMILY_DIR, "SuperAdmin")
    }
    _json_write(USERS_JSON, _users)


# -------------------- FastAPI App --------------------

app = FastAPI(title="Zandalee Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Routers (mount) --------------------

from zandalee_gateway.routers.api_proxy import router as api_router
app.include_router(api_router)


# -------------------- Legacy UI Shims (voices/speak) --------------------

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse

@app.get("/voices")
async def legacy_voices():
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get("http://127.0.0.1:11500/local/voices")
        data = r.json() if r.headers.get("content-type","").lower().startswith("application/json") else {}
    except Exception:
        data = {}
    voices = data.get("voices") if isinstance(data, dict) else []
    if isinstance(data, list): voices = data
    return {"voices": voices}

@app.post("/speak")
async def legacy_speak(req: Request):
    try:
        data = await req.json()
    except Exception:
        data = {}
    text = (data.get("text") or data.get("message") or data.get("content") or "").strip()
    if not text:
        return JSONResponse({"error":"text required"}, status_code=400)
    try:
        async with httpx.AsyncClient(timeout=None) as c:
            r = await c.post("http://127.0.0.1:11500/local/speak", json={"text": text})
        ok = 200 <= r.status_code < 300
        return {"ok": ok}
    except Exception as e:
        return JSONResponse({"ok": False, "error": f"speak failed: {e}"}, status_code=502)

# -------------------- Permissions, Safety & Anti-Spam --------------------
from collections import deque
import time as _time
import re
from urllib.parse import urlparse as _urlparse

# Roles via header (UI should send X-Role: super_admin|admin|member)
ADMIN_ROLES = {"superadmin", "super_admin", "admin"}
def _get_role_from_headers(req: Request) -> str:
    role = (req.headers.get("X-Role") or "").strip().lower()
    return role or "member"

# Allowlist for coarse permission checks
ALLOWLIST = {
    "notepad", "calc", "explorer", "vscode",
    "cmd", "powershell",
    "internet", "github", "lovable",
    "firebase", "fireconsole", "cloudflare",
    "neon console", "godaddy", "chatgpt", "groq", "gemini",
    "keyboard", "mouse"
}

def _is_malicious(command: str) -> bool:
    bad_words = [
        "format", "shutdown", "rm -rf", "del /s", "erase", "kill process",
        "taskkill", "disable firewall", "disable antivirus", "system32",
        "registry delete", "wipe", "overclock", "forkbomb"
    ]
    cmd_lower = (command or "").lower()
    return any(word in cmd_lower for word in bad_words)

def _check_permission(command: str) -> dict:
    cmd = (command or "").lower().strip()
    if _is_malicious(cmd):
        return {"allowed": False, "command": cmd, "reason": "malicious attempt detected"}
    if cmd in ALLOWLIST:
        return {"allowed": True, "command": cmd}
    if (cmd.startswith("c:\\") or cmd.startswith("/") or "\\" in cmd):
        return {"allowed": True, "command": cmd}
    return {"allowed": False, "command": cmd, "reason": "Not in allowlist"}

@app.post("/permissions/execute")
async def permissions_execute(req: Request):
    data = await req.json()
    return _check_permission(data.get("command", ""))

# Anti-spam token buckets for keys/mouse
class _RateLimiter:
    def __init__(self, max_events: int, per_seconds: float):
        self.max = max_events
        self.per = per_seconds
        self.events = deque()
    def allow(self, n: int = 1) -> bool:
        now = _time.monotonic()
        while self.events and now - self.events[0] > self.per:
            self.events.popleft()
        if len(self.events) + n > self.max:
            return False
        for _ in range(n):
            self.events.append(now)
        return True

KEYS_MAX_PER_CALL   = 50
KEYS_RATE_MAX       = 30
KEYS_RATE_WINDOW_S  = 2.0

MOUSE_MAX_PER_CALL  = 50
MOUSE_RATE_MAX      = 30
MOUSE_RATE_WINDOW_S = 2.0

_KEYS_RL  = _RateLimiter(KEYS_RATE_MAX,  KEYS_RATE_WINDOW_S)
_MOUSE_RL = _RateLimiter(MOUSE_RATE_MAX, MOUSE_RATE_WINDOW_S)

# -------------------- /users/register & /auth/ --------------------

from fastapi import Header

@app.post("/users/register")
async def users_register(req: Request):
    data = await req.json()
    email   = (data.get("email") or "").strip().lower()
    password= data.get("password") or ""
    name    = (data.get("name") or "").strip()
    family  = (data.get("family") or "").strip()
    role    = (data.get("role") or "member").strip()
    if not (email and password and name and family):
        return JSONResponse({"error": "missing fields"}, status_code=400)

    users = _json_read(USERS_JSON, {})
    if any(u.get("email")==email for u in users.values()):
        return JSONResponse({"error": "email exists"}, status_code=409)

    uid = f"u_{secrets.token_hex(6)}"
    users[uid] = {
        "id": uid, "email": email, "name": name, "family": family, "role": role,
        "pw": _hash_pw(password), "created_s": _now_s(),
        "home_dir": os.path.join(FAMILY_DIR, family, name.replace(" ","_"))
    }
    _json_write(USERS_JSON, users)
    return {"ok": True, "user": {"id": uid, "email": email, "name": name, "family": family, "role": role}}

@app.post("/auth/login")
async def auth_login(req: Request):
    data = await req.json()
    email = (data.get("email") or "").strip().lower()
    pw    = data.get("password") or ""
    users = _json_read(USERS_JSON, {})
    user = next((u for u in users.values() if u.get("email")==email), None)
    if not user or not _verify_pw(pw, user.get("pw", {})):
        return JSONResponse({"error": "invalid credentials"}, status_code=401)
    token = _new_token()
    sessions = _json_read(SESSIONS_JSON, {})
    sessions[token] = {"user_id": user["id"], "issued_s": _now_s()}
    _json_write(SESSIONS_JSON, sessions)
    return {"ok": True, "token": token, "user": {"id": user["id"], "role": user["role"], "name": user["name"], "family": user["family"]}}

@app.get("/auth/invites")
async def auth_invites(authorization: str = Header(default="")):
    _require_role_auth_header(authorization, roles=("admin","superadmin"))
    invites = _json_read(INVITES_JSON, {})
    return {"ok": True, "invites": list(invites.values())}

@app.post("/auth/invite")
async def auth_invite(req: Request, authorization: str = Header(default="")):
    admin = _require_role_auth_header(authorization, roles=("admin","superadmin"))
    data = await req.json()
    email = (data.get("email") or "").strip().lower()
    role  = (data.get("role") or "member").strip()
    family= (data.get("family") or admin.get("family") or "Zandalee").strip()
    if not email:
        return JSONResponse({"error": "email required"}, status_code=400)
    code = secrets.token_urlsafe(12)
    invites = _json_read(INVITES_JSON, {})
    rec = {"code": code, "email": email, "role": role, "family": family, "created_s": _now_s(), "created_by": admin["email"]}
    invites[code] = rec
    _json_write(INVITES_JSON, invites)
    return {"ok": True, "invite": rec, "link": f"zandalee://invite/{code}"}

@app.post("/auth/revoke-invite")
async def auth_revoke_invite(req: Request, authorization: str = Header(default="")):
    _require_role_auth_header(authorization, roles=("admin","superadmin"))
    data = await req.json()
    code = (data.get("code") or "").strip()
    invites = _json_read(INVITES_JSON, {})
    if code in invites:
        del invites[code]
        _json_write(INVITES_JSON, invites)
        return {"ok": True}
    return JSONResponse({"error": "invite not found"}, status_code=404)

@app.post("/auth/accept-invite")
async def auth_accept_invite(req: Request):
    data = await req.json()
    code  = (data.get("code") or "").strip()
    email = (data.get("email") or "").strip().lower()
    pw    = data.get("password") or ""
    name  = (data.get("name") or "").strip()
    invites = _json_read(INVITES_JSON, {})
    inv = invites.get(code)
    if not inv or inv.get("email") != email:
        return JSONResponse({"error": "invalid invite"}, status_code=400)

    users = _json_read(USERS_JSON, {})
    if any(u.get("email")==email for u in users.values()):
        return JSONResponse({"error": "email exists"}, status_code=409)

    uid = f"u_{secrets.token_hex(6)}"
    users[uid] = {
        "id": uid, "email": email, "name": name,
        "family": inv["family"], "role": inv["role"],
        "pw": _hash_pw(pw), "created_s": _now_s(),
        "home_dir": os.path.join(FAMILY_DIR, inv["family"], name.replace(" ","_"))
    }
    _json_write(USERS_JSON, users)
    del invites[code]
    _json_write(INVITES_JSON, invites)
    return {"ok": True, "user": {"id": uid, "email": email, "name": name, "family": inv["family"], "role": inv["role"]}}

@app.get("/auth/family/members")
async def auth_family_members(authorization: str = Header(default="")):
    admin = _require_role_auth_header(authorization, roles=("admin","superadmin"))
    users = _json_read(USERS_JSON, {})
    members = [u for u in users.values() if u.get("family")==admin.get("family")]
    return {"ok": True, "members": [{"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"]} for u in members]}

@app.post("/auth/update-role")
async def auth_update_role(req: Request, authorization: str = Header(default="")):
    _ = _require_role_auth_header(authorization, roles=("admin","superadmin"))
    data = await req.json()
    user_id = data.get("userId")
    new_role = (data.get("role") or "").strip()
    if not (user_id and new_role):
        return JSONResponse({"error": "missing fields"}, status_code=400)
    users = _json_read(USERS_JSON, {})
    user = users.get(user_id)
    if not user:
        return JSONResponse({"error": "user not found"}, status_code=404)
    if user.get("email") == "superadmin@local" and new_role != "superadmin":
        return JSONResponse({"error": "cannot downgrade superadmin"}, status_code=403)
    user["role"] = new_role
    _json_write(USERS_JSON, users)
    return {"ok": True, "user": {"id": user_id, "role": new_role}}

@app.post("/auth/reset-password")
async def auth_reset_password(req: Request, authorization: str = Header(default="")):
    _ = _require_role_auth_header(authorization, roles=("admin","superadmin"))
    data = await req.json()
    user_id = data.get("userId")
    new_pw  = data.get("newPassword")
    if not (user_id and new_pw):
        return JSONResponse({"error": "missing fields"}, status_code=400)
    users = _json_read(USERS_JSON, {})
    user = users.get(user_id)
    if not user:
        return JSONResponse({"error": "user not found"}, status_code=404)
    user["pw"] = _hash_pw(new_pw)
    _json_write(USERS_JSON, users)
    return {"ok": True}

@app.post("/auth/remove-user")
async def auth_remove_user(req: Request, authorization: str = Header(default="")):
    admin = _require_role_auth_header(authorization, roles=("admin","superadmin"))
    data = await req.json()
    user_id = data.get("userId")
    users = _json_read(USERS_JSON, {})
    user = users.get(user_id)
    if not user:
        return JSONResponse({"error": "user not found"}, status_code=404)
    if user.get("email") == "superadmin@local":
        return JSONResponse({"error": "cannot remove superadmin"}, status_code=403)
    if user.get("family") != admin.get("family"):
        return JSONResponse({"error": "different family"}, status_code=403)
    del users[user_id]
    _json_write(USERS_JSON, users)
    return {"ok": True}



# -------------------- Family Approval System --------------------

clients: List[WebSocket] = []

async def _ws_broadcast(msg: dict):
    dead = []
    for ws in clients:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for d in dead:
        try:
            clients.remove(d)
        except ValueError:
            pass

def _perm_read_all():
    return _jsonl_read_all(PERMS_PATH)

def _perm_new(kind: str, payload: dict, requester: Optional[str] = None) -> dict:
    rec = {
        "id": str(uuid.uuid4()),
        "kind": kind,  # "app" | "url"
        "payload": payload or {},
        "requester": requester or "zandalee",
        "status": "pending",
        "created_at": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "resolved_at": None,
        "approver": None,
        "decision_note": None,
    }
    _jsonl_append(PERMS_PATH, rec)
    asyncio.create_task(_ws_broadcast({"type": "permission", "event": "created", "record": rec}))
    return rec

def _perm_update(id_: str, status: str, approver: str, note: Optional[str] = None) -> Optional[dict]:
    items = _perm_read_all()
    updated = None
    with open(PERMS_PATH, "w", encoding="utf-8") as f:
        for it in items:
            if it.get("id") == id_ and it.get("status") == "pending":
                it["status"] = status
                it["approver"] = approver
                it["decision_note"] = note
                it["resolved_at"] = _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                updated = it
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    if updated:
        asyncio.create_task(_ws_broadcast({"type": "permission", "event": "updated", "record": updated}))
    return updated

@app.post("/permissions/request")
async def perm_request(req: Request):
    data = await req.json()
    kind = (data.get("kind") or "").lower()
    if kind not in ("app", "url"):
        return JSONResponse({"error": "kind must be 'app' or 'url'."}, status_code=400)
    payload = data.get("payload") or {}
    requester = data.get("requester") or "zandalee"
    rec = _perm_new(kind, payload, requester)
    return {"ok": True, "request": rec}

@app.get("/permissions/pending")
async def perm_pending():
    out = [x for x in _perm_read_all() if x.get("status") == "pending"]
    return {"ok": True, "pending": out}

@app.post("/permissions/approve")
async def perm_approve(req: Request):
    data = await req.json()
    id_ = data.get("id")
    approver = data.get("approver") or "unknown"
    note = data.get("note")
    if not id_:
        return JSONResponse({"error": "missing id"}, status_code=400)
    upd = _perm_update(id_, "approved", approver, note)
    if not upd:
        return JSONResponse({"error": "not_found_or_not_pending"}, status_code=404)
    return {"ok": True, "request": upd}

@app.post("/permissions/deny")
async def perm_deny(req: Request):
    data = await req.json()
    id_ = data.get("id")
    approver = data.get("approver") or "unknown"
    note = data.get("note")
    if not id_:
        return JSONResponse({"error": "missing id"}, status_code=400)
    upd = _perm_update(id_, "denied", approver, note)
    if not upd:
        return JSONResponse({"error": "not_found_or_not_pending"}, status_code=404)
    return {"ok": True, "request": upd}

# -------------------- Safety: URL Risk Scoring & Audit --------------------

SAFETY_LOG = os.path.join(DATA_DIR, "safety_audit.jsonl")
os.makedirs(_cfg_get("quarantineDir", os.path.join(DOCS_DIR, "Quarantine")), exist_ok=True)

def _audit_safety(event: str, detail: dict):
    rec = {
        "id": str(uuid.uuid4()),
        "ts": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": event,
        "detail": detail or {},
    }
    _jsonl_append(SAFETY_LOG, rec)

def _punycode(label: str) -> str:
    # Use stdlib codec; no external idna dependency needed
    try:
        return label.encode("idna").decode("ascii")
    except Exception:
        return label

def _looks_suspicious_host(host: str, blocked_tlds: List[str]) -> int:
    score = 0
    h = (host or "").lower().strip().strip(".")
    if not h:
        return 100
    ascii_host = ".".join(_punycode(p) for p in h.split("."))
    parts = ascii_host.split(".")
    tld = parts[-1] if len(parts) >= 2 else ""
    if tld in (blocked_tlds or []):
        score += 35
    # subdomain depth
    if len(parts) >= 5:
        score += 20
    elif len(parts) == 4:
        score += 10
    root = parts[-2] if len(parts) >= 2 else parts[0]
    if re.search(r"[^a-z0-9\-]", root):
        score += 10
    if re.search(r"(vv|rn|lI|I1|0o|o0)", root):
        score += 8
    if len(root) >= 20:
        score += 6
    return min(score, 100)

def _url_risk(url: str, cfg: dict) -> dict:
    try:
        u = _urlparse(url)
    except Exception:
        return {"risk": 100, "reasons": ["malformed_url"]}
    if u.scheme not in {"http", "https"}:
        return {"risk": 100, "reasons": ["unsupported_scheme"]}
    host = (u.netloc or "").split("@")[-1]
    blocked_tlds = cfg.get("blockedTLDs", [])
    score = 0
    reasons = []

    host_score = _looks_suspicious_host(host, blocked_tlds)
    if host_score >= 35:
        reasons.append("suspicious_tld_or_host")
    score += host_score

    q = (u.query or "").lower()
    if any(k in q for k in (cfg.get("suspiciousKeywords") or [])):
        score += 10
        reasons.append("phishy_keywords_in_query")

    path = (u.path or "").lower()
    if re.search(r"(login|signin|wallet|seed|mnemonic|reset|verify)", path):
        score += 12
        reasons.append("credential_flow_in_path")

    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host):
        score += 15
        reasons.append("ip_literal_host")

    if len(url) > 200:
        score += 6
        reasons.append("very_long_url")

    return {"risk": min(score, 100), "reasons": reasons}

@app.get("/safety/check")
async def safety_check(url: str, request: Request):
    cfg = load_cfg()
    try:
        norm = _normalize_and_check_url(url)
    except Exception as e:
        return JSONResponse({"ok": False, "error": f"invalid_url: {e}"}, status_code=400)
    rep = _url_risk(norm, cfg)
    role = _get_role_from_headers(request)
    _audit_safety("url_checked", {"url": norm, "risk": rep, "role": role})
    return {"ok": True, "url": norm, "risk": rep}

# -------------------- Superadmin Audit endpoints --------------------

def _audit_read_safety() -> List[dict]:
    return _jsonl_read_all(SAFETY_LOG)

def _audit_read_perms() -> List[dict]:
    return _jsonl_read_all(PERMS_PATH)

def _audit_seen_map() -> dict:
    return _json_read(AUDIT_ACK_JSON, {})

def _audit_set_seen(ids: List[str]):
    ack = _audit_seen_map()
    ts = _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    for i in ids or []:
        ack[i] = ts
    _json_write(AUDIT_ACK_JSON, ack)

@app.get("/audit/superadmin")
async def audit_superadmin(limit: int = 50, shape: str = "array"):
    """
    Default: returns a bare array for legacy UIs that call .slice() on the response.
    Pass ?shape=object to get { ok: true, items: [...] }.
    """
    safety = _audit_read_safety()
    perms  = _audit_read_perms()
    seen   = _audit_seen_map()

    items = []
    for r in safety:
        items.append({
            "id": r.get("id"), "ts": r.get("ts"),
            "source": "safety", "event": r.get("event"),
            "detail": r.get("detail", {}), "seen": bool(seen.get(r.get("id")))
        })
    for r in perms:
        status = r.get("status","pending")
        ts = r.get("resolved_at") or r.get("created_at")
        items.append({
            "id": r.get("id"), "ts": ts,
            "source": "permissions", "event": f"permission_{status}",
            "detail": {"kind": r.get("kind"), "payload": r.get("payload"),
                       "requester": r.get("requester"), "approver": r.get("approver")},
            "seen": bool(seen.get(r.get("id")))
        })

    # newest first + clamp
    items.sort(key=lambda x: (x.get("ts") or ""), reverse=True)
    out = items[:max(1, min(limit, 200))]

    if (shape or "").lower() == "object":
        return {"ok": True, "items": out}
    return out

@app.post("/audit/superadmin/ack")
async def audit_superadmin_ack(req: Request):
    data = await req.json()
    ids = data.get("ids") or []
    if not isinstance(ids, list) or not ids:
        return JSONResponse({"error": "ids must be a non-empty array"}, status_code=400)
    _audit_set_seen([str(i) for i in ids])
    return {"ok": True}


# -------------------- Health --------------------

@app.get("/health")
async def health():
    return {"ok": True, "msg": "Zandalee gateway online."}

# -------------------- Config --------------------

@app.get("/config")
async def get_config():
    try:
        return load_cfg()
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/config")
async def set_config(req: Request):
    data = await req.json()
    try:
        cfg = save_cfg(data)
        return {"ok": True, "config": cfg}
    except Exception as e:
        code = 423 if "locked" in str(e).lower() else 500
        return JSONResponse({"error": str(e)}, status_code=code)

# -------------------- Ollama on Salad Proxy --------------------

async def _forward(method: str, path: str, body: Optional[bytes] = None, json_obj: Optional[dict] = None):
    try:
        cfg = load_cfg()
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    base = (cfg.get("base") or "").rstrip("/")
    key = cfg.get("apiKey") or ""
    if not base:
        return JSONResponse({"error": "Salad base URL not configured."}, status_code=400)
    if not key and path != "/api/tags":
        return JSONResponse({"error": "Salad API key not configured."}, status_code=401)

    url = f"{base}{path}"
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Salad-Api-Key"] = key

    try:
        async with httpx.AsyncClient(timeout=None) as c:
            if json_obj is not None:
                r = await c.request(method, url, json=json_obj, headers=headers)
            else:
                r = await c.request(method, url, content=body, headers=headers)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Upstream request failed: {str(e)}"}, status_code=502)

    ct = (r.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        try:
            return JSONResponse(r.json(), status_code=r.status_code)
        except Exception:
            return PlainTextResponse(r.text, status_code=r.status_code)
    return PlainTextResponse(r.text, status_code=r.status_code)

# -------------------- /api/tags (models = string[]) --------------------


# -------------------- Local Voice (SAPI) --------------------

@app.get("/local/voices")
async def list_voices():
    # Honor config voiceBackend; if not sapi, still try, but return hint
    hint = None
    try:
        cfg = load_cfg()
        if (cfg.get("voiceBackend") or "sapi").lower() != "sapi":
            hint = "voiceBackend != 'sapi' (Settings > Gateway Configuration). Using SAPI anyway."
    except Exception:
        pass

    ps = r"""
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices().VoiceInfo | Select-Object -ExpandProperty Name
"""
    r = ps_run(ps)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr.strip() or "Failed to list SAPI voices."}, status_code=500)
    names = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    return {"voices": names, "backend": "sapi", "hint": hint}

@app.post("/local/speak")
async def local_speak(req: Request):
    data  = await req.json()
    text  = (data.get("text") or "").strip()
    if not text:
        return JSONResponse({"error": "No text provided."}, status_code=400)

    # Bounds & defaults (UI-safe)
    rate  = int(max(-10, min(10, int(data.get("rate", 0)))))
    vol   = int(max(0,   min(100, int(data.get("volume", 100)))))
    voice = (data.get("voice") or "").strip().replace('"', '`"')

    # Build PS script. Read text from STDIN to avoid quoting pitfalls.
    ps_lines = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        f"$s.Rate = {rate}; $s.Volume = {vol};",
        "$t = [Console]::In.ReadToEnd();"
    ]
    if voice:
        # Try to select specific voice; if missing, fall back silently
        ps_lines += [
            "$vnames = ($s.GetInstalledVoices().VoiceInfo | ForEach-Object Name);",
            f'if ($vnames -contains "{voice}") {{ $s.SelectVoice("{voice}") | Out-Null }}'
        ]
    ps_lines.append("$s.Speak($t);")

    r = ps_run(" ".join(ps_lines), stdin=text)
    if r.returncode != 0:
        err = r.stderr.strip()
        return JSONResponse({"error": err or "SAPI speak failed."}, status_code=500)
    return {"ok": True}

# -------------------- Memories (JSONL) --------------------

@app.post("/memory/learn")
async def memory_learn(req: Request):
    data = await req.json()
    now = _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    rec = {
        "id": str(uuid.uuid4()),
        "text": (data.get("text") or "").strip(),
        "kind": data.get("kind") or "semantic",
        "importance": float(data.get("importance") or 0.5),
        "relevance": float(data.get("relevance") or 0.5),
        "tags": data.get("tags") or [],
        "source": data.get("source") or "chat",
        "emotion": data.get("emotion") or None,
        "photo_path": data.get("photo_path") or None,
        "audio_path": data.get("audio_path") or None,
        "trust": data.get("trust") or "observed",
        "version": int(data.get("version") or 1),
        "created_at": now,
        "expires_at": data.get("expires_at"),
    }
    if not rec["text"]:
        return JSONResponse({"error": "No memory text."}, status_code=400)
    _jsonl_append(MEM_PATH, rec)
    return {"ok": True, "id": rec["id"]}

# -------------------- Memory search (compat: returns array) --------------------

from typing import Optional

@app.get("/memory/search")
async def memory_search(req: Request, q: Optional[str] = "", limit: int = 50, shape: str = "object"):
    """
    Default: returns { results: [...] } so UIs that do data.results.slice(...) succeed.
    Pass ?shape=array to get a bare array [...] if you need it.
    """
    # Load all memory records from the JSONL store
    records = []
    try:
        if os.path.exists(MEM_PATH):
            with open(MEM_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                        records.append(rec)
                    except Exception:
                        continue
    except Exception:
        records = []

    # Filter by q (case-insensitive) if present
    q_text = (q or "").strip().lower()
    if q_text:
        def _hay(rec: dict) -> str:
            return f"{rec.get('text','')} {' '.join(rec.get('tags',[]) or [])}".lower()
        records = [r for r in records if q_text in _hay(r)]

    # Newest first + clamp
    records.reverse()
    lim = max(1, min(int(limit or 50), 500))
    arr = records[:lim]

    if (shape or "").lower() == "array":
        return arr
    # default: object with results
    return {"results": arr}

# -------------------- Diary (JSONL) --------------------

def _diary_write(rec: dict):
    os.makedirs(os.path.dirname(DIARY_PATH), exist_ok=True)
    with open(DIARY_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

def _diary_read_all():
    return _jsonl_read_all(DIARY_PATH)

@app.post("/diary/append")
async def diary_append(req: Request):
    data = await req.json()
    now  = _dt.datetime.utcnow()
    rec = {
        "id": str(uuid.uuid4()),
        "day": now.strftime("%Y-%m-%d"),
        "text": (data.get("text") or "").strip(),
        "photos": [data.get("photo_path")] if data.get("photo_path") else [],
        "emotions": [data.get("emotion")] if data.get("emotion") else [],
        "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if not rec["text"]:
        return JSONResponse({"error": "No diary text."}, status_code=400)
    _diary_write(rec)
    return {"ok": True, "id": rec["id"], "day": rec["day"]}

@app.post("/diary/rollup")
async def diary_rollup(req: Request):
    data = await req.json()
    period = (data.get("period") or "daily").lower()
    items = _diary_read_all()
    if not items:
        return {"ok": True, "period": period, "text": "No diary entries yet."}

    def week_key(dt: _dt.datetime): return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
    def month_key(dt: _dt.datetime): return f"{dt.year}-{dt.month:02d}"

    buckets = {}
    for rec in items:
        try:
            dt = _dt.datetime.strptime(rec.get("created_at",""), "%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            continue
        if period == "daily":
            k = rec.get("day")
        elif period == "weekly":
            k = week_key(dt)
        else:
            k = month_key(dt)
        buckets.setdefault(k, []).append(rec)

    lines = [f"# {period.capitalize()} Rollup", ""]
    for k in sorted(buckets.keys(), reverse=True):
        group = buckets[k]
        lines.append(f"## {k} — {len(group)} entries")
        for g in group[-10:]:
            preview = (g["text"][:120] + "…") if len(g["text"]) > 120 else g["text"]
            lines.append(f"- {g['created_at']}: {preview}")
        lines.append("")
    return {"ok": True, "period": period, "text": "\n".join(lines)}

# -------------------- Diary list (NEW) --------------------

@app.get("/diary/list")
async def diary_list(limit: int = 50, day: Optional[str] = None):
    """Return newest-first diary entries; supports ?limit & ?day=YYYY-MM-DD."""
    items = list(reversed(_diary_read_all()))
    if day:
        items = [r for r in items if r.get("day") == day]
    # Clamp limit to a safe range
    lim = max(1, min(int(limit or 50), 500))
    return items[:lim]

# -------------------- Uploads & Docs --------------------

@app.post("/local/upload")
async def local_upload(files: List[UploadFile] = File(...)):
    saved = []
    os.makedirs(DOCS_DIR, exist_ok=True)
    for f in files:
        name = os.path.basename(f.filename)
        base, ext = os.path.splitext(name)
        unique = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
        dest = os.path.join(DOCS_DIR, unique)
        with open(dest, "wb") as out:
            out.write(await f.read())
        saved.append({"name": name, "path": dest})
    return {"ok": True, "files": saved}

@app.get("/local/docs")
async def list_docs():
    out = []
    if os.path.isdir(DOCS_DIR):
        for root, _, files in os.walk(DOCS_DIR):
            for fn in files:
                fp = os.path.join(root, fn)
                try:
                    size = os.path.getsize(fp)
                except OSError:
                    size = 0
                out.append({"name": fn, "path": fp, "size": size})
    return {"docs": out}

# -------------------- Mic Wizard (stub) --------------------

def _audio_cfg_read():
    try:
        with open(AUDIO_CFG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _audio_cfg_write(patch: dict):
    cfg = _audio_cfg_read()
    cfg.update(patch or {})
    os.makedirs(os.path.dirname(AUDIO_CFG_PATH), exist_ok=True)
    with open(AUDIO_CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg

@app.get("/mic/list")
async def mic_list():
    current = _audio_cfg_read().get("device_id")
    devices = [
        {"id": 1, "name": "Default PC Microphone", "channels": 1, "default": True},
        {"id": 2, "name": "USB Mic (stub)", "channels": 1},
    ]
    return {"devices": devices, "chosen": current}

@app.post("/mic/wizard")
async def mic_wizard():
    results = [
        {"id": 1, "name": "Default PC Microphone", "snr_db": 24.2, "voiced_ratio": 0.83, "start_delay_ms": 120, "clipping_pct": 0.0, "score": 0.78},
        {"id": 2, "name": "USB Mic (stub)",         "snr_db": 28.1, "voiced_ratio": 0.80, "start_delay_ms": 150, "clipping_pct": 0.0, "score": 0.80},
    ]
    chosen = max(results, key=lambda r: r["score"])
    _audio_cfg_write({"device_id": chosen["id"]})
    return {"ok": True, "results": results, "chosen": chosen}

@app.post("/mic/use")
async def mic_use(req: Request):
    did = int((await req.json()).get("id", 0))
    if not did:
        return JSONResponse({"error": "missing id"}, status_code=400)
    _audio_cfg_write({"device_id": did})
    return {"ok": True, "id": did}

# -------------------- Voice Input (stub for now) --------------------

@app.post("/voice/listen")
async def voice_listen():
    return JSONResponse({"ok": False, "error": "voice/listen not implemented yet"}, status_code=501)

# -------------------- Chat compatibility (/chat -> /api/chat) --------------------

@app.post("/chat")
async def chat_compat(req: Request):
    """
    Some older UI hooks still POST to /chat. This forwards to Salad /api/chat
    and fills in the configured model if the UI didn’t include one.
    Body should look like: { "model": "...", "messages":[{"role":"user","content":"..."}] }
    """
    try:
        body = await req.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    # Ensure model is present
    if not body.get("model"):
        try:
            body["model"] = load_cfg().get("model", "qwen2.5-coder:32b")
        except Exception:
            body["model"] = "qwen2.5-coder:32b"

    # Forward to Salad
    return await _forward("POST", "/api/chat", json_obj=body)


# -------------------- PC Control: Keys / Mouse / App (with guardrails) --------------------

@app.post("/local/keys")
async def local_keys(req: Request):
    """
    Body examples:
      { "keys": "^a" }                     # Ctrl+A
      { "text": "Hello from Zandalee!" }   # literal text (<=500 chars)
      { "sequence": ["^a", "{DEL}", "hi"] }
    Uses .NET SendKeys (foreground window).
    """
    data = await req.json()
    seq: List[str] = []

    if isinstance(data.get("sequence"), list):
        seq = [str(x) for x in data["sequence"]]
    elif "keys" in data:
        seq = [str(data["keys"])]
    elif "text" in data:
        text = str(data["text"])
        if len(text) > 500:
            return JSONResponse({"error": "text too long (>500 chars)"}, status_code=413)
        seq = [text]
    else:
        return JSONResponse({"error": "provide 'keys', 'text', or 'sequence'."}, status_code=400)

    # Permission gate
    perm = _check_permission("keyboard")
    if not perm.get("allowed"):
        return {"ok": False, "needs_permission": True, "reason": perm.get("reason", "blocked")}

    # Anti-spam
    if len(seq) > KEYS_MAX_PER_CALL:
        return JSONResponse({"error": f"too many key events in one call (> {KEYS_MAX_PER_CALL})"}, status_code=429)
    if not _KEYS_RL.allow(len(seq)):
        return JSONResponse({"error": "rate_limited: too many key events, slow down"}, status_code=429)

    # Execute
    script = r"""
Add-Type -AssemblyName System.Windows.Forms
$seq = @(%s)
foreach ($s in $seq) { [System.Windows.Forms.SendKeys]::SendWait($s) }
""" % (", ".join('"{0}"'.format(s.replace('"','`"')) for s in seq))

    r = ps_run(script)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)
    return {"ok": True, "sent": seq, "count": len(seq)}

@app.post("/local/mouse")
async def local_mouse(req: Request):
    """
    Body examples:
      { "move": { "dx": 50, "dy": 0 } }
      { "pos": { "x": 800, "y": 500 } }
      { "click": "left" }   # left/right/middle
      { "double": true, "click": "left" }
    """
    data = await req.json()
    move  = data.get("move")
    pos   = data.get("pos")
    click = (data.get("click") or "").lower()
    double = bool(data.get("double", False))

    # Permission gate
    perm = _check_permission("mouse")
    if not perm.get("allowed"):
        return {"ok": False, "needs_permission": True, "reason": perm.get("reason", "blocked")}

    # Intended event counting
    intended = 0
    if pos or move:
        intended += 1
    if click in ("left", "right", "middle"):
        intended += 2 if double else 1
    if intended == 0:
        return JSONResponse({"error": "provide 'move', 'pos', or 'click'."}, status_code=400)

    # Anti-spam
    if intended > MOUSE_MAX_PER_CALL:
        return JSONResponse({"error": f"too many mouse events in one call (> {MOUSE_MAX_PER_CALL})"}, status_code=429)
    if not _MOUSE_RL.allow(intended):
        return JSONResponse({"error": "rate_limited: too many mouse events, slow down"}, status_code=429)

    # Clamp move deltas
    dx = dy = 0
    if move and ("dx" in move or "dy" in move):
        dx = int(max(min(move.get("dx", 0), 200), -200))
        dy = int(max(min(move.get("dy", 0), 200), -200))

    ps = r'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseOps {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  public const uint MOVE=0x0001, LEFTDOWN=0x0002, LEFTUP=0x0004, RIGHTDOWN=0x0008, RIGHTUP=0x0010, MIDDLEDOWN=0x0020, MIDDLEUP=0x0040;
}
"@
$pos = [System.Windows.Forms.Cursor]::Position
'''
    if pos and "x" in pos and "y" in pos:
        try:
            x = int(pos["x"]); y = int(pos["y"])
            ps += f'[MouseOps]::SetCursorPos({x}, {y});'
        except Exception:
            return JSONResponse({"error": "invalid pos.x/pos.y"}, status_code=400)

    if move and (dx or dy):
        ps += f'[MouseOps]::mouse_event([MouseOps]::MOVE, {dx}, {dy}, 0, [UIntPtr]::Zero);'

    def click_code(btn:str):
        if btn=="left":   return "[MouseOps]::mouse_event([MouseOps]::LEFTDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::LEFTUP,0,0,0,[UIntPtr]::Zero);"
        if btn=="right":  return "[MouseOps]::mouse_event([MouseOps]::RIGHTDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::RIGHTUP,0,0,0,[UIntPtr]::Zero);"
        if btn=="middle": return "[MouseOps]::mouse_event([MouseOps]::MIDDLEDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::MIDDLEUP,0,0,0,[UIntPtr]::Zero);"
        return ""

    if click in ("left","right","middle"):
        ps += click_code(click)
        if double:
            ps += click_code(click)

    r = ps_run(ps)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)

    return {"ok": True, "intended": intended, "clicked": click or None, "double": bool(double), "moved": bool(pos or move)}

# -------------------- Local App Allowlist --------------------

ALLOWED_APPS = {
    "notepad": "notepad.exe",
    "calc": "calc.exe",
    "explorer": "explorer.exe",
    "vscode": "code",            # assumes VS Code on PATH
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    "chrome": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "msedge": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
}

# -------------------- Local App Launch (with autoRequest + Permissions) --------------------

@app.post("/local/app")
async def local_app(req: Request):
    """
    Body example:
      { "name": "vscode", "args": "", "cwd": "C:\\path\\to\\project" }
      { "path": "C:\\Windows\\System32\\notepad.exe", "args": "C:\\temp\\a.txt" }
      { "name": "someapp", "autoRequest": true }  # if not allowed, create permission request
    """
    data = await req.json()
    name = (data.get("name") or "").lower()
    path = data.get("path")
    args = (data.get("args") or "").strip()
    cwd  = (data.get("cwd") or "").strip() or None
    auto_request = bool(data.get("autoRequest", False))
    requester = (data.get("requester") or "zandalee")

    cmd = name or path or ""
    if cmd:
        perm_check = _check_permission(cmd)
        if not perm_check.get("allowed"):
            if auto_request:
                rec = _perm_new("app", {"name": name, "path": path, "args": args, "cwd": cwd}, requester)
                return {"ok": False, "pending": True, "requestId": rec["id"], "reason": perm_check.get("reason", "blocked")}
            return {"ok": False, "needs_permission": True, "reason": perm_check.get("reason", "blocked")}

    # Resolve executable
    if path:
        exe = path
        if not os.path.exists(exe):
            return JSONResponse({"error": f"path not found: {exe}"}, status_code=400)
    else:
        exe = ALLOWED_APPS.get(name)
        if not exe:
            if auto_request:
                rec = _perm_new("app", {"name": name, "path": path, "args": args, "cwd": cwd}, requester)
                return {"ok": False, "pending": True, "requestId": rec["id"], "reason": "app not allowed"}
            return JSONResponse({"error": f"app not allowed: {name}"}, status_code=403)

    # PowerShell launch
    exe_esc  = exe.replace('"', '`"')
    args_esc = args.replace('"', '`"') if args else ""
    cwd_esc  = cwd.replace('"', '`"') if cwd else None

    ps_parts = [f'$exe = "{exe_esc}";']
    if cwd_esc:
        ps_parts.append(f'$wd = "{cwd_esc}";')
    if args_esc:
        ps_parts.append(f'$args = "{args_esc}";')
        cmd = 'Start-Process -FilePath $exe -ArgumentList $args'
    else:
        cmd = 'Start-Process -FilePath $exe'
    if cwd_esc:
        cmd += ' -WorkingDirectory $wd'
    ps_parts.append(cmd + ';')
    ps_script = " ".join(ps_parts)

    try:
        r = ps_run(ps_script)
        if r.returncode != 0:
            return JSONResponse({"error": r.stderr}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    return {"ok": True, "launched": exe, "args": args, "cwd": cwd}

# -------------------- Open Internet: open-url / fetch / download (with safety net) --------------------

@app.post("/local/open-url")
async def open_url(req: Request):
    data = await req.json()
    raw = (data.get("url") or "").strip()
    browser = (data.get("browser") or _cfg_get("browser", "chrome")).lower()
    flags = _cfg_get("browserFlags", ["--new-window"])
    auto_request = bool(data.get("autoRequest", False))
    requester = (data.get("requester") or "zandalee")

    if not _cfg_get("openInternet", True):
        if auto_request:
            rec = _perm_new("url", {"url": raw}, requester)
            return {"ok": False, "pending": True, "requestId": rec["id"], "reason": "internet disabled"}
        return JSONResponse({"error": "openInternet disabled in config."}, status_code=403)

    try:
        url = _normalize_and_check_url(raw)
    except Exception as e:
        return JSONResponse({"error": f"invalid_url: {e}"}, status_code=400)

    # Safety gate
    cfg = load_cfg()
    rep = _url_risk(url, cfg)
    warn_at = int(cfg.get("riskThresholdWarn", 40))
    block_at = int(cfg.get("riskThresholdBlock", 75))
    role = _get_role_from_headers(req)

    if rep["risk"] >= block_at:
        _audit_safety("url_blocked", {"url": url, "risk": rep, "role": role})
        return JSONResponse({"error": "blocked_by_safety", "risk": rep}, status_code=451)

    if role not in ADMIN_ROLES and rep["risk"] >= warn_at and not bool(data.get("confirm", False)):
        _audit_safety("url_requires_confirm", {"url": url, "risk": rep})
        return {"ok": False, "needs_confirmation": True, "risk": rep, "hint": "call again with { confirm: true }"}

    exe = ALLOWED_APPS.get(browser)
    if not exe:
        return JSONResponse({"error": f"browser_not_allowed: {browser}"}, status_code=403)

    safe_url = url.replace('"','`"')
    arg_list = " ".join(flags + [f'"{safe_url}"'])
    ps_script = f'$exe="{exe.replace("\"","`\"")}"; $args="{arg_list.replace("\"","`\"")}"; Start-Process -FilePath $exe -ArgumentList $args;'

    r = ps_run(ps_script)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)

    try:
        _diary_write({
            "id": str(uuid.uuid4()),
            "day": _dt.datetime.utcnow().strftime("%Y-%m-%d"),
            "text": f"Opened URL: {url}",
            "photos": [], "emotions": [],
            "created_at": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
    except Exception:
        pass

    return {"ok": True, "url": url, "browser": browser, "risk": rep}

@app.get("/net/fetch")
async def net_fetch(url: str, request: Request):
    try:
        url = _normalize_and_check_url(url)
    except Exception as e:
        return JSONResponse({"error": f"invalid_url: {e}"}, status_code=400)

    # Safety (block only at high risk)
    cfg = load_cfg()
    rep = _url_risk(url, cfg)
    block_at = int(cfg.get("riskThresholdBlock", 75))
    if rep["risk"] >= block_at:
        _audit_safety("fetch_blocked", {"url": url, "risk": rep, "role": _get_role_from_headers(request)})
        return JSONResponse({"error": "blocked_by_safety", "risk": rep}, status_code=451)

    max_text = int(cfg.get("fetchMaxTextBytes", 2_000_000) or 2_000_000)
    allowed_prefixes = list(cfg.get("allowedMimePrefixes", ["text/", "application/json"]) or [])

    try:
        async with httpx.AsyncClient(follow_redirects=True, headers=_ua_headers(), timeout=30.0, max_redirects=int(cfg.get("maxRedirects", 5))) as c:
            r = await c.get(url)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"fetch_failed: {e}"}, status_code=502)

    ct = (r.headers.get("content-type") or "").lower()
    if not any(ct.startswith(p) for p in allowed_prefixes):
        return JSONResponse({"error": f"unsupported_content_type: {ct or 'unknown'}"}, status_code=415)

    text = r.text
    if len(text.encode("utf-8")) > max_text:
        text = text.encode("utf-8")[:max_text].decode("utf-8", errors="ignore")

    return {"ok": True, "url": str(r.url), "status": r.status_code, "contentType": ct, "text": text, "risk": rep}

@app.post("/net/download")
async def net_download(req: Request):
    data = await req.json()
    try:
        url = _normalize_and_check_url((data.get("url") or ""))
    except Exception as e:
        return JSONResponse({"error": f"invalid_url: {e}"}, status_code=400)

    cfg = load_cfg()
    rep = _url_risk(url, cfg)
    warn_at = int(cfg.get("riskThresholdWarn", 40))
    block_at = int(cfg.get("riskThresholdBlock", 75))
    role = _get_role_from_headers(req)
    non_admin = role not in ADMIN_ROLES

    if rep["risk"] >= block_at:
        _audit_safety("download_blocked", {"url": url, "risk": rep, "role": role})
        return JSONResponse({"error": "blocked_by_safety", "risk": rep}, status_code=451)

    if non_admin and rep["risk"] >= warn_at and not bool(data.get("confirm", False)):
        _audit_safety("download_requires_confirm", {"url": url, "risk": rep})
        return {"ok": False, "needs_confirmation": True, "risk": rep, "hint": "call again with { confirm: true }"}

    max_bytes = int(cfg.get("downloadMaxBytes", 20_000_000) or 20_000_000)

    try:
        async with httpx.AsyncClient(follow_redirects=True, headers=_ua_headers(), timeout=None, max_redirects=int(cfg.get("maxRedirects", 5))) as c:
            r = await c.get(url)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"download_failed: {e}"}, status_code=502)

    filename = os.path.basename(_urlparse(str(r.url)).path) or f"download_{uuid.uuid4().hex}"
    if _dangerous_ext(filename):
        return JSONResponse({"error": f"blocked_extension: {filename}"}, status_code=415)

    data_bytes = r.content or b""
    if len(data_bytes) > max_bytes:
        return JSONResponse({"error": f"too_large: {len(data_bytes)} > {max_bytes}"}, status_code=413)

    os.makedirs(DOCS_DIR, exist_ok=True)
    base, ext = os.path.splitext(filename)
    unique = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
    dest = os.path.join(DOCS_DIR, unique)
    with open(dest, "wb") as f:
        f.write(data_bytes)

    # Quarantine for non-admin if moderately risky
    if non_admin and rep["risk"] >= warn_at:
        qdir = cfg.get("quarantineDir") or os.path.join(DOCS_DIR, "Quarantine")
        os.makedirs(qdir, exist_ok=True)
        qdest = os.path.join(qdir, os.path.basename(dest))
        try:
            os.replace(dest, qdest)
            dest = qdest
            _audit_safety("download_quarantined", {"url": str(r.url), "savedAs": dest, "risk": rep})
        except Exception as _e:
            _audit_safety("download_quarantine_failed", {"url": str(r.url), "savedAs": dest, "error": str(_e)})

    return {"ok": True, "name": filename, "savedAs": dest, "size": len(data_bytes), "risk": rep}

# -------------------- Shared + Avatars dirs (NEW) --------------------

SHARED_DIR = os.path.join(DATA_DIR, "family", "_shared")
SHARED_DOCS_DIR = os.path.join(SHARED_DIR, "docs")
AVATAR_DIR = os.path.join(DATA_DIR, "avatars")
os.makedirs(SHARED_DIR, exist_ok=True)
os.makedirs(SHARED_DOCS_DIR, exist_ok=True)
os.makedirs(AVATAR_DIR, exist_ok=True)

import time as _time
STARTED_S = int(_time.time())

# -------------------- /memory/list (NEW) --------------------

@app.get("/memory/list")
async def memory_list(limit: int = 50):
    """Newest-first list of memory records as a bare array."""
    items: List[dict] = []
    try:
        if os.path.exists(MEM_PATH):
            with open(MEM_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        items.append(json.loads(line))
                    except Exception:
                        continue
    except Exception:
        items = []
    items.reverse()
    lim = max(1, min(int(limit or 50), 500))
    return items[:lim]

# -------------------- /shared/docs (NEW) --------------------

@app.get("/shared/docs")
async def shared_docs():
    """List files from the shared family docs folder."""
    docs = []
    try:
        for name in os.listdir(SHARED_DOCS_DIR):
            p = os.path.join(SHARED_DOCS_DIR, name)
            if os.path.isfile(p):
                st = os.stat(p)
                docs.append({"name": name, "path": p, "size": int(st.st_size)})
    except Exception:
        pass
    docs.sort(key=lambda d: d["name"].lower())
    return {"docs": docs}

# -------------------- /shared/chat (NEW: GET/POST) --------------------

SHARED_CHAT_JSONL = os.path.join(SHARED_DIR, "shared_chat.jsonl")

def _jsonl_read_all_safe(path: str) -> List[dict]:
    if not os.path.exists(path): return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out

@app.get("/shared/chat")
async def shared_chat_get(limit: int = 50):
    """Return last N shared chat messages (array)."""
    msgs = _jsonl_read_all_safe(SHARED_CHAT_JSONL)
    msgs.reverse()
    lim = max(1, min(int(limit or 50), 500))
    return msgs[:lim]

@app.post("/shared/chat")
async def shared_chat_post(req: Request):
    """Append a shared chat message."""
    data = await req.json()
    msg = {
        "id": f"m_{secrets.token_hex(8)}",
        "ts": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "author": (data.get("author") or "system"),
        "text": (data.get("text") or "").strip()
    }
    _jsonl_append(SHARED_CHAT_JSONL, msg)
    return {"ok": True, "message": msg}

# -------------------- /status (NEW) --------------------

@app.get("/status")
async def status():
    """Basic daemon status for legacy hooks."""
    ui_ok = False
    try:
        ui_ok = bool(UI_DIR and (UI_DIR / "index.html").exists())
    except Exception:
        ui_ok = False
    return {
        "ok": True,
        "uptime_s": int(_time.time()) - STARTED_S,
        "ui_ok": ui_ok,
        "version": "zandalee-gateway-1",
    }

# -------------------- /avatar/list (NEW) --------------------

@app.get("/avatar/list")
async def avatar_list():
    """List avatar image files; empty array if none."""
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    items = []
    try:
        for name in os.listdir(AVATAR_DIR):
            if os.path.splitext(name)[1].lower() in exts:
                p = os.path.join(AVATAR_DIR, name)
                st = os.stat(p)
                items.append({"name": name, "path": p, "size": int(st.st_size)})
    except Exception:
        pass
    items.sort(key=lambda x: x["name"].lower())
    return items

# -------------------- WebSocket (minimal + permission events) --------------------

@app.websocket("/ws")
async def ws_handler(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        await ws.send_json({"type": "hello", "ok": True})
        while True:
            try:
                _ = await asyncio.wait_for(ws.receive_text(), timeout=2.0)
                await ws.send_json({"type": "heartbeat", "ok": True})
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat", "ok": True})
    except WebSocketDisconnect:
        pass
    finally:
        if ws in clients:
            clients.remove(ws)

# -------------------- Static UI (auto-detect; mounts /app and /assets) --------------------

def _has_index(path: Path) -> bool:
    return path.is_dir() and (path / "index.html").exists()

def _resolve_ui_dir() -> Optional[Path]:
    # 1) env override
    env_dir = os.environ.get("ZANDALEE_UI_DIR")
    if env_dir:
        p = Path(env_dir)
        if _has_index(p):
            return p

    # 2) PyInstaller bundle (added via --add-data "<dist>;ui_dist")
    try:
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        p = base / "ui_dist"
        if _has_index(p):
            return p
    except Exception:
        pass

    # 3) repo fallbacks
    root = Path(BASE_DIR).parent  # ...\Zandalee
    for cand in [root / "ui" / "app" / "dist", root / "ui" / "dist"]:
        if _has_index(cand):
            return cand

    return None

UI_DIR = _resolve_ui_dir()

@app.get("/ui-info")
async def ui_info():
    cands = []
    if os.environ.get("ZANDALEE_UI_DIR"):
        cands.append(os.environ["ZANDALEE_UI_DIR"])
    root = Path(BASE_DIR).parent
    cands += [str(root / "ui" / "app" / "dist"), str(root / "ui" / "dist")]
    try:
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        cands.append(str(base / "ui_dist"))
    except Exception:
        pass
    return {
        "ui_ok": bool(UI_DIR and (UI_DIR / "index.html").exists()),
        "ui_path": str(UI_DIR) if UI_DIR else None,
        "candidates": cands,
        "has_index": bool(UI_DIR and (UI_DIR / "index.html").exists()),
    }

@app.get("/", include_in_schema=False)
async def root():
    if UI_DIR and (UI_DIR / "index.html").exists():
        return RedirectResponse(url="/app/")
    # No UI found – show instructions
    lines = []
    lines.append("<!doctype html><html><head><meta charset='utf-8'><title>Zandalee Gateway</title></head>")
    lines.append("<body style='font-family:Segoe UI,Arial,sans-serif; padding:24px; line-height:1.5'>")
    lines.append("<h1>🟢 Zandalee gateway is running</h1>")
    lines.append("<p>No UI build found yet.</p>")
    lines.append("<h3>Looked in</h3><pre>")
    lines.append("\n".join([str(Path(BASE_DIR).parent / "ui" / "app" / "dist"),
                            str(Path(BASE_DIR).parent / "ui" / "dist"),
                            os.environ.get("ZANDALEE_UI_DIR","(none)"),
                            "(PyInstaller: ui_dist)"]))
    lines.append("</pre>")
    lines.append("</body></html>")
    return HTMLResponse("\n".join(lines), status_code=200)

@app.get("/app/", response_class=HTMLResponse)
async def serve_app_index():
    if not (UI_DIR and (UI_DIR / "index.html").exists()):
        return HTMLResponse("<h1>UI not found</h1>", status_code=404)
    html = (UI_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html, status_code=200, headers={"Cache-Control": "no-store"})

# Mount static assets at BOTH /assets and /app/assets
if UI_DIR and (UI_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="assets")
    app.mount("/app/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="appassets")

# -------------------- Voice metrics stubs (UI compatibility) --------------------

@app.get("/voice/metrics")
async def voice_metrics():
    return {
        "speaking": False,
        "rms": 0.0,
        "peak": 0.0,
        "latency_ms": 0,
        "timestamp": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

@app.post("/voice/stop")
async def voice_stop():
    return {"ok": True}

# -------------------- Main (single-click UX) --------------------

if __name__ == "__main__":
    import socket, threading, webbrowser, time
    import uvicorn

    HOST = "127.0.0.1"
    PORT = 11500
    URL  = f"http://{HOST}:{PORT}/app/?v={uuid.uuid4().hex[:8]}"

    def _port_in_use(host: str, port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.25)
            return s.connect_ex((host, port)) == 0

    # If already running, just open the UI and quit
    if _port_in_use(HOST, PORT):
        try:
            webbrowser.open(URL)
        finally:
            sys.exit(0)

    # Not running: start the server, open UI shortly after
    def _open_ui():
        time.sleep(0.8)
        try:
            webbrowser.open(URL)
        except Exception:
            pass

    threading.Thread(target=_open_ui, daemon=True).start()

    uvicorn.run(app, host=HOST, port=PORT, log_level="info")

