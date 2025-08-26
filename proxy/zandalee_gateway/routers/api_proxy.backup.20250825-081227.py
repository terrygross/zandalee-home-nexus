import json
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from ..core.config import load_cfg

router = APIRouter()

async def _forward(method: str, path: str, body_bytes: bytes | None, json_obj: dict | None):
    cfg = load_cfg()
    base = (cfg.get("base") or "").rstrip("/")
    key  = cfg.get("apiKey") or ""
    if not base:
        return JSONResponse({"error": "Salad base URL not configured."}, status_code=400)
    if not key and not path.startswith("/api/tags"):
        return JSONResponse({"error": "Salad API key not configured."}, status_code=401)

    url = f"{base}{path}"
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Salad-Api-Key"] = key

    async with httpx.AsyncClient(timeout=None) as c:
        r = await c.request(method, url, headers=headers, json=json_obj, content=body_bytes)
    ct = (r.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        try:
            return JSONResponse(r.json(), status_code=r.status_code)
        except Exception:
            return PlainTextResponse(r.text, status_code=r.status_code)
    return PlainTextResponse(r.text, status_code=r.status_code)

@router.post("/api/chat")
async def api_chat(req: Request):
    body = {}
    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON"}, status_code=400)
    cfg = load_cfg()
    if not body.get("model"):
        body["model"] = cfg.get("model", "qwen2.5-coder:32b")
    return await _forward("POST", "/api/chat", None, body)

@router.get("/api/tags")
async def tags(shape: str = "object"):
    cfg = load_cfg()
    base = (cfg.get("base") or "").rstrip("/")
    key  = cfg.get("apiKey") or ""
    mdl  = cfg.get("model", "qwen2.5-coder:32b")

    # fallback list if salad unreachable
    names = []
    if not base:
        names = [mdl]
    else:
        try:
            headers = {"Content-Type": "application/json"}
            if key: headers["Salad-Api-Key"] = key
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(f"{base}/api/tags", headers=headers)
            if r.status_code == 200:
                data = r.json()
                objs = data.get("models") if isinstance(data, dict) else data
                if isinstance(objs, list):
                    for m in objs:
                        if isinstance(m, str):
                            names.append(m)
                        elif isinstance(m, dict):
                            n = m.get("name") or m.get("model")
                            if n: names.append(str(n))
            if not names:
                names = [mdl]
        except Exception:
            names = [mdl]

    s = (shape or "").lower()
    if s == "array":
        return names
    if s == "raw":
        return {"models": [{"name": n} for n in names]}
    # UI-friendly hybrid shape
    return {
        "models": names,
        "objects": [{"name": n} for n in names],
        "selected": mdl,
        "count": len(names),
        "diag": None
    }

@router.api_route("/api/{rest_of_path:path}", methods=["GET","POST","PUT","PATCH","DELETE"])
async def api_passthrough(rest_of_path: str, request: Request):
    path = f"/api/{rest_of_path}"
    if request.url.query:
        path += f"?{request.url.query}"
    raw = await request.body()
    json_obj = None
    if raw:
        try:
            json_obj = json.loads(raw.decode("utf-8"))
            raw = None
        except Exception:
            pass
    return await _forward(request.method, path, raw, json_obj)
