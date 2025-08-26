import asyncio
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .config import load_cfg
from .utils import extract_prompt, clean_for_tts, extract_model_text

async def speak_async(text: str):
    """Send text to local TTS endpoint."""
    if not text:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            await c.post("http://127.0.0.1:11500/local/speak_ps_ps", json={"text": text})
    except Exception as e:
        print(f"[tts] speak failed: {e}")

def register_routes(app: FastAPI):
    """Register chat and TTS-related routes on the FastAPI app."""
    
    @app.post("/speak")
    async def speak_entry(req: Request):
        """
        Handle chat+TTS: extract prompt, call Salad API, speak response.
        
        Parameters:
        - req (Request): Expected JSON with 'text', 'message', or 'content' field.
        
        Returns:
        - dict: {ok, mode, spoken} indicating success, mode (chat+tts or tts-only), and spoken text.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        raw = (data.get("text") or data.get("message") or data.get("content") or "").strip()
        if not raw:
            return JSONResponse({"error": "text required"}, status_code=400)
        
        cfg = load_cfg()
        base = cfg.get("base", "").rstrip("/")
        key = cfg.get("apiKey", "")
        model = cfg.get("model", "qwen2.5-coder:32b")
        
        prompt = extract_prompt(raw)
        if prompt and base:
            headers = {"Content-Type": "application/json"}
            if key:
                headers["Salad-Api-Key"] = key
            payload = {
                "model": model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": "Answer clearly and briefly. No code unless asked."},
                    {"role": "user", "content": prompt}
                ]
            }
            try:
                async with httpx.AsyncClient(timeout=45.0) as c:
                    r = await c.post(f"{base}/api/chat", headers=headers, json=payload)
                r.raise_for_status()
                reply = extract_model_text(r.json() or r.text)
                say = clean_for_tts(reply) or "Sorry, I couldnâ€™t generate a reply."
                await speak_async(say)
                print(f"[speak] chat+tts :: '{prompt[:60]}' -> '{say[:60]}'")
                return {"ok": True, "mode": "chat+tts", "spoken": say}
            except Exception as ex:
                print(f"[speak] chat failed: {ex}")
                say = clean_for_tts(raw) or "Okay."
                await speak_async(say)
                return {"ok": True, "mode": "tts-only", "spoken": say}
        else:
            say = clean_for_tts(raw) or "Okay."
            await speak_async(say)
            print(f"[speak] tts-only :: '{say[:60]}'")
            return {"ok": True, "mode": "tts-only", "spoken": say}
    
    @app.post("/api/chat")
    async def api_chat(req: Request):
        """
        Proxy chat requests to Salad API with TTS side-effect.
        
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
        
        headers = {"Content-Type": "application/json"}
        if key:
            headers["Salad-Api-Key"] = key
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as c:
                r = await c.post(f"{base}/api/chat", headers=headers, json=data)
            reply_text = extract_model_text(r.json() or r.text)
            if reply_text:
                asyncio.create_task(speak_async(clean_for_tts(reply_text)))
            try:
                return r.json()
            except Exception:
                return {"message": {"role": "assistant", "content": reply_text}}
        except Exception as e:
            print(f"[api/chat] error: {e}")
            return JSONResponse({"error": f"chat failed: {e}"}, status_code=502)
    
    @app.post("/chat")
    async def chat_compat(req: Request):
        """Deprecated: Forward to /api/chat."""
        print("[chat] Deprecated: Use /api/chat instead")
        return await api_chat(req)
    
    @app.post("/local/speak_ps")
    async def local_speak_raw(req: Request):
        """
        Minimal raw SAPI TTS. Caller must sanitize first.
        
        Parameters:
        - req (Request): JSON with 'text' field.
        
        Returns:
        - dict: {ok} indicating success.
        """
        try:
            data = await req.json()
        except Exception:
            data = {}
        text = (data.get("text") or "").strip()
        if not text:
            return JSONResponse({"error": "text required"}, status_code=400)
        
        ok = False
        try:
            import comtypes.client as cc
            loop = asyncio.get_event_loop()
            def _do_sapi():
                try:
                    v = cc.CreateObject("SAPI.SpVoice")
                    v.Speak(text)
                    return True
                except Exception as e:
                    print(f"[sapi] error: {e}")
                    return False
            ok = await loop.run_in_executor(None, _do_sapi)
        except Exception as e:
            print(f"[sapi] init error: {e}")
            ok = False
        
        print(f"[sapi] spoke_raw :: '{text[:60]}' ok={ok}")
        return {"ok": bool(ok)}
    
    @app.post("/local/speak_ps")
    async def local_speak_deprecated(req: Request):
        """Deprecated: Forward to /speak."""
        print("[local/speak] Deprecated: Use /speak instead")
        return await speak_entry(req)


