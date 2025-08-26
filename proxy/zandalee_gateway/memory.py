import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .config import MEM_PATH, DIARY_PATH
from .utils import jsonl_append, jsonl_read_all

def register_routes(app: FastAPI):
    """Register memory and diary-related routes on the FastAPI app."""
    
    @app.get("/memory/list")
    async def memory_list(limit: int = 50):
        """
        Retrieve a list of memory records, newest first.
        
        Parameters:
        - limit (int, optional): Maximum number of records to return (1–500, default 50).
        
        Returns:
        - List[dict]: Array of memory records with fields like id, text, created_at.
        """
        items = jsonl_read_all(MEM_PATH)
        items.reverse()
        lim = max(1, min(limit, 500))
        return items[:lim]
    
    @app.post("/memory/append")
    async def memory_append(req: Request):
        """
        Append a new memory record.
        
        Parameters:
        - req (Request): JSON with 'text' and optional 'userId'.
        
        Returns:
        - dict: {ok, id} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        text = (data.get("text") or "").strip()
        user_id = (data.get("userId") or "").strip()
        
        if not text:
            return JSONResponse({"error": "text required"}, status_code=400)
        
        mem_id = f"{int(time.time())}-{user_id[:8] if user_id else 'anon'}"
        jsonl_append(MEM_PATH, {
            "id": mem_id,
            "text": text,
            "userId": user_id or None,
            "created_at": int(time.time())
        })
        return {"ok": True, "id": mem_id}
    
    @app.get("/diary/list")
    async def diary_list(limit: int = 50):
        """
        Retrieve a list of diary entries, newest first.
        
        Parameters:
        - limit (int, optional): Maximum number of records to return (1–500, default 50).
        
        Returns:
        - List[dict]: Array of diary entries with fields like id, text, created_at.
        """
        items = jsonl_read_all(DIARY_PATH)
        items.reverse()
        lim = max(1, min(limit, 500))
        return items[:lim]
    
    @app.post("/diary/append")
    async def diary_append(req: Request):
        """
        Append a new diary entry.
        
        Parameters:
        - req (Request): JSON with 'text' and optional 'userId'.
        
        Returns:
        - dict: {ok, id} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        text = (data.get("text") or "").strip()
        user_id = (data.get("userId") or "").strip()
        
        if not text:
            return JSONResponse({"error": "text required"}, status_code=400)
        
        diary_id = f"{int(time.time())}-{user_id[:8] if user_id else 'anon'}"
        jsonl_append(DIARY_PATH, {
            "id": diary_id,
            "text": text,
            "userId": user_id or None,
            "created_at": int(time.time())
        })
        return {"ok": True, "id": diary_id}