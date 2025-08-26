import time
import psutil
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from .config import load_cfg, AUDIO_CFG_PATH
from .utils import _json_read, ps_run

def register_routes(app: FastAPI):
    """Register status and UI-related routes on the FastAPI app."""
    
    @app.get("/status")
    async def status():
        """
        Get server status and configuration.
        
        Returns:
        - dict: System status and configuration.
        """
        cfg = load_cfg()
        audio = _json_read(AUDIO_CFG_PATH, {})
        return {
            "ok": True,
            "uptime": int(time.time() - psutil.Process().create_time()),
            "config": {
                "base": cfg.get("base", ""),
                "model": cfg.get("model", ""),
                "voiceBackend": cfg.get("voiceBackend", ""),
                "micEnabled": audio.get("enabled", False)
            }
        }
    
    @app.get("/ui-info")
    async def ui_info():
        """
        Get UI-related information.
        
        Returns:
        - dict: UI paths and status.
        """
        return {
            "ok": True,
            "uiDir": str(os.environ.get("ZANDALEE_UI_DIR", "not set")),
            "hasUI": bool(os.environ.get("ZANDALEE_UI_DIR") and os.path.exists(os.environ.get("ZANDALEE_UI_DIR")))
        }
    
    @app.get("/local/pc-info")
    async def local_pc_info():
        """
        Get PC system information via PowerShell.
        
        Returns:
        - dict: System information (OS, CPU, memory).
        """
        try:
            r = ps_run("Get-ComputerInfo | ConvertTo-Json")
            return json.loads(r.stdout)
        except Exception as e:
            return JSONResponse({"error": f"pc info failed: {e}"}, status_code=500)