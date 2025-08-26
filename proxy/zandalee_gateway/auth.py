import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from .config import FAMILY_DIR, USERS_JSON, INVITES_JSON, SESSIONS_JSON
from .utils import _json_read, _json_write

def register_routes(app: FastAPI):
    """Register authentication-related routes on the FastAPI app."""
    
    def _hash_pw(pw: str, salt: str = "") -> tuple[str, str]:
        if not salt:
            salt = secrets.token_hex(16)
        h = hmac.new(salt.encode(), pw.encode(), hashlib.sha256).hexdigest()
        return h, salt
    
    def _verify_pw(pw: str, h: str, salt: str) -> bool:
        h2, _ = _hash_pw(pw, salt)
        return hmac.compare_digest(h.encode(), h2.encode())
    
    def _new_user_id(users: dict) -> str:
        while True:
            candidate = secrets.token_hex(8)
            if candidate not in users:
                return candidate
    
    def _new_session_id(sessions: dict) -> str:
        while True:
            candidate = secrets.token_hex(16)
            if candidate not in sessions:
                return candidate
    
    @app.post("/users/register")
    async def users_register(req: Request):
        """
        Register a new user with username and password.
        
        Parameters:
        - req (Request): JSON with 'username', 'password', and optional 'invite' code.
        
        Returns:
        - dict: {ok, userId, sessionId} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        invite = (data.get("invite") or "").strip()
        
        if not username or not password:
            return JSONResponse({"error": "username and password required"}, status_code=400)
        
        invites = _json_read(INVITES_JSON, {})
        if not invites.get(invite):
            return JSONResponse({"error": "valid invite code required"}, status_code=403)
        
        users = _json_read(USERS_JSON, {})
        for u in users.values():
            if u.get("username", "").lower() == username.lower():
                return JSONResponse({"error": "username taken"}, status_code=400)
        
        user_id = _new_user_id(users)
        h, salt = _hash_pw(password)
        users[user_id] = {
            "username": username,
            "hash": h,
            "salt": salt,
            "created": int(time.time())
        }
        _json_write(USERS_JSON, users)
        
        sessions = _json_read(SESSIONS_JSON, {})
        session_id = _new_session_id(sessions)
        sessions[session_id] = {
            "userId": user_id,
            "created": int(time.time()),
            "expires": int(time.time()) + 30 * 24 * 3600
        }
        _json_write(SESSIONS_JSON, sessions)
        
        del invites[invite]
        _json_write(INVITES_JSON, invites)
        
        return {
            "ok": True,
            "userId": user_id,
            "sessionId": session_id
        }
    
    @app.post("/auth/login")
    async def auth_login(req: Request):
        """
        Authenticate a user and create a session.
        
        Parameters:
        - req (Request): JSON with 'username' and 'password'.
        
        Returns:
        - dict: {ok, userId, sessionId} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        
        if not username or not password:
            return JSONResponse({"error": "username and password required"}, status_code=400)
        
        users = _json_read(USERS_JSON, {})
        user_id = None
        for uid, u in users.items():
            if u.get("username", "").lower() == username.lower():
                user_id = uid
                break
        
        if not user_id:
            return JSONResponse({"error": "user not found"}, status_code=404)
        
        user = users[user_id]
        if not _verify_pw(password, user.get("hash", ""), user.get("salt", "")):
            return JSONResponse({"error": "invalid password"}, status_code=401)
        
        sessions = _json_read(SESSIONS_JSON, {})
        session_id = _new_session_id(sessions)
        sessions[session_id] = {
            "userId": user_id,
            "created": int(time.time()),
            "expires": int(time.time()) + 30 * 24 * 3600
        }
        _json_write(SESSIONS_JSON, sessions)
        
        return {
            "ok": True,
            "userId": user_id,
            "sessionId": session_id
        }
    
    @app.post("/auth/verify")
    async def auth_verify(req: Request):
        """
        Verify a session ID.
        
        Parameters:
        - req (Request): JSON with 'sessionId'.
        
        Returns:
        - dict: {ok, userId} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        session_id = (data.get("sessionId") or "").strip()
        
        if not session_id:
            return JSONResponse({"error": "sessionId required"}, status_code=400)
        
        sessions = _json_read(SESSIONS_JSON, {})
        session = sessions.get(session_id)
        if not session or session.get("expires", 0) < time.time():
            return JSONResponse({"error": "invalid or expired session"}, status_code=401)
        
        return {
            "ok": True,
            "userId": session.get("userId")
        }
    
    @app.post("/auth/logout")
    async def auth_logout(req: Request):
        """
        Invalidate a session.
        
        Parameters:
        - req (Request): JSON with 'sessionId'.
        
        Returns:
        - dict: {ok} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        session_id = (data.get("sessionId") or "").strip()
        
        if not session_id:
            return JSONResponse({"error": "sessionId required"}, status_code=400)
        
        sessions = _json_read(SESSIONS_JSON, {})
        if session_id in sessions:
            del sessions[session_id]
            _json_write(SESSIONS_JSON, sessions)
        
        return {"ok": True}