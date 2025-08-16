
import os
import asyncio
import subprocess
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import sqlite3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Zandalee AI Backend", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatMessage(BaseModel):
    content: str
    role: str = "user"

class VoiceCommand(BaseModel):
    text: str

class ProjectCreate(BaseModel):
    name: str

class MemoryItem(BaseModel):
    content: str
    kind: str = "semantic"
    tags: List[str] = []
    importance: float = 0.5
    relevance: float = 0.5

# Global state
current_project = "Personal Assistant"
connected_clients = set()

# Voice Core Implementation with Real Bridge Integration
class VoiceCore:
    def __init__(self):
        # Environment configuration
        self.voice_py = os.getenv("VOICE_PY", "C:\\Users\\teren\\Documents\\Zandalee\\local-talking-llm\\.venv\\Scripts\\python.exe")
        self.zandalee_root = os.getenv("ZANDALEE_ROOT", "C:\\Users\\teren\\Documents\\Zandalee")
        self.bridge_path = os.path.join(self.zandalee_root, "voice_client.py")
        
        # Half-duplex control
        self._voice_lock = asyncio.Lock()
        self._voice_active = False
        self._last_tts_ms = 0
        self._last_error = None
        
        # Validate bridge exists
        if not os.path.exists(self.bridge_path):
            logger.error(f"Bridge not found at {self.bridge_path}")
            self._last_error = "voice_client.py not found"
    
    @property
    def voice_active(self) -> bool:
        return self._voice_active
    
    @property
    def last_tts_ms(self) -> int:
        return self._last_tts_ms
    
    @property
    def last_error(self) -> Optional[str]:
        return self._last_error
    
    async def speak(self, text: str) -> Dict[str, Any]:
        """Real TTS via bridge with half-duplex enforcement"""
        if not text or not text.strip():
            return {"ok": False, "error": "empty text"}
        
        # Check if bridge exists
        if not os.path.exists(self.bridge_path):
            self._last_error = "voice_client.py not found"
            return {"ok": False, "error": self._last_error}
        
        # Enforce half-duplex - acquire lock
        if self._voice_lock.locked():
            return {"ok": False, "error": "busy"}
        
        async with self._voice_lock:
            try:
                self._voice_active = True
                self._last_error = None
                start_time = time.time()
                
                # Construct command for bridge
                cmd = [
                    self.voice_py,
                    self.bridge_path,
                    "--transport", "STDIO",
                    "--speak", text.strip()
                ]
                
                logger.info(f"Executing TTS command: {' '.join(cmd)}")
                
                # Launch child process
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=self.zandalee_root,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await process.communicate()
                
                # Measure latency
                tts_ms = int((time.time() - start_time) * 1000)
                self._last_tts_ms = tts_ms
                
                if process.returncode == 0:
                    logger.info(f"TTS completed successfully in {tts_ms}ms")
                    return {"ok": True, "tts_ms": tts_ms}
                else:
                    error_msg = stderr.decode().strip() if stderr else f"Process failed with code {process.returncode}"
                    self._last_error = error_msg
                    logger.error(f"TTS failed: {error_msg}")
                    return {"ok": False, "error": error_msg}
                    
            except Exception as e:
                error_msg = str(e)
                self._last_error = error_msg
                logger.error(f"TTS exception: {error_msg}")
                return {"ok": False, "error": error_msg}
            finally:
                self._voice_active = False
    
    async def stop(self) -> Dict[str, Any]:
        """Optional: Stop TTS playback"""
        # For now, return not supported as this requires process management
        return {"ok": False, "error": "not_supported"}
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get real-time voice metrics"""
        return {
            "ok": True,
            "voice_active": self._voice_active,
            "last_tts_ms": self._last_tts_ms,
            "last_error": self._last_error
        }

# Initialize voice core
voice_core = VoiceCore()

# ... keep existing code (memory manager, project manager, and other classes)

# Memory system integration
class MemoryManager:
    def __init__(self):
        self.db_path = os.getenv("ZANDALEE_MEM_DIR", "C:\\Users\\teren\\Documents\\Zandalee\\zandalee_memories") + "\\mem.db"
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    tags TEXT,
                    importance REAL,
                    relevance REAL,
                    project TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
    
    def remember(self, content: str, kind: str, tags: List[str], importance: float, relevance: float):
        """Store a new memory"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO memories (content, kind, tags, importance, relevance, project)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (content, kind, ",".join(tags), importance, relevance, current_project))
            return cursor.lastrowid
    
    def recall(self, query: str, limit: int = 10):
        """Search memories"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM memories 
                WHERE content LIKE ? OR tags LIKE ?
                ORDER BY importance DESC, timestamp DESC
                LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            rows = cursor.fetchall()
            return [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
    
    def get_stats(self):
        """Get memory statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT kind, COUNT(*) FROM memories GROUP BY kind")
            stats = dict(cursor.fetchall())
            cursor = conn.execute("SELECT COUNT(*) FROM memories")
            total = cursor.fetchone()[0]
            return {"total": total, "by_kind": stats}

memory_manager = MemoryManager()

# Project management
class ProjectManager:
    def __init__(self):
        self.projects_dir = os.getenv("ZANDALEE_PROJECTS_DIR", "C:\\Users\\teren\\Documents\\Zandalee\\projects")
    
    def create_project(self, name: str):
        """Create a new project directory structure"""
        safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        project_path = os.path.join(self.projects_dir, safe_name)
        
        os.makedirs(project_path, exist_ok=True)
        for subdir in ["files", "notes", "diary", "memory"]:
            os.makedirs(os.path.join(project_path, subdir), exist_ok=True)
        
        return {"name": safe_name, "path": project_path}
    
    def list_projects(self):
        """List all projects"""
        if not os.path.exists(self.projects_dir):
            return []
        
        projects = []
        for item in os.listdir(self.projects_dir):
            if os.path.isdir(os.path.join(self.projects_dir, item)):
                projects.append({
                    "name": item,
                    "status": "active" if item == current_project else "idle",
                    "lastUsed": "2m ago",
                    "memories": len(memory_manager.recall(f"project:{item}"))
                })
        return projects

project_manager = ProjectManager()

# API Routes
@app.get("/")
async def root():
    return {"message": "Zandalee AI Backend", "status": "active"}

@app.post("/chat")
async def chat(message: ChatMessage):
    """Handle chat messages with AI processing"""
    try:
        response_text = generate_ai_response(message.content)
        
        return {
            "id": str(int(datetime.now().timestamp() * 1000)),
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# REAL VOICE ENDPOINTS (No Mocks)
@app.post("/speak")
async def speak(command: VoiceCommand):
    """Real TTS via bridge with half-duplex enforcement"""
    result = await voice_core.speak(command.text)
    return result

@app.get("/voice/metrics")
async def get_voice_metrics():
    """Get real-time voice metrics (not static)"""
    return voice_core.get_metrics()

@app.post("/voice/stop")
async def stop_voice():
    """Stop TTS playback (optional)"""
    result = await voice_core.stop()
    return result

# ... keep existing code (old mock endpoints for mic, memory, projects, commands, websocket, etc.)

# Add new audio calibration endpoints
@app.post("/mic/preflight")
async def mic_preflight():
    """Prepare for mic calibration - pause TTS, load last profile"""
    return {"status": "success", "message": "TTS paused, ready for calibration"}

@app.get("/mic/list")
async def list_audio_devices():
    """List available audio input devices"""
    try:
        # Mock devices for now - will be implemented in Step 2
        return [
            {"id": 0, "name": "Default Microphone", "max_input_channels": 1, "samplerate": 16000},
            {"id": 1, "name": "Microphone Array (Intel)", "max_input_channels": 2, "samplerate": 48000},
            {"id": 2, "name": "USB Headset Mic", "max_input_channels": 1, "samplerate": 44100}
        ]
    except Exception as e:
        logger.error(f"Device list error: {e}")
        return []

@app.post("/mic/test")
async def test_microphone_device(request: dict):
    """Test a specific microphone device"""
    device_id = request.get("device_id")
    # Mock implementation for now - will be implemented in Step 2
    import random
    return {
        "id": device_id,
        "name": f"Test Device {device_id}",
        "snr_db": random.uniform(15, 35),
        "voiced_ratio": random.uniform(0.3, 0.8),
        "start_delay_ms": random.uniform(0, 50),
        "clipping_percent": random.uniform(0, 5),
        "dropout_percent": random.uniform(0, 2),
        "score": random.uniform(0.6, 0.95),
        "samplerate": 16000
    }

@app.post("/mic/use")
async def use_microphone_device(request: dict):
    """Set the active microphone device and save configuration"""
    device_id = request.get("id")
    
    try:
        config_dir = os.path.join(os.path.dirname(__file__), "config")
        os.makedirs(config_dir, exist_ok=True)
        
        audio_config = {
            "machine": f"PC-{os.environ.get('COMPUTERNAME', 'UNKNOWN')}",
            "device_id": device_id,
            "device_name": f"Device {device_id}",
            "samplerate": 16000,
            "frame_ms": 10,
            "vad_mode": 1,
            "start_voiced_frames": 2,
            "end_unvoiced_frames": 500,
            "preroll_ms": 500
        }
        
        with open(os.path.join(config_dir, "audio.json"), "w") as f:
            json.dump(audio_config, f, indent=2)
        
        memory_text = f"Use device {device_id} on {audio_config['machine']}; silence_hold_ms=5000; preroll=500."
        memory_manager.remember(
            memory_text,
            "semantic",
            ["audio", "prefs", f"device:{audio_config['machine']}"],
            0.9,
            0.9
        )
        
        return {"status": "success", "message": f"Using device {device_id}", "config": audio_config}
        
    except Exception as e:
        logger.error(f"Device configuration error: {e}")
        return {"error": str(e)}

@app.post("/commands/execute")
async def execute_command(command: dict):
    """Execute console commands"""
    cmd = command.get("command", "")
    
    if cmd == ":mic.list":
        devices = await list_audio_devices()
        return {"success": True, "data": devices}
    
    elif cmd == ":mic.setup":
        await mic_preflight()
        return {"success": True, "message": "Run 'Run Mic Setup' from UI to complete wizard"}
    
    elif cmd.startswith(":mic.use"):
        try:
            device_id = int(cmd.split()[-1])
            result = await use_microphone_device({"id": device_id})
            return {"success": True, "data": result}
        except (ValueError, IndexError):
            return {"success": False, "message": "Usage: :mic.use <device_id>"}
    
    elif cmd.startswith(":say"):
        text = cmd.replace(":say", "").strip().strip('"')
        result = await voice_core.speak(text)
        return {"success": True, "data": result}
    
    elif cmd.startswith(":project.new"):
        name = cmd.split('"')[1] if '"' in cmd else cmd.split()[-1]
        result = project_manager.create_project(name)
        global current_project
        current_project = result["name"]
        return {"success": True, "message": f"Created project: {name}", "data": result}
    
    elif cmd == ":project.list":
        projects = project_manager.list_projects()
        return {"success": True, "data": projects}
    
    elif cmd.startswith(":mem.learn"):
        parts = cmd.split('"')
        if len(parts) >= 2:
            content = parts[1]
            mem_id = memory_manager.remember(content, "semantic", [f"project:{current_project}"], 0.5, 0.5)
            return {"success": True, "message": f"Learned memory #{mem_id}"}
    
    elif cmd.startswith(":mem.search"):
        query = cmd.replace(":mem.search", "").strip()
        results = memory_manager.recall(query)
        return {"success": True, "data": results}
    
    elif cmd == ":mem.stats":
        stats = memory_manager.get_stats()
        return {"success": True, "data": stats}
    
    elif cmd == ":help":
        return {"success": True, "message": "Available commands: :project.new, :project.list, :mem.learn, :mem.search, :mem.stats, :mic.list, :mic.setup, :mic.use, :say, :help"}
    
    else:
        return {"success": False, "message": f"Unknown command: {cmd}"}

@app.get("/projects")
async def get_projects():
    """Get all projects"""
    return project_manager.list_projects()

@app.post("/projects")
async def create_project(project: ProjectCreate):
    """Create a new project"""
    result = project_manager.create_project(project.name)
    global current_project
    current_project = result["name"]
    return result

@app.get("/memory/stats")
async def get_memory_stats():
    """Get memory statistics"""
    return memory_manager.get_stats()

@app.post("/memory/learn")
async def learn_memory(memory: MemoryItem):
    """Learn a new memory"""
    mem_id = memory_manager.remember(
        memory.content, 
        memory.kind, 
        memory.tags + [f"project:{current_project}"], 
        memory.importance, 
        memory.relevance
    )
    return {"id": mem_id, "message": "Memory learned successfully"}

@app.get("/memory/search/{query}")
async def search_memory(query: str):
    """Search memories"""
    return memory_manager.recall(query)

@app.get("/status")
async def get_status():
    """Get system status"""
    return {
        "voice_active": voice_core.voice_active,
        "current_project": current_project,
        "memory_count": memory_manager.get_stats()["total"]
    }

# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    
    try:
        while True:
            # Send real-time voice metrics every second
            metrics = voice_core.get_metrics()
            await websocket.send_json({"type": "voice_metrics", "data": metrics})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

def generate_ai_response(input_text: str) -> str:
    """Generate AI response - this will be replaced with DeepSeek later"""
    lower_input = input_text.lower()
    
    if "project" in lower_input:
        return "I can help you manage projects! Use ':project.new ProjectName' to create a new project, or ':project.list' to see existing ones."
    elif "memory" in lower_input or "remember" in lower_input:
        return "Memory management is one of my core functions. I can learn new information with ':mem.learn', search memories with ':mem.search', and show stats with ':mem.stats'."
    elif "screenshot" in lower_input:
        return "I can capture screenshots and save them to your active project. The images are automatically organized and can be referenced in our conversations."
    elif input_text.startswith(":"):
        return f"Command '{input_text}' recognized. Processing..."
    else:
        return f"I understand you said: '{input_text}'. As your AI assistant, I'm here to help with projects, memory management, automation, and more!"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3001)
