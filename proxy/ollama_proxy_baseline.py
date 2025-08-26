# ollama_proxy.py — Zandalee Gateway (baseline working build)
# - Proxies Ollama (Salad) /api/*
# - SAPI voice (/local/voices, /local/speak)
# - Memories (JSONL), Diary (JSONL)
# - Uploads (/local/upload) + Docs listing (/local/docs)
# - Mic Wizard (stub) endpoints
# - PC control (/local/keys, /local/mouse, /local/app)
# - Minimal WebSocket at /ws
# - Voice metrics stub for UI compatibility
# - Serves UI at /app (and mounts /assets), clean fallback at /
# - Reads salad_config.json with UTF-8-SIG (tolerates BOM)
# - UI path can be overridden with ZANDALEE_UI_DIR

import os
import sys
import json
import uuid
import asyncio
import subprocess
import datetime as _dt
from typing import Optional, List
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import (
    JSONResponse, PlainTextResponse, HTMLResponse, RedirectResponse
)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# -------------------- Paths & Data Dirs --------------------

BASE_DIR = os.path.dirname(__file__)
HOME = os.environ.get("ZANDALEE_HOME") or os.path.join(os.path.expanduser("~"), "Documents", "Zandalee")
os.makedirs(HOME, exist_ok=True)

DATA_DIR = os.path.join(HOME, "data")
DOCS_DIR = os.path.join(DATA_DIR, "docs")
MEM_PATH = os.path.join(DATA_DIR, "memories.jsonl")
DIARY_PATH = os.path.join(DATA_DIR, "diary.jsonl")
AUDIO_CFG_PATH = os.path.join(DATA_DIR, "audio.json")
CFG_PATH = os.path.join(BASE_DIR, "salad_config.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)

# -------------------- Helpers --------------------

def load_cfg() -> dict:
    cfg = {}
    try:
        with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        cfg = {}
    except Exception as e:
        raise RuntimeError(f"Cannot read salad_config.json: {e}")

    cfg.setdefault("base", "")
    cfg.setdefault("apiKey", "")
    cfg.setdefault("model", "qwen2.5-coder:32b")
    cfg.setdefault("voiceBackend", "sapi")
    cfg.setdefault("voiceBase", "http://127.0.0.1:8759")
    return cfg

def save_cfg(patch: dict) -> dict:
    cfg = {}
    try:
        if os.path.exists(CFG_PATH):
            with open(CFG_PATH, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
    except Exception:
        cfg = {}
    cfg.update({k: v for k, v in (patch or {}).items() if v is not None})
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg

def ps_run(code: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", code],
        input=stdin or "",
        capture_output=True,
        text=True,
    )

def _jsonl_append(path: str, obj: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def _jsonl_read_all(path: str) -> List[dict]:
    if not os.path.exists(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            try:
                out.append(json.loads(s))
            except Exception:
                continue
    return out

# -------------------- FastAPI App --------------------

app = FastAPI(title="Zandalee Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Voice metrics stubs (UI compatibility) --------------------

@app.get("/voice/metrics")
async def voice_metrics():
    return {
        "speaking": False,
        "rms": 0.0,
        "peak": 0.0,
        "latency_ms": 0,
        "timestamp": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

@app.post("/voice/stop")
async def voice_stop():
    return {"ok": True}

# -------------------- Health --------------------

@app.get("/health")
async def health():
    return {"ok": True, "msg": "Zandalee gateway online."}

# -------------------- Config --------------------

@app.get("/config")
async def get_config():
    try:
        return load_cfg()
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/config")
async def set_config(req: Request):
    data = await req.json()
    try:
        cfg = save_cfg(data)
        return {"ok": True, "config": cfg}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# -------------------- Ollama on Salad Proxy --------------------

async def _forward(method: str, path: str, body: Optional[bytes] = None, json_obj: Optional[dict] = None):
    try:
        cfg = load_cfg()
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    base = (cfg.get("base") or "").rstrip("/")
    key = cfg.get("apiKey") or ""
    if not base:
        return JSONResponse({"error": "Salad base URL not configured."}, status_code=400)
    if not key and path != "/api/tags":
        return JSONResponse({"error": "Salad API key not configured."}, status_code=401)

    url = f"{base}{path}"
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Salad-Api-Key"] = key

    try:
        async with httpx.AsyncClient(timeout=None) as c:
            if json_obj is not None:
                r = await c.request(method, url, json=json_obj, headers=headers)
            else:
                r = await c.request(method, url, content=body, headers=headers)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Upstream request failed: {str(e)}"}, status_code=502)

    ct = (r.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        try:
            return JSONResponse(r.json(), status_code=r.status_code)
        except Exception:
            return PlainTextResponse(r.text, status_code=r.status_code)
    return PlainTextResponse(r.text, status_code=r.status_code)

@app.get("/api/tags")
async def tags():
    return await _forward("GET", "/api/tags")

@app.post("/api/pull")
async def pull(req: Request):
    return await _forward("POST", "/api/pull", json_obj=await req.json())

@app.post("/api/chat")
async def chat(req: Request):
    cfg = load_cfg()
    data = await req.json()
    if "model" not in data or not data.get("model"):
        data["model"] = cfg.get("model") or "qwen2.5-coder:32b"
    data.setdefault("stream", False)
    return await _forward("POST", "/api/chat", json_obj=data)

# -------------------- Local Voice (SAPI) --------------------

@app.get("/local/voices")
async def list_voices():
    ps = r"""
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices().VoiceInfo | Select-Object -ExpandProperty Name
"""
    r = ps_run(ps)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)
    names = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    return {"voices": names}

@app.post("/local/speak")
async def local_speak(req: Request):
    data = await req.json()
    text  = (data.get("text") or "").strip()
    if not text:
        return JSONResponse({"error": "No text provided."}, status_code=400)
    rate  = int(data.get("rate", 0))
    vol   = int(data.get("volume", 100))
    voice = (data.get("voice") or "").strip().replace('"', '`"')
    ps_lines = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        f"$s.Rate = {rate}; $s.Volume = {vol};",
        "$t = [Console]::In.ReadToEnd();",
    ]
    if voice:
        ps_lines.append(f'$s.SelectVoice("{voice}") | Out-Null;')
    ps_lines.append("$s.Speak($t);")
    r = ps_run(" ".join(ps_lines), stdin=text)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)
    return {"ok": True}

# -------------------- Memories (JSONL) --------------------

@app.post("/memory/learn")
async def memory_learn(req: Request):
    data = await req.json()
    now = _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    rec = {
        "id": str(uuid.uuid4()),
        "text": (data.get("text") or "").strip(),
        "kind": data.get("kind") or "semantic",
        "importance": float(data.get("importance") or 0.5),
        "relevance": float(data.get("relevance") or 0.5),
        "tags": data.get("tags") or [],
        "source": data.get("source") or "chat",
        "emotion": data.get("emotion") or None,
        "photo_path": data.get("photo_path") or None,
        "audio_path": data.get("audio_path") or None,
        "trust": data.get("trust") or "observed",
        "version": int(data.get("version") or 1),
        "created_at": now,
        "expires_at": data.get("expires_at"),
    }
    if not rec["text"]:
        return JSONResponse({"error": "No memory text."}, status_code=400)
    _jsonl_append(MEM_PATH, rec)
    return {"ok": True, "id": rec["id"]}

@app.get("/memory/search")
async def memory_search(q: Optional[str] = None, limit: int = 50):
    items = list(reversed(_jsonl_read_all(MEM_PATH)))
    qn = (q or "").strip().lower()
    if qn:
        items = [m for m in items if qn in (m.get("text", "") or "").lower()]
    return {"results": items[:max(1, min(limit, 500))]}

# -------------------- Diary (JSONL) --------------------

def _diary_write(rec: dict):
    os.makedirs(os.path.dirname(DIARY_PATH), exist_ok=True)
    with open(DIARY_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

def _diary_read_all():
    return _jsonl_read_all(DIARY_PATH)

@app.post("/diary/append")
async def diary_append(req: Request):
    data = await req.json()
    now  = _dt.datetime.utcnow()
    rec = {
        "id": str(uuid.uuid4()),
        "day": now.strftime("%Y-%m-%d"),
        "text": (data.get("text") or "").strip(),
        "photos": [data.get("photo_path")] if data.get("photo_path") else [],
        "emotions": [data.get("emotion")] if data.get("emotion") else [],
        "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if not rec["text"]:
        return JSONResponse({"error": "No diary text."}, status_code=400)
    _diary_write(rec)
    return {"ok": True, "id": rec["id"], "day": rec["day"]}

@app.post("/diary/rollup")
async def diary_rollup(req: Request):
    data = await req.json()
    period = (data.get("period") or "daily").lower()
    items = _diary_read_all()
    if not items:
        return {"ok": True, "period": period, "text": "No diary entries yet."}

    def week_key(dt: _dt.datetime): return f"{dt.year}-W{dt.isocalendar()[1]:02d}"
    def month_key(dt: _dt.datetime): return f"{dt.year}-{dt.month:02d}"

    buckets = {}
    for rec in items:
        try:
            dt = _dt.datetime.strptime(rec.get("created_at",""), "%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            continue
        if period == "daily":
            k = rec.get("day")
        elif period == "weekly":
            k = week_key(dt)
        else:
            k = month_key(dt)
        buckets.setdefault(k, []).append(rec)

    lines = [f"# {period.capitalize()} Rollup", ""]
    for k in sorted(buckets.keys(), reverse=True):
        group = buckets[k]
        lines.append(f"## {k} — {len(group)} entries")
        for g in group[-10:]:
            preview = (g["text"][:120] + "…") if len(g["text"]) > 120 else g["text"]
            lines.append(f"- {g['created_at']}: {preview}")
        lines.append("")
    return {"ok": True, "period": period, "text": "\n".join(lines)}

# -------------------- Uploads & Docs --------------------

@app.post("/local/upload")
async def local_upload(files: List[UploadFile] = File(...)):
    saved = []
    os.makedirs(DOCS_DIR, exist_ok=True)
    for f in files:
        name = os.path.basename(f.filename)
        base, ext = os.path.splitext(name)
        unique = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
        dest = os.path.join(DOCS_DIR, unique)
        with open(dest, "wb") as out:
            out.write(await f.read())
        saved.append({"name": name, "path": dest})
    return {"ok": True, "files": saved}

@app.get("/local/docs")
async def list_docs():
    out = []
    if os.path.isdir(DOCS_DIR):
        for root, _, files in os.walk(DOCS_DIR):
            for fn in files:
                fp = os.path.join(root, fn)
                try:
                    size = os.path.getsize(fp)
                except OSError:
                    size = 0
                out.append({"name": fn, "path": fp, "size": size})
    return {"docs": out}

# -------------------- Mic Wizard (stub) --------------------

def _audio_cfg_read():
    try:
        with open(AUDIO_CFG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _audio_cfg_write(patch: dict):
    cfg = _audio_cfg_read()
    cfg.update(patch or {})
    os.makedirs(os.path.dirname(AUDIO_CFG_PATH), exist_ok=True)
    with open(AUDIO_CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg

@app.get("/mic/list")
async def mic_list():
    current = _audio_cfg_read().get("device_id")
    devices = [
        {"id": 1, "name": "Default PC Microphone", "channels": 1, "default": True},
        {"id": 2, "name": "USB Mic (stub)", "channels": 1},
    ]
    return {"devices": devices, "chosen": current}

@app.post("/mic/wizard")
async def mic_wizard():
    results = [
        {"id": 1, "name": "Default PC Microphone", "snr_db": 24.2, "voiced_ratio": 0.83, "start_delay_ms": 120, "clipping_pct": 0.0, "score": 0.78},
        {"id": 2, "name": "USB Mic (stub)",         "snr_db": 28.1, "voiced_ratio": 0.80, "start_delay_ms": 150, "clipping_pct": 0.0, "score": 0.80},
    ]
    chosen = max(results, key=lambda r: r["score"])
    _audio_cfg_write({"device_id": chosen["id"]})
    return {"ok": True, "results": results, "chosen": chosen, "persisted": True}

@app.post("/mic/use")
async def mic_use(req: Request):
    did = int((await req.json()).get("id", 0))
    if not did:
        return JSONResponse({"error": "missing id"}, status_code=400)
    _audio_cfg_write({"device_id": did})
    return {"ok": True, "id": did}

# -------------------- Voice Input (stub for now) --------------------

@app.post("/voice/listen")
async def voice_listen():
    # Placeholder for Whisper/VAD pipeline
    return JSONResponse({"ok": False, "error": "voice/listen not implemented yet"}, status_code=501)

# -------------------- PC Control: Keys / Mouse / App --------------------

@app.post("/local/keys")
async def local_keys(req: Request):
    """
    Body examples:
      { "keys": "^a" }                     # Ctrl+A
      { "text": "Hello from Zandalee!" }   # literal text
      { "sequence": ["^a", "{DEL}", "hi"] }
    Uses .NET SendKeys (foreground window).
    """
    data = await req.json()
    seq = []
    if "sequence" in data and isinstance(data["sequence"], list):
        seq = [str(x) for x in data["sequence"]]
    elif "keys" in data:
        seq = [str(data["keys"])]
    elif "text" in data:
        seq = [str(data["text"])]
    else:
        return JSONResponse({"error": "provide 'keys', 'text', or 'sequence'."}, status_code=400)

    script = r"""
Add-Type -AssemblyName System.Windows.Forms
$seq = @(%s)
foreach ($s in $seq) { [System.Windows.Forms.SendKeys]::SendWait($s) }
""" % (", ".join('"{0}"'.format(s.replace('"','`"')) for s in seq))
    r = ps_run(script)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)
    return {"ok": True, "sent": seq}

@app.post("/local/mouse")
async def local_mouse(req: Request):
    """
    Body examples:
      { "move": { "dx": 50, "dy": 0 } }
      { "pos": { "x": 800, "y": 500 } }
      { "click": "left" }   # left/right/middle
      { "double": true, "click": "left" }
    """
    data = await req.json()
    move = data.get("move")
    pos  = data.get("pos")
    click= (data.get("click") or "").lower()
    double = bool(data.get("double", False))

    ps = r'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseOps {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  public const uint MOVE=0x0001, LEFTDOWN=0x0002, LEFTUP=0x0004, RIGHTDOWN=0x0008, RIGHTUP=0x0010, MIDDLEDOWN=0x0020, MIDDLEUP=0x0040;
}
"@
$pos = [System.Windows.Forms.Cursor]::Position
'''
    if pos and "x" in pos and "y" in pos:
        ps += f'[MouseOps]::SetCursorPos({int(pos["x"])}, {int(pos["y"])});'
    if move and ("dx" in move or "dy" in move):
        dx = int(move.get("dx", 0)); dy = int(move.get("dy", 0))
        ps += f'[MouseOps]::mouse_event([MouseOps]::MOVE, {dx}, {dy}, 0, [UIntPtr]::Zero);'
    def click_code(btn:str):
        if btn=="left":   return "[MouseOps]::mouse_event([MouseOps]::LEFTDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::LEFTUP,0,0,0,[UIntPtr]::Zero);"
        if btn=="right":  return "[MouseOps]::mouse_event([MouseOps]::RIGHTDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::RIGHTUP,0,0,0,[UIntPtr]::Zero);"
        if btn=="middle": return "[MouseOps]::mouse_event([MouseOps]::MIDDLEDOWN,0,0,0,[UIntPtr]::Zero); [MouseOps]::mouse_event([MouseOps]::MIDDLEUP,0,0,0,[UIntPtr]::Zero);"
        return ""
    if click in ("left","right","middle"):
        ps += click_code(click)
        if double:
            ps += click_code(click)
    r = ps_run(ps)
    if r.returncode != 0:
        return JSONResponse({"error": r.stderr}, status_code=500)
    return {"ok": True}

ALLOWED_APPS = {
    "notepad": "notepad.exe",
    "calc": "calc.exe",
    "explorer": "explorer.exe",
    "vscode": "code",            # assumes VS Code on PATH
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    # add more as needed
}

@app.post("/local/app")
async def local_app(req: Request):
    """
    Body example:
      { "name": "vscode", "args": "", "cwd": "C:\\path\\to\\project" }
      { "path": "C:\\Windows\\System32\\notepad.exe", "args": "C:\\temp\\a.txt" }
    """
    data = await req.json()
    name = (data.get("name") or "").lower()
    path = data.get("path")
    args = (data.get("args") or "").strip()
    cwd  = (data.get("cwd") or "").strip() or None

    # Resolve executable
    if path:
        exe = path
        if not os.path.exists(exe):
            return JSONResponse({"error": f"path not found: {exe}"}, status_code=400)
    else:
        exe = ALLOWED_APPS.get(name)
        if not exe:
            return JSONResponse({"error": f"app not allowed: {name}"}, status_code=403)

    # Escape for PowerShell once, outside the f-string to avoid quoting traps
    exe_esc  = exe.replace('"', '`"')
    args_esc = args.replace('"', '`"') if args else ""
    cwd_esc  = cwd.replace('"', '`"') if cwd else None

    # Build Start-Process command safely
    ps_parts = [f'$exe = "{exe_esc}";']
    if cwd_esc:
        ps_parts.append(f'$wd = "{cwd_esc}";')
    if args_esc:
        ps_parts.append(f'$args = "{args_esc}";')
        cmd = 'Start-Process -FilePath $exe -ArgumentList $args'
    else:
        cmd = 'Start-Process -FilePath $exe'
    if cwd_esc:
        cmd += ' -WorkingDirectory $wd'
    ps_parts.append(cmd + ';')
    ps_script = " ".join(ps_parts)

    try:
        r = ps_run(ps_script)
        if r.returncode != 0:
            return JSONResponse({"error": r.stderr}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

    return {"ok": True, "launched": exe, "args": args, "cwd": cwd}

# -------------------- WebSocket (minimal) --------------------

@app.websocket("/ws")
async def ws_handler(ws: WebSocket):
    await ws.accept()
    try:
        await ws.send_json({"type": "hello", "ok": True})
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=2.0)
                await ws.send_json({"type": "echo", "text": msg})
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat", "ok": True})
    except WebSocketDisconnect:
        pass

# -------------------- Static UI (auto-detect; mounts /app and /assets) --------------------

def _has_index(path: Path) -> bool:
    return path.is_dir() and (path / "index.html").exists()

def _resolve_ui_dir() -> Optional[Path]:
    # 1) env override
    env_dir = os.environ.get("ZANDALEE_UI_DIR")
    if env_dir:
        p = Path(env_dir)
        if _has_index(p):
            return p

    # 2) PyInstaller bundle (added via --add-data "<dist>;ui_dist")
    try:
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        p = base / "ui_dist"
        if _has_index(p):
            return p
    except Exception:
        pass

    # 3) repo fallbacks
    root = Path(BASE_DIR).parent  # ...\Zandalee
    for cand in [root / "ui" / "app" / "dist", root / "ui" / "dist"]:
        if _has_index(cand):
            return cand

    return None

UI_DIR = _resolve_ui_dir()

@app.get("/ui-info")
async def ui_info():
    cands = []
    if os.environ.get("ZANDALEE_UI_DIR"):
        cands.append(os.environ["ZANDALEE_UI_DIR"])
    root = Path(BASE_DIR).parent
    cands += [str(root / "ui" / "app" / "dist"), str(root / "ui" / "dist")]
    try:
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        cands.append(str(base / "ui_dist"))
    except Exception:
        pass
    return {
        "ui_ok": bool(UI_DIR and (UI_DIR / "index.html").exists()),
        "ui_path": str(UI_DIR) if UI_DIR else None,
        "candidates": cands,
        "has_index": bool(UI_DIR and (UI_DIR / "index.html").exists()),
    }

@app.get("/", include_in_schema=False)
async def root():
    if UI_DIR and (UI_DIR / "index.html").exists():
        return RedirectResponse(url="/app/")
    # No UI found – show instructions
    lines = []
    lines.append("<!doctype html><html><head><meta charset='utf-8'><title>Zandalee Gateway</title></head>")
    lines.append("<body style='font-family:Segoe UI,Arial,sans-serif; padding:24px; line-height:1.5'>")
    lines.append("<h1>🟢 Zandalee gateway is running</h1>")
    lines.append("<p>No UI build found yet.</p>")
    lines.append("<h3>Looked in</h3><pre>")
    lines.append("\n".join([str(Path(BASE_DIR).parent / "ui" / "app" / "dist"),
                            str(Path(BASE_DIR).parent / "ui" / "dist"),
                            os.environ.get("ZANDALEE_UI_DIR","(none)"),
                            "(PyInstaller: ui_dist)"]))
    lines.append("</pre>")
    lines.append("</body></html>")
    return HTMLResponse("\n".join(lines), status_code=200)

@app.get("/app/", response_class=HTMLResponse)
async def serve_app_index():
    if not (UI_DIR and (UI_DIR / "index.html").exists()):
        return HTMLResponse("<h1>UI not found</h1>", status_code=404)
    html = (UI_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html, status_code=200, headers={"Cache-Control": "no-store"})

# Mount static assets at BOTH /assets and /app/assets (cover all index.html path styles)
if UI_DIR and (UI_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="assets")
    app.mount("/app/assets", StaticFiles(directory=str(UI_DIR / "assets")), name="appassets")

# -------------------- Main --------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=11500)
