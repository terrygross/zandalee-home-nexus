import os
import time
import httpx
import webbrowser
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .config import cfg_get, DOCS_DIR
from .utils import normalize_and_check_url, ua_headers, dangerous_ext

def register_routes(app: FastAPI):
    """Register internet access-related routes on the FastAPI app."""
    
    @app.post("/local/open-url")
    async def local_open_url(req: Request):
        """
        Open a URL in the default browser.
        
        Parameters:
        - req (Request): JSON with 'url'.
        
        Returns:
        - dict: {ok} on success.
        """
        if not cfg_get("openInternet", True):
            return JSONResponse({"error": "internet access disabled"}, status_code=403)
        
        try:
            data = await req.json()
        except Exception:
            data = {}
        url = (data.get("url") or "").strip()
        
        try:
            url = normalize_and_check_url(url)
            webbrowser.open(url)
            return {"ok": True}
        except Exception as e:
            return JSONResponse({"error": f"open url failed: {e}"}, status_code=400)
    
    @app.post("/net/fetch")
    async def net_fetch(req: Request):
        """
        Fetch content from a URL.
        
        Parameters:
        - req (Request): JSON with 'url'.
        
        Returns:
        - dict: {ok, content, mime} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        url = (data.get("url") or "").strip()
        
        try:
            url = normalize_and_check_url(url)
            async with httpx.AsyncClient(follow_redirects=True, max_redirects=cfg_get("maxRedirects", 5)) as c:
                r = await c.get(url, headers=ua_headers())
            r.raise_for_status()
            
            content_type = r.headers.get("content-type", "").lower()
            allowed_prefixes = cfg_get("allowedMimePrefixes", ["text/", "application/json"])
            if not any(content_type.startswith(p) for p in allowed_prefixes):
                return JSONResponse({"error": f"unsupported content type: {content_type}"}, status_code=400)
            
            max_bytes = cfg_get("fetchMaxTextBytes", 2_000_000)
            if len(r.content) > max_bytes:
                return JSONResponse({"error": "content too large"}, status_code=400)
            
            return {
                "ok": True,
                "content": r.text,
                "mime": content_type
            }
        except Exception as e:
            return JSONResponse({"error": f"fetch failed: {e}"}, status_code=400)
    
    @app.post("/net/download")
    async def net_download(req: Request):
        """
        Download a file from a URL to the documents directory.
        
        Parameters:
        - req (Request): JSON with 'url' and optional 'filename'.
        
        Returns:
        - dict: {ok, path} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        url = (data.get("url") or "").strip()
        fname = (data.get("filename") or "").strip() or os.path.basename(urlparse(url).path) or f"download-{int(time.time())}.bin"
        
        if dangerous_ext(fname):
            return JSONResponse({"error": "file type not allowed"}, status_code=400)
        
        try:
            url = normalize_and_check_url(url)
            async with httpx.AsyncClient(follow_redirects=True, max_redirects=cfg_get("maxRedirects", 5)) as c:
                r = await c.get(url, headers=ua_headers())
            r.raise_for_status()
            
            max_bytes = cfg_get("downloadMaxBytes", 20_000_000)
            if len(r.content) > max_bytes:
                return JSONResponse({"error": "file too large"}, status_code=400)
            
            path = os.path.join(DOCS_DIR, fname)
            with open(path, "wb") as f:
                f.write(r.content)
            return {"ok": True, "path": path}
        except Exception as e:
            return JSONResponse({"error": f"download failed: {e}"}, status_code=400)