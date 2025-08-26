import subprocess
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .utils import ps_run

def register_routes(app: FastAPI):
    """Register PC control-related routes on the FastAPI app."""
    
    @app.post("/local/keys")
    async def local_keys(req: Request):
        """
        Simulate keyboard input via PowerShell.
        
        Parameters:
        - req (Request): JSON with 'keys' string.
        
        Returns:
        - dict: {ok} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        keys = (data.get("keys") or "").strip()
        if not keys:
            return JSONResponse({"error": "keys required"}, status_code=400)
        
        try:
            ps_run(f'[System.Windows.Forms.SendKeys]::SendWait("{keys}")')
            return {"ok": True}
        except Exception as e:
            return JSONResponse({"error": f"send keys failed: {e}"}, status_code=500)
    
    @app.post("/local/mouse")
    async def local_mouse(req: Request):
        """
        Simulate mouse movement or clicks via PowerShell.
        
        Parameters:
        - req (Request): JSON with 'x', 'y', and optional 'click' boolean.
        
        Returns:
        - dict: {ok} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        x = data.get("x")
        y = data.get("y")
        click = data.get("click", False)
        
        if x is None or y is None:
            return JSONResponse({"error": "x and y required"}, status_code=400)
        
        try:
            ps_run(f'[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point({x},{y})')
            if click:
                ps_run('[System.Windows.Forms.SendKeys]::SendWait("{LEFTCLICK}")')
            return {"ok": True}
        except Exception as e:
            return JSONResponse({"error": f"mouse action failed: {e}"}, status_code=500)
    
    @app.post("/local/app")
    async def local_app(req: Request):
        """
        Launch an application via PowerShell.
        
        Parameters:
        - req (Request): JSON with 'path' to executable.
        
        Returns:
        - dict: {ok} on success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        path = (data.get("path") or "").strip()
        if not path:
            return JSONResponse({"error": "path required"}, status_code=400)
        
        try:
            subprocess.Popen(path, shell=True)
            return {"ok": True}
        except Exception as e:
            return JSONResponse({"error": f"launch app failed: {e}"}, status_code=500)