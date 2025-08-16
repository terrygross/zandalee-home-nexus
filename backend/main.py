
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
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import logging

# Import the new audio wizard and config manager
from audio_wizard import AudioWizard
from config_manager import ConfigManager

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

# ... keep existing code (Enhanced Pydantic models for photo-aware system)
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

class VoiceCommand(BaseModel):
    text: str

# New avatar models
class AvatarSelect(BaseModel):
    id: str

# New mic wizard models
class MicWizardConfig(BaseModel):
    frame_ms: Optional[int] = 10
    samplerates: Optional[List[int]] = [16000, 48000, 44100]
    vad_mode: Optional[int] = 1
    start_voiced_frames: Optional[int] = 2
    silence_hold_ms: Optional[int] = 5000
    preroll_ms: Optional[int] = 500
    voice_prompt: Optional[str] = "testing one two three"

class MicUseRequest(BaseModel):
    id: int

# New config models
class ConfigData(BaseModel):
    data: Dict[str, Any]

# ... keep existing code (VoiceCore class implementation)
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

# ... keep existing code (PhotoAwareMemoryManager class implementation)
class PhotoAwareMemoryManager:
    def __init__(self):
        self.zandalee_home = os.getenv("ZANDALEE_HOME", "C:\\Users\\teren\\Documents\\Zandalee")
        self.mem_dir = os.path.join(self.zandalee_home, "zandalee_memories")
        self.photos_dir = os.path.join(self.mem_dir, "photos")
        self.storage_dir = os.path.join(self.zandalee_home, "storage")
        self.diary_photos_dir = os.path.join(self.storage_dir, "diary_photos")
        self.avatars_dir = os.path.join(self.storage_dir, "avatars")
        self.db_path = os.path.join(self.mem_dir, "mem.db")
        
        # Ensure directories exist
        os.makedirs(self.mem_dir, exist_ok=True)
        os.makedirs(self.photos_dir, exist_ok=True)
        os.makedirs(self.storage_dir, exist_ok=True)
        os.makedirs(self.diary_photos_dir, exist_ok=True)
        os.makedirs(self.avatars_dir, exist_ok=True)
        
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database with photo-aware and avatar schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Enable WAL mode for better concurrency
            conn.execute("PRAGMA journal_mode=WAL;")
            
            # ... keep existing code (memories table creation and other tables)
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
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS diary_entries (
                    id           TEXT PRIMARY KEY,
                    text         TEXT NOT NULL,
                    photo_url    TEXT,
                    emotion_tag  TEXT,
                    created_at   TEXT NOT NULL
                )
            """)
            
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
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS avatars (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    photo_url    TEXT NOT NULL,
                    is_active    INTEGER DEFAULT 0,
                    created_at   TEXT NOT NULL
                )
            """)
            
            # ... keep existing code (indexes creation)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_kind ON memories(kind);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_created ON memories(created_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_tags ON memories(tags);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_diary_date ON diary(date);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_diary_entries_created ON diary_entries(created_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_diary_entries_emotion ON diary_entries(emotion_tag);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_avatars_active ON avatars(is_active);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_avatars_created ON avatars(created_at);")
            
            conn.commit()
    
    # ... keep existing code (all methods from save_uploaded_file through get_avatar_status)
    def save_uploaded_file(self, file: UploadFile, for_diary: bool = False, for_avatar: bool = False) -> Dict[str, Any]:
        """Save uploaded image file and return URL"""
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
            
            # Choose directory based on usage
            if for_avatar:
                target_dir = self.avatars_dir
                url_prefix = "avatars"
            elif for_diary:
                target_dir = self.diary_photos_dir
                url_prefix = "diary_photos"
            else:
                target_dir = self.photos_dir
                url_prefix = "photos"
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            
            # Get file extension
            ext = "png"
            if file.content_type == "image/jpeg":
                ext = "jpg"
            elif file.content_type == "image/webp":
                ext = "webp"
            
            filename = f"{file_id}.{ext}"
            file_path = os.path.join(target_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Return URL for local serving
            url = f"http://127.0.0.1:8759/files/{url_prefix}/{filename}"
            
            return {"ok": True, "path": f"{url_prefix}/{filename}", "url": url, "id": file_id}
            
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
    
    def append_diary_entry(self, text: str, photo_url: str = None, emotion_tag: str = None) -> Dict[str, Any]:
        """Append new diary entry to diary_entries table"""
        try:
            entry_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO diary_entries (id, text, photo_url, emotion_tag, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (entry_id, text, photo_url, emotion_tag, now))
                conn.commit()
            
            return {"ok": True, "id": entry_id}
        except Exception as e:
            logger.error(f"Diary append error: {e}")
            return {"ok": False, "error": str(e)}
    
    def list_diary_entries(self, limit: int = 20) -> List[Dict]:
        """List diary entries from diary_entries table"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                cursor = conn.execute("""
                    SELECT id, text, photo_url, emotion_tag, created_at
                    FROM diary_entries 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Diary list error: {e}")
            return []
    
    def search_diary_entries(self, query: str = "", emotion: str = None, limit: int = 20) -> List[Dict]:
        """Search diary entries"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                sql = "SELECT id, text, photo_url, emotion_tag, created_at FROM diary_entries WHERE 1=1"
                params = []
                
                if query:
                    sql += " AND text LIKE ?"
                    params.append(f"%{query}%")
                
                if emotion:
                    sql += " AND emotion_tag = ?"
                    params.append(emotion)
                
                sql += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(sql, params)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Diary search error: {e}")
            return []
    
    def append_diary(self, entry: DiaryEntry) -> Dict[str, Any]:
        """Legacy diary append for backward compatibility"""
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
            logger.error(f"Legacy diary append error: {e}")
            return {"ok": False, "error": str(e)}

    def list_diary(self, date_filter: str = None, since: str = None, limit: int = 50, 
                   tags: List[str] = [], emotion: str = None) -> List[Dict]:
        """Legacy diary list for backward compatibility"""
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
            logger.error(f"Legacy diary list error: {e}")
            return []
    
    def upload_avatar(self, file: UploadFile, name: str) -> Dict[str, Any]:
        """Upload and store avatar image"""
        try:
            # Save the file
            upload_result = self.save_uploaded_file(file, for_avatar=True)
            if not upload_result["ok"]:
                return upload_result
            
            # Store in database
            avatar_id = upload_result["id"]
            now = datetime.now().isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO avatars (id, name, photo_url, created_at)
                    VALUES (?, ?, ?, ?)
                """, (avatar_id, name, upload_result["url"], now))
                conn.commit()
            
            return {"ok": True, "id": avatar_id, "name": name, "photo_url": upload_result["url"]}
        except Exception as e:
            logger.error(f"Avatar upload error: {e}")
            return {"ok": False, "error": str(e)}
    
    def list_avatars(self) -> List[Dict]:
        """List all avatars"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                cursor = conn.execute("""
                    SELECT id, name, photo_url, is_active, created_at
                    FROM avatars 
                    ORDER BY created_at DESC
                """)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Avatar list error: {e}")
            return []
    
    def select_avatar(self, avatar_id: str) -> Dict[str, Any]:
        """Set active avatar"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # First, deactivate all avatars
                conn.execute("UPDATE avatars SET is_active = 0")
                
                # Then activate the selected one
                cursor = conn.execute("UPDATE avatars SET is_active = 1 WHERE id = ?", (avatar_id,))
                if cursor.rowcount == 0:
                    return {"ok": False, "error": "Avatar not found"}
                
                conn.commit()
            
            return {"ok": True}
        except Exception as e:
            logger.error(f"Avatar select error: {e}")
            return {"ok": False, "error": str(e)}
    
    def get_avatar_status(self) -> Dict[str, Any]:
        """Get current active avatar"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                cursor = conn.execute("""
                    SELECT id, name, photo_url
                    FROM avatars 
                    WHERE is_active = 1
                    LIMIT 1
                """)
                row = cursor.fetchone()
                
                if row:
                    return {
                        "ok": True,
                        "active_avatar_id": row["id"],
                        "name": row["name"],
                        "photo_url": row["photo_url"]
                    }
                else:
                    return {"ok": True, "active_avatar_id": None, "name": None, "photo_url": None}
        except Exception as e:
            logger.error(f"Avatar status error: {e}")
            return {"ok": False, "error": str(e)}
    
    def delete_avatar(self, avatar_id: str) -> Dict[str, Any]:
        """Delete avatar from database and storage"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # Get avatar info first
                cursor = conn.execute("SELECT photo_url FROM avatars WHERE id = ?", (avatar_id,))
                row = cursor.fetchone()
                
                if not row:
                    return {"ok": False, "error": "Avatar not found"}
                
                # Extract filename from URL and delete file
                photo_url = row["photo_url"]
                if "avatars/" in photo_url:
                    filename = photo_url.split("avatars/")[-1]
                    file_path = os.path.join(self.avatars_dir, filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                
                # Delete from database
                conn.execute("DELETE FROM avatars WHERE id = ?", (avatar_id,))
                conn.commit()
            
            return {"ok": True}
        except Exception as e:
            logger.error(f"Avatar delete error: {e}")
            return {"ok": False, "error": str(e)}

# Initialize components
voice_core = VoiceCore()
memory_manager = PhotoAwareMemoryManager()
audio_wizard = AudioWizard()
config_manager = ConfigManager()

# Mount static files for serving uploaded images and avatars
app.mount("/files", StaticFiles(directory=memory_manager.storage_dir), name="files")

# ... keep existing code (API routes for voice, mic, memory, diary, avatar)
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

# MIC WIZARD ENDPOINTS (NEW)
@app.get("/mic/list")
async def list_mic_devices():
    """List available input devices (real, no mocks)"""
    devices = audio_wizard.list_devices()
    return devices

@app.post("/mic/wizard")
async def run_mic_wizard(config: MicWizardConfig = None):
    """Run complete mic wizard with real device testing"""
    config_dict = config.dict() if config else {}
    result = audio_wizard.run_wizard(config_dict)
    return result

@app.post("/mic/use")
async def use_mic_device(request: MicUseRequest):
    """Manually set a specific device"""
    result = audio_wizard.use_device(request.id)
    return result

# FILE UPLOAD ENDPOINT
@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...), for_diary: bool = False, for_avatar: bool = False):
    """Upload image file for memories/diary/avatars"""
    return memory_manager.save_uploaded_file(file, for_diary, for_avatar)

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

# NEW DIARY ENDPOINTS (Local-First)
@app.post("/diary/append")
async def append_diary_entry(text: str = Form(...), photo_url: str = Form(None), emotion_tag: str = Form(None)):
    """Append new diary entry"""
    return memory_manager.append_diary_entry(text, photo_url, emotion_tag)

@app.get("/diary/list")
async def list_diary_entries(limit: int = 20):
    """List recent diary entries"""
    results = memory_manager.list_diary_entries(limit)
    return {"ok": True, "items": results}

@app.get("/diary/search")
async def search_diary_entries(q: str = "", emotion: str = None, limit: int = 20):
    """Search diary entries"""
    results = memory_manager.search_diary_entries(q, emotion, limit)
    return {"ok": True, "items": results}

# LEGACY DIARY ENDPOINTS (Backward Compatibility)
@app.post("/diary/append_legacy")
async def append_diary_legacy(entry: DiaryEntry):
    """Legacy diary append for backward compatibility"""
    return memory_manager.append_diary(entry)

@app.get("/diary/list_legacy")
async def list_diary_legacy(date: str = None, since: str = None, limit: int = 50, 
                    tags: str = "", emotion: str = None):
    """Legacy diary list for backward compatibility"""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    results = memory_manager.list_diary(date, since, limit, tag_list, emotion)
    return {"ok": True, "items": results}

# NEW AVATAR ENDPOINTS
@app.post("/avatar/upload")
async def upload_avatar(file: UploadFile = File(...), name: str = Form(...)):
    """Upload avatar image"""
    return memory_manager.upload_avatar(file, name)

@app.get("/avatar/list")
async def list_avatars():
    """List all avatars"""
    results = memory_manager.list_avatars()
    return {"ok": True, "items": results}

@app.post("/avatar/select")
async def select_avatar(request: AvatarSelect):
    """Select active avatar"""
    return memory_manager.select_avatar(request.id)

@app.get("/avatar/status")
async def get_avatar_status():
    """Get current active avatar status"""
    return memory_manager.get_avatar_status()

@app.delete("/avatar/{avatar_id}")
async def delete_avatar(avatar_id: str):
    """Delete avatar"""
    return memory_manager.delete_avatar(avatar_id)

# NEW CONFIG ENDPOINTS
@app.get("/config/{config_type}")
async def get_config(config_type: str):
    """Get configuration by type (audio/llm/ui/avatar)"""
    if config_type not in ["audio", "llm", "ui", "avatar"]:
        raise HTTPException(status_code=400, detail="Invalid config type")
    
    config_data = config_manager.load_config(config_type)
    return {"ok": True, "config": config_data}

@app.post("/config/{config_type}")
async def set_config(config_type: str, config_data: ConfigData):
    """Set configuration by type with validation"""
    if config_type not in ["audio", "llm", "ui", "avatar"]:
        raise HTTPException(status_code=400, detail="Invalid config type")
    
    success, error_msg = config_manager.save_config(config_type, config_data.data)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)
    
    return {"ok": True, "message": f"{config_type} config saved successfully"}

@app.get("/config")
async def get_all_configs():
    """Get all configuration types"""
    all_configs = config_manager.get_all_configs()
    return {"ok": True, "configs": all_configs}

@app.post("/config/{config_type}/reset")
async def reset_config(config_type: str):
    """Reset configuration to defaults"""
    if config_type not in ["audio", "llm", "ui", "avatar"]:
        raise HTTPException(status_code=400, detail="Invalid config type")
    
    success, error_msg = config_manager.reset_config(config_type)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)
    
    return {"ok": True, "message": f"{config_type} config reset to defaults"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8759)
