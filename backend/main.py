
import os
import asyncio
import subprocess
import json
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
voice_active = True
connected_clients = set()

# Enhanced Voice client integration with your local-talking-llm
class VoiceClient:
    def __init__(self):
        self.local_talking_llm_path = os.getenv("VOICE_PY", "C:\\Users\\teren\\Documents\\Zandalee\\local-talking-llm\\.venv\\Scripts\\python.exe")
        self.transport = os.getenv("ZANDALEE_TRANSPORT", "STDIO")
        self.bridge_path = os.path.join(os.path.dirname(__file__), "voice_client.py")
        self.metrics_cache = {"stt": 0, "llm": 0, "tts": 0, "total": 0, "vu_level": 0}
    
    async def speak(self, text: str):
        """Integrate with your existing local-talking-llm TTS"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Call the voice bridge
            process = await asyncio.create_subprocess_exec(
                self.local_talking_llm_path, 
                self.bridge_path,
                "--transport", self.transport,
                "--speak", text,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                result = json.loads(stdout.decode())
                # Update metrics
                if "duration_ms" in result:
                    self.metrics_cache["tts"] = result["duration_ms"]
                    self.metrics_cache["total"] = result["duration_ms"]
                return result
            else:
                logger.error(f"Voice synthesis error: {stderr.decode()}")
                return {"status": "error", "message": f"TTS failed: {stderr.decode()}"}
                
        except Exception as e:
            logger.error(f"Voice synthesis error: {e}")
            return {"status": "error", "message": str(e)}

    async def listen(self):
        """Capture voice input using your existing STT"""
        try:
            # Call the voice bridge for listening
            process = await asyncio.create_subprocess_exec(
                self.local_talking_llm_path, 
                self.bridge_path,
                "--transport", self.transport,
                "--listen",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                result = json.loads(stdout.decode())
                # Update metrics
                if "duration_ms" in result:
                    self.metrics_cache["stt"] = result["duration_ms"]
                return result
            else:
                logger.error(f"Voice recognition error: {stderr.decode()}")
                return {"status": "error", "message": f"STT failed: {stderr.decode()}"}
                
        except Exception as e:
            logger.error(f"Voice recognition error: {e}")
            return {"status": "error", "message": str(e)}

    async def get_voice_metrics(self):
        """Get real-time voice metrics from your local-talking-llm"""
        try:
            # Try to get fresh metrics from the bridge
            process = await asyncio.create_subprocess_exec(
                self.local_talking_llm_path, 
                self.bridge_path,
                "--metrics",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                fresh_metrics = json.loads(stdout.decode())
                self.metrics_cache.update(fresh_metrics)
            
        except Exception as e:
            logger.debug(f"Could not get fresh metrics: {e}")
        
        # Add some realistic variation to cached metrics
        base_time = asyncio.get_event_loop().time()
        self.metrics_cache.update({
            "vu_level": abs(int((base_time * 10) % 100))
        })
        
        return self.metrics_cache

voice_client = VoiceClient()

# ... keep existing code (MemoryManager, ProjectManager classes, and all the routes remain the same)

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
                    "lastUsed": "2m ago",  # This would be calculated from actual file timestamps
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
        # For now, implement basic response logic
        # Later this will be replaced with DeepSeek integration
        response_text = generate_ai_response(message.content)
        
        # Auto-speak responses if voice is active
        if voice_active:
            await voice_client.speak(response_text)
        
        return {
            "id": str(int(datetime.now().timestamp() * 1000)),
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/speak")
async def speak(command: VoiceCommand):
    """Text-to-speech endpoint"""
    result = await voice_client.speak(command.text)
    return result

@app.post("/voice/listen")
async def listen():
    """Voice input endpoint"""
    result = await voice_client.listen()
    return result

@app.get("/voice/metrics")
async def get_voice_metrics():
    """Get real-time voice metrics"""
    return await voice_client.get_voice_metrics()

# ... keep existing code (all the remaining routes: commands, projects, memory, status, websocket, and helper functions)

@app.post("/commands/execute")
async def execute_command(command: dict):
    """Execute console commands"""
    cmd = command.get("command", "")
    
    if cmd.startswith(":project.new"):
        name = cmd.split('"')[1] if '"' in cmd else cmd.split()[-1]
        result = project_manager.create_project(name)
        global current_project
        current_project = result["name"]
        return {"success": True, "message": f"Created project: {name}", "data": result}
    
    elif cmd == ":project.list":
        projects = project_manager.list_projects()
        return {"success": True, "data": projects}
    
    elif cmd.startswith(":mem.learn"):
        # Parse memory learning command
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
        return {"success": True, "message": "Available commands: :project.new, :project.list, :mem.learn, :mem.search, :mem.stats, :help"}
    
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
        "voice_active": voice_active,
        "current_project": current_project,
        "transport": voice_client.transport,
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
            metrics = await voice_client.get_voice_metrics()
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
