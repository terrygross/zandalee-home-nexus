from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx
from ..config import load_cfg
from ..utils import ua_headers

router = APIRouter()

@router.post("/api/v1/chat/completions")
async def chat_completions(req: Request):
    """
    Proxy chat completions to Salad API.
    
    Parameters:
    - req (Request): JSON with model and messages.
    
    Returns:
    - dict: Salad API response or error.
    """
    try:
        data = await req.json()
    except Exception:
        data = {}
    
    cfg = load_cfg()
    base = cfg.get("base", "").rstrip("/")
    key = cfg.get("apiKey", "")
    if not base:
        return JSONResponse({"error": "Gateway not configured (missing base)."}, status_code=503)
    
    if not data.get("model"):
        data["model"] = cfg.get("model", "qwen2.5-coder:32b")
    if "stream" not in data:
        data["stream"] = False
    
    headers = {"Content-Type": "application/json", **ua_headers()}
    if key:
        headers["Salad-Api-Key"] = key
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(f"{base}/api/v1/chat/completions", headers=headers, json=data)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return JSONResponse({"error": f"chat completions failed: {e}"}, status_code=502)