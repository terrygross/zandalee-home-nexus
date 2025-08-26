import sys
import time
import socket
import threading
import webbrowser
import uvicorn
import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from pathlib import Path
from .config import BASE_DIR, cfg_get
from . import chat, auth, permissions, memory, uploads, mic, pc_control, internet, shared, status, websocket
from .routers.api_proxy import router as api_router

app = FastAPI(title="Zandalee Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers from external modules
app.include_router(api_router)
chat.register_routes(app)
auth.register_routes(app)
permissions.register_routes(app)
memory.register_routes(app)
uploads.register_routes(app)
mic.register_routes(app)
pc_control.register_routes(app)
internet.register_routes(app)
shared.register_routes(app)
status.register_routes(app)
websocket.register_routes(app)

# Static UI serving
def _has_index(path: Path) -> bool:
    return path.is_dir() and (path / "index.html").exists()

def _resolve_ui_dir() -> Path | None:
    env_dir = os.environ.get("ZANDALEE_UI_DIR")
    if env_dir:
        p = Path(env_dir)
        if _has_index(p):
            return p
    try:
        base = Path(sys._MEIPASS)
        p = base / "ui_dist"
        if _has_index(p):
            return p
    except Exception:
        pass
    root = Path(BASE_DIR).parent
    for cand in [root / "ui" / "app" / "dist", root / "ui" / "dist"]:
        if _has_index(cand):
            return cand
    return None

UI_DIR = _resolve_ui_dir()

if UI_DIR and (UI_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="assets")
    app.mount("/app/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="appassets")

@app.get("/", include_in_schema=False)
async def root():
    """
    Redirect to /app/ if UI is available, else show status page.
    
    Returns:
    - RedirectResponse or HTMLResponse
    """
    if UI_DIR and (UI_DIR / "index.html").exists():
        return RedirectResponse(url="/app/")
    lines = [
        "<!doctype html><html><head><meta charset='utf-8'><title>Zandalee Gateway</title></head>",
        "<body style='font-family:Segoe UI,Arial,sans-serif; padding:24px; line-height:1.5'>",
        "<h1>ðŸŸ¢ Zandalee gateway is running</h1>",
        "<p>No UI build found yet.</p>",
        "<h3>Looked in</h3><pre>",
        "\n".join([
            str(Path(BASE_DIR).parent / "ui" / "app" / "dist"),
            str(Path(BASE_DIR).parent / "ui" / "dist"),
            os.environ.get("ZANDALEE_UI_DIR", "(none)"),
            "(PyInstaller: ui_dist)"
        ]),
        "</pre>",
        "</body></html>"
    ]
    return HTMLResponse("\n".join(lines), status_code=200)

@app.get("/app/", response_class=HTMLResponse)
async def serve_app_index():
    """
    Serve the UI index.html if available.
    
    Returns:
    - HTMLResponse: UI page or 404 if not found.
    """
    if not (UI_DIR and (UI_DIR / "index.html").exists()):
        return HTMLResponse("<h1>UI not found</h1>", status_code=404)
    html = (UI_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html, status_code=200, headers={"Cache-Control": "no-store"})

if __name__ == "__main__":
    HOST = "127.0.0.1"
    PORT = 11500
    URL = f"http://{HOST}:{PORT}/app/?v={uuid.uuid4().hex[:8]}"

    def _port_in_use(host: str, port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.25)
            return s.connect_ex((host, port)) == 0

    if _port_in_use(HOST, PORT):
        try:
            webbrowser.open(URL)
        finally:
            sys.exit(0)

    def _open_ui():
        time.sleep(0.8)
        try:
            webbrowser.open(URL)
        except Exception:
            pass

    threading.Thread(target=_open_ui, daemon=True).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")@app.get("/health")
async def health():
    return {"ok": True, "msg": "Zandalee gateway online."}
@app.get("/health")
async def health():
    return {"ok": True, "msg": "Zandalee gateway online."}
@app.get("/audit/superadmin")
async def audit_superadmin(limit: int = 50, shape: str = "array"):
    items = []
    items = items[:max(1, min(int(limit or 50), 200))]
    if (shape or "").lower() == "object":
        return {"ok": True, "items": items}
    return items

@app.post("/audit/superadmin/ack")
async def audit_superadmin_ack():
    return {"ok": True}


# === Reliable PowerShell TTS endpoint ===
from fastapi import Request
import subprocess as _subprocess

@app.post("/local/speak_ps")
async def local_speak_ps(req: Request):
    try:
        data = await req.json()
    except Exception:
        data = {}
    text  = (data.get("text") or data.get("message") or data.get("content") or "").strip()
    rate  = int(data.get("rate", 0))
    vol   = int(data.get("volume", 100))
    if not text:
        return JSONResponse({"error":"text required"}, status_code=400)

    # PowerShell: System.Speech
    ps = f"""
Add-Type -AssemblyName System.Speech;
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$s.Rate = {rate}; $s.Volume = {vol};
$t = [Console]::In.ReadToEnd();
$s.Speak($t);
"""
    try:
        r = _subprocess.run(
            ["powershell","-NoProfile","-ExecutionPolicy","Bypass","-Command", ps],
            input=text, capture_output=True, text=True
        )
        ok = (r.returncode == 0)
        if not ok:
            print(f"[speak_ps] ERR: {r.stderr}")
        return {"ok": ok}
    except Exception as e:
        print(f"[speak_ps] Exception: {e}")
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)



# === RESTORED VOICE ENDPOINTS ===
from fastapi import Request
from fastapi.responses import JSONResponse
import subprocess

def _ps_speak(text: str, rate: int = 0, volume: int = 100, voice: str = "") -> tuple[bool,str]:
    ps_lines = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        f"$s.Rate = {rate}; $s.Volume = {volume};",
        "$t = [Console]::In.ReadToEnd();",
    ]
    if voice:
        v = voice.replace('"','`"')
        ps_lines.append(f'$s.SelectVoice("{v}") | Out-Null;')
    ps_lines.append("$s.Speak($t);")
    cmd = " ".join(ps_lines)
    r = subprocess.run(["powershell","-NoProfile","-ExecutionPolicy","Bypass","-Command", cmd],
                       input=text or "", text=True, capture_output=True)
    return (r.returncode == 0, r.stderr)

@app.post("/local/speak")
async def _route_local_speak(req: Request):
    try:
        data = await req.json()
    except Exception:
        data = {}
    text  = (data.get("text") or data.get("message") or data.get("content") or "").strip()
    if not text:
        return JSONResponse({"error":"text required"}, status_code=400)
    ok, err = _ps_speak(text, rate=int(data.get("rate",0)), volume=int(data.get("volume",100)), voice=(data.get("voice") or ""))
    if not ok:
        return JSONResponse({"ok": False, "error": err}, status_code=500)
    return {"ok": True}

@app.post("/local/_speak_raw")
async def _route_local_speak_raw(req: Request):
    try:
        data = await req.json()
    except Exception:
        data = {}
    text = (data.get("text") or "").strip()
    if not text:
        return JSONResponse({"error":"text required"}, status_code=400)
    ok, err = _ps_speak(text)
    if not ok:
        return JSONResponse({"ok": False, "error": err}, status_code=500)
    return {"ok": True}
# === END VOICE ===
