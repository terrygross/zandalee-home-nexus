
import os
import asyncio
import subprocess
import json
import time
import uuid
import shutil
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
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

# ... keep existing code (Pydantic models, global state)

# Enhanced Pydantic models for photo-aware system
class MemoryItem(BaseModel):
    text: str
    kind: str = "semantic"
    tags: List[str] = []
    importance: float = 0.5
    relevance: float = 0.5
    image: Optional[str] = None
    emotion: Optional[str] = None
    source: str = "chat"
    trust: str = "told"

class MemoryUpdate(BaseModel):
    id: str
    patch: Dict[str, Any]

class DiaryEntry(BaseModel):
    text: str
    image: Optional[str] = None
    emotion: Optional[str] = None
    tags: List[str] = []

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
        return {"ok": False, "error": "not_supported"}
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get real-time voice metrics"""
        return {
            "ok": True,
            "voice_active": self._voice_active,
            "last_tts_ms": self._last_tts_ms,
            "last_error": self._last_error
        }

# Enhanced Memory and Diary Manager with photo support
class PhotoAwareMemoryManager:
    def __init__(self):
        self.zandalee_home = os.getenv("ZANDALEE_HOME", "C:\\Users\\teren\\Documents\\Zandalee")
        self.mem_dir = os.path.join(self.zandalee_home, "zandalee_memories")
        self.photos_dir = os.path.join(self.mem_dir, "photos")
        self.db_path = os.path.join(self.mem_dir, "mem.db")
        
        # Ensure directories exist
        os.makedirs(self.mem_dir, exist_ok=True)
        os.makedirs(self.photos_dir, exist_ok=True)
        
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database with photo-aware schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Enable WAL mode for better concurrency
            conn.execute("PRAGMA journal_mode=WAL;")
            
            # Create memories table with image and emotion support
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id            TEXT PRIMARY KEY,
                    text          TEXT NOT NULL,
                    kind          TEXT CHECK(kind IN ('semantic','episodic','procedural','working','event')) NOT NULL,
                    tags          TEXT NOT NULL,
                    importance    REAL DEFAULT 0.5,
                    relevance     REAL DEFAULT 0.5,
                    image_path    TEXT,
                    emotion       TEXT,
                    source        TEXT DEFAULT 'chat',
                    trust         TEXT DEFAULT 'told',
                    created_at    TEXT NOT NULL,
                    expires_at    TEXT,
                    retired       INTEGER DEFAULT 0,
                    version       INTEGER DEFAULT 1
                )
            """)
            
            # Create diary table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS diary (
                    id         TEXT PRIMARY KEY,
                    date       TEXT NOT NULL,
                    ts         TEXT NOT NULL,
                    text       TEXT NOT NULL,
                    image_path TEXT,
                    emotion    TEXT,
                    tags       TEXT DEFAULT ''
                )
            """)
            
            # Create indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_kind ON memories(kind);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_created ON memories(created_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_tags ON memories(tags);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_diary_date ON diary(date);")
            
            conn.commit()
    
    def save_uploaded_file(self, file: UploadFile) -> Dict[str, Any]:
        """Save uploaded image file and return relative path"""
        try:
            # Validate file type
            allowed_types = ["image/png", "image/jpeg", "image/webp"]
            if file.content_type not in allowed_types:
                return {"ok": False, "error": f"Invalid file type. Allowed: {', '.join(allowed_types)}"}
            
            # Check file size (10MB limit)
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > 10 * 1024 * 1024:  # 10MB
                return {"ok": False, "error": "File too large. Maximum size: 10MB"}
            
            # Generate unique filename with date subdirectory
            now = datetime.now()
            date_dir = now.strftime("%Y\\%m\\%d")
            full_date_dir = os.path.join(self.photos_dir, date_dir.replace("\\", os.sep))
            os.makedirs(full_date_dir, exist_ok=True)
            
            # Get file extension
            ext = "png"
            if file.content_type == "image/jpeg":
                ext = "jpg"
            elif file.content_type == "image/webp":
                ext = "webp"
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            filename = f"{file_id}.{ext}"
            file_path = os.path.join(full_date_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Return relative path
            relative_path = f"photos\\{date_dir}\\{filename}"
            return {"ok": True, "path": relative_path}
            
        except Exception as e:
            logger.error(f"File upload error: {e}")
            return {"ok": False, "error": str(e)}
    
    def learn_memory(self, memory: MemoryItem) -> Dict[str, Any]:
        """Store a new memory with photo and emotion support"""
        try:
            memory_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            tags_csv = ",".join(memory.tags)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO memories (
                        id, text, kind, tags, importance, relevance, 
                        image_path, emotion, source, trust, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    memory_id, memory.text, memory.kind, tags_csv,
                    memory.importance, memory.relevance, memory.image,
                    memory.emotion, memory.source, memory.trust, now
                ))
                conn.commit()
            
            return {"ok": True, "id": memory_id}
        except Exception as e:
            logger.error(f"Memory learn error: {e}")
            return {"ok": False, "error": str(e)}
    
    def search_memories(self, query: str = "", tags: List[str] = [], emotion: str = None, limit: int = 10) -> List[Dict]:
        """Search memories with photo and emotion filtering"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                sql = "SELECT * FROM memories WHERE retired = 0"
                params = []
                
                if query:
                    sql += " AND text LIKE ?"
                    params.append(f"%{query}%")
                
                if tags:
                    for tag in tags:
                        sql += " AND tags LIKE ?"
                        params.append(f"%{tag}%")
                
                if emotion:
                    sql += " AND emotion = ?"
                    params.append(emotion)
                
                sql += " ORDER BY importance DESC, created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(sql, params)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Memory search error: {e}")
            return []
    
    def update_memory(self, memory_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        """Update memory fields"""
        try:
            if not patch:
                return {"ok": False, "error": "No fields to update"}
            
            # Convert tags array to CSV if present
            if "tags" in patch and isinstance(patch["tags"], list):
                patch["tags"] = ",".join(patch["tags"])
            
            # Build UPDATE query
            set_clauses = []
            params = []
            for key, value in patch.items():
                if key in ["text", "tags", "importance", "relevance", "emotion", "image", "retired"]:
                    set_clauses.append(f"{key} = ?")
                    params.append(value)
            
            if not set_clauses:
                return {"ok": False, "error": "No valid fields to update"}
            
            params.append(memory_id)
            sql = f"UPDATE memories SET {', '.join(set_clauses)} WHERE id = ?"
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(sql, params)
                if cursor.rowcount == 0:
                    return {"ok": False, "error": "Memory not found"}
                conn.commit()
            
            return {"ok": True}
        except Exception as e:
            logger.error(f"Memory update error: {e}")
            return {"ok": False, "error": str(e)}
    
    def append_diary(self, entry: DiaryEntry) -> Dict[str, Any]:
        """Append diary entry with photo and emotion support"""
        try:
            entry_id = str(uuid.uuid4())
            now = datetime.now()
            date_str = now.strftime("%Y-%m-%d")
            ts_str = now.isoformat()
            tags_csv = ",".join(entry.tags)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO diary (id, date, ts, text, image_path, emotion, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (entry_id, date_str, ts_str, entry.text, entry.image, entry.emotion, tags_csv))
                conn.commit()
            
            return {"ok": True, "id": entry_id}
        except Exception as e:
            logger.error(f"Diary append error: {e}")
            return {"ok": False, "error": str(e)}
    
    def list_diary(self, date_filter: str = None, since: str = None, limit: int = 50, 
                   tags: List[str] = [], emotion: str = None) -> List[Dict]:
        """List diary entries with filtering"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                sql = "SELECT * FROM diary WHERE 1=1"
                params = []
                
                if date_filter:
                    sql += " AND date = ?"
                    params.append(date_filter)
                
                if since:
                    sql += " AND ts >= ?"
                    params.append(since)
                
                if tags:
                    for tag in tags:
                        sql += " AND tags LIKE ?"
                        params.append(f"%{tag}%")
                
                if emotion:
                    sql += " AND emotion = ?"
                    params.append(emotion)
                
                sql += " ORDER BY ts DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(sql, params)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Diary list error: {e}")
            return []

# Initialize components
voice_core = VoiceCore()
memory_manager = PhotoAwareMemoryManager()

# ... keep existing code (project manager and other classes)

# API Routes
@app.get("/")
async def root():
    return {"message": "Zandalee AI Backend", "status": "active"}

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

# FILE UPLOAD ENDPOINT
@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload image file for memories/diary"""
    return memory_manager.save_uploaded_file(file)

# ENHANCED MEMORY ENDPOINTS
@app.post("/memory/learn")
async def learn_memory(memory: MemoryItem):
    """Learn a new memory with photo and emotion support"""
    return memory_manager.learn_memory(memory)

@app.get("/memory/search")
async def search_memory(q: str = "", tags: str = "", emotion: str = None, limit: int = 10):
    """Search memories with photo and emotion filtering"""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    results = memory_manager.search_memories(q, tag_list, emotion, limit)
    return {"ok": True, "items": results}

@app.post("/memory/update")
async def update_memory(update: MemoryUpdate):
    """Update memory fields"""
    return memory_manager.update_memory(update.id, update.patch)

# ENHANCED DIARY ENDPOINTS
@app.post("/diary/append")
async def append_diary(entry: DiaryEntry):
    """Append diary entry with photo and emotion support"""
    return memory_manager.append_diary(entry)

@app.get("/diary/list")
async def list_diary(date: str = None, since: str = None, limit: int = 50, 
                    tags: str = "", emotion: str = None):
    """List diary entries with filtering"""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    results = memory_manager.list_diary(date, since, limit, tag_list, emotion)
    return {"ok": True, "items": results}

# ... keep existing code (chat, projects, commands, websocket, other endpoints)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3001)
