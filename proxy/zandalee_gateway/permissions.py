import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from .config import PERMS_PATH, SAFETY_LOG
from .utils import jsonl_append, jsonl_read_all

def register_routes(app: FastAPI):
    """Register permissions and safety-related routes on the FastAPI app."""
    
    def _perm_new(user_id: str, action: str, target: str, expires: int = 0) -> dict:
        perm = {
            "id": f"{int(time.time())}-{user_id[:8]}-{action[:8]}",
            "userId": user_id,
            "action": action,
            "target": target,
            "created": int(time.time()),
            "expires": expires
        }
        jsonl_append(PERMS_PATH, perm)
        return perm
    
    def _perm_update(perm_id: str, approved: bool, user_id: str, mod_user_id: str) -> dict | None:
        perms = jsonl_read_all(PERMS_PATH)
        for p in perms:
            if p.get("id") == perm_id and p.get("userId") == user_id:
                p["approved"] = approved
                p["modUserId"] = mod_user_id
                p["modTime"] = int(time.time())
                jsonl_append(PERMS_PATH, p)
                return p
        return None
    
    @app.get("/permissions/list")
    async def permissions_list():
        """
        List all permission records.
        
        Returns:
        - List[dict]: Array of permission records.
        """
        perms = jsonl_read_all(PERMS_PATH)
        return perms
    
    @app.post("/permissions/request")
    async def permissions_request(req: Request):
        """
        Request a new permission.
        
        Parameters:
        - req (Request): JSON with 'userId', 'action', 'target', and optional 'expires'.
        
        Returns:
        - dict: Created permission record.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        user_id = (data.get("userId") or "").strip()
        action = (data.get("action") or "").strip()
        target = (data.get("target") or "").strip()
        expires = data.get("expires", 0)
        
        if not (user_id and action and target):
            return JSONResponse({"error": "userId, action, and target required"}, status_code=400)
        
        perm = _perm_new(user_id, action, target, expires)
        return perm
    
    @app.post("/permissions/approve")
    async def permissions_approve(req: Request):
        """
        Approve or deny a permission request.
        
        Parameters:
        - req (Request): JSON with 'permId', 'userId', 'modUserId', 'approved'.
        
        Returns:
        - dict: Updated permission record or error.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        perm_id = (data.get("permId") or "").strip()
        user_id = (data.get("userId") or "").strip()
        mod_user_id = (data.get("modUserId") or "").strip()
        approved = data.get("approved", False)
        
        if not (perm_id and user_id and mod_user_id):
            return JSONResponse({"error": "permId, userId, and modUserId required"}, status_code=400)
        
        perm = _perm_update(perm_id, approved, user_id, mod_user_id)
        if not perm:
            return JSONResponse({"error": "permission not found"}, status_code=404)
        
        return perm
    
    @app.post("/safety/log")
    async def safety_log(req: Request):
        """
        Log a safety audit event.
        
        Parameters:
        - req (Request): JSON with 'userId', 'action', 'target', 'details'.
        
        Returns:
        - dict: {ok} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        user_id = (data.get("userId") or "").strip()
        action = (data.get("action") or "").strip()
        target = (data.get("target") or "").strip()
        details = data.get("details", {})
        
        if not (user_id and action and target):
            return JSONResponse({"error": "userId, action, and target required"}, status_code=400)
        
        jsonl_append(SAFETY_LOG, {
            "userId": user_id,
            "action": action,
            "target": target,
            "details": details,
            "timestamp": int(time.time())
        })
        return {"ok": True}