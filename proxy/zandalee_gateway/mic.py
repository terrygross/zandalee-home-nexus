import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .config import AUDIO_CFG_PATH
from .utils import _json_read, _json_write

def register_routes(app: FastAPI):
    """Register microphone-related routes on the FastAPI app."""
    
    @app.get("/mic/config")
    async def mic_config():
        """
        Get microphone configuration.
        
        Returns:
        - dict: Current audio configuration.
        """
        return _json_read(AUDIO_CFG_PATH, {})
    
    @app.post("/mic/config")
    async def mic_config_update(req: Request):
        """
        Update microphone configuration.
        
        Parameters:
        - req (Request): JSON with configuration settings.
        
        Returns:
        - dict: Updated configuration.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        cfg = _json_read(AUDIO_CFG_PATH, {})
        cfg.update(data)
        _json_write(AUDIO_CFG_PATH, cfg)
        return cfg
    
    @app.post("/mic/toggle")
    async def mic_toggle(req: Request):
        """
        Toggle microphone on/off.
        
        Parameters:
        - req (Request): JSON with 'enabled' boolean.
        
        Returns:
        - dict: {ok, enabled} indicating current state.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        enabled = bool(data.get("enabled", False))
        cfg = _json_read(AUDIO_CFG_PATH, {})
        cfg["enabled"] = enabled
        cfg["toggled_at"] = int(time.time())
        _json_write(AUDIO_CFG_PATH, cfg)
        return {"ok": True, "enabled": enabled}