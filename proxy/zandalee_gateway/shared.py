import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .config import SHARED_CHAT_JSONL
from .utils import jsonl_append, jsonl_read_all

def register_routes(app: FastAPI):
    """Register shared resource routes on the FastAPI app."""
    
    @app.get("/shared/chat")
    async def shared_chat_list(limit: int = 50):
        """
        List shared chat messages, newest first.
        
        Parameters:
        - limit (int, optional): Maximum number of messages to return (1–500, default 50).
        
        Returns:
        - List[dict]: Array of chat messages.
        """
        items = jsonl_read_all(SHARED_CHAT_JSONL)
        items.reverse()
        lim = max(1, min(limit, 500))
        return items[:lim]
    
    @app.post("/shared/chat")
    async def shared_chat_append(req: Request):
        """
        Append a new shared chat message.
        
        Parameters:
        - req (Request): JSON with 'text', 'userId', and optional 'role'.
        
        Returns:
        - dict: {ok, id} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        text = (data.get("text") or "").strip()
        user_id = (data.get("userId") or "").strip()
        role = (data.get("role") or "user").strip()
        
        if not text or not user_id:
            return JSONResponse({"error": "text and userId required"}, status_code=400)
        
        msg_id = f"{int(time.time())}-{user_id[:8]}"
        jsonl_append(SHARED_CHAT_JSONL, {
            "id": msg_id,
            "text": text,
            "userId": user_id,
            "role": role,
            "created_at": int(time.time())
        })
        return {"ok": True, "id": msg_id}