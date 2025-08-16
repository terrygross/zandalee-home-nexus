
# Memory and Diary System Documentation

## Overview
Zandalee's memory and diary system supports photo-aware memories with optional emotion tagging for more human-like recall.

## Directory Structure
```
ZANDALEE_HOME/
└── zandalee_memories/
    ├── mem.db              # SQLite database
    └── photos/             # Image storage
        └── YYYY/MM/DD/     # Date-organized subdirectories
            └── {uuid}.{ext} # Uploaded images
```

## Environment Variables
- `ZANDALEE_HOME`: Base directory (default: `C:\Users\teren\Documents\Zandalee`)
- `ZANDALEE_MEM_DIR`: Memory storage directory (`{ZANDALEE_HOME}\zandalee_memories`)
- `ZANDALEE_PHOTOS_DIR`: Photo storage directory (`{ZANDALEE_MEM_DIR}\photos`)

## Database Schema

### Memories Table
```sql
CREATE TABLE memories (
    id            TEXT PRIMARY KEY,
    text          TEXT NOT NULL,
    kind          TEXT CHECK(kind IN ('semantic','episodic','procedural','working','event')) NOT NULL,
    tags          TEXT NOT NULL,         -- CSV format
    importance    REAL DEFAULT 0.5,      -- 0..1
    relevance     REAL DEFAULT 0.5,      -- 0..1
    image_path    TEXT,                  -- Relative path to photo
    emotion       TEXT,                  -- Optional emotion tag
    source        TEXT DEFAULT 'chat',   -- 'diary'|'wizard'|'chat'|'system'
    trust         TEXT DEFAULT 'told',   -- 'observed'|'told'|'inferred'
    created_at    TEXT NOT NULL,         -- ISO8601 timestamp
    expires_at    TEXT,                  -- For working memories
    retired       INTEGER DEFAULT 0,     -- 0/1 flag
    version       INTEGER DEFAULT 1
);
```

### Diary Table
```sql
CREATE TABLE diary (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,            -- ISO date "2025-08-16"
    ts         TEXT NOT NULL,            -- Precise timestamp
    text       TEXT NOT NULL,
    image_path TEXT,                     -- Relative path to photo
    emotion    TEXT,                     -- Optional emotion tag
    tags       TEXT DEFAULT ''           -- CSV format
);
```

## API Endpoints

### File Upload
- **POST /files/upload**
  - Content-Type: `multipart/form-data`
  - Field: `file` (image file)
  - Allowed types: `image/png`, `image/jpeg`, `image/webp`
  - Max size: 10MB
  - Response: `{"ok": true, "path": "photos\\YYYY\\MM\\DD\\uuid.ext"}`

### Memory Endpoints

#### Learn Memory
- **POST /memory/learn**
  ```json
  {
    "text": "Tristan's birthday party",
    "kind": "event",
    "tags": ["family", "birthday"],
    "importance": 0.9,
    "relevance": 0.8,
    "image": "photos\\2025\\08\\16\\abc.png",
    "emotion": "proud"
  }
  ```

#### Search Memories
- **GET /memory/search?q=&tags=&emotion=&limit=**
  - `q`: Text search (LIKE query)
  - `tags`: CSV list of tags (all must match)
  - `emotion`: Exact emotion match
  - `limit`: Maximum results

#### Update Memory
- **POST /memory/update**
  ```json
  {
    "id": "uuid",
    "patch": {
      "text": "Updated text",
      "emotion": "happy",
      "retired": true
    }
  }
  ```

### Diary Endpoints

#### Append Entry
- **POST /diary/append**
  ```json
  {
    "text": "We ran the mic wizard and selected device 9.",
    "image": "photos\\2025\\08\\16\\mic.png",
    "emotion": "satisfied",
    "tags": ["audio", "wizard"]
  }
  ```

#### List Entries
- **GET /diary/list?date=&since=&limit=&tags=&emotion=**
  - `date`: Specific date filter (YYYY-MM-DD)
  - `since`: ISO timestamp for entries after
  - `limit`: Maximum results (default 50)
  - `tags`: CSV list of tags
  - `emotion`: Exact emotion match

## Supported Emotions
- `happy` - 😊 Happy
- `proud` - 🌟 Proud
- `excited` - 🎉 Excited
- `calm` - 😌 Calm
- `sad` - 😢 Sad
- `worried` - 😟 Worried
- `angry` - 😠 Angry
- `relief` - 😮‍💨 Relief

## File Path Conventions
- All paths in API responses are relative to `ZANDALEE_MEM_DIR`
- Photos are organized in date subdirectories: `photos\YYYY\MM\DD\`
- Filenames use UUID to prevent conflicts: `{uuid}.{extension}`

## Backward Compatibility
- Existing text-only memories continue to work
- `image_path` and `emotion` fields default to `NULL`
- Search queries without photo/emotion filters return all matches

## Usage Examples

### PowerShell Test Commands
```powershell
$B = "http://127.0.0.1:3001"

# Upload image
Invoke-RestMethod -Method Post -Uri "$B/files/upload" -Form @{ 
    file = Get-Item "C:\path\to\image.jpg" 
}

# Create memory with photo + emotion
Invoke-RestMethod -Method Post -Uri "$B/memory/learn" -ContentType "application/json" -Body (@{
    text = "Birthday party"
    kind = "event"
    tags = @("family", "celebration")
    image = "photos\\2025\\08\\16\\test.jpg"
    emotion = "happy"
} | ConvertTo-Json)

# Search by emotion
Invoke-RestMethod "$B/memory/search?emotion=happy&limit=10"

# Add diary entry
Invoke-RestMethod -Method Post -Uri "$B/diary/append" -ContentType "application/json" -Body (@{
    text = "Great day at the park"
    emotion = "calm"
    tags = @("outdoor", "relaxation")
} | ConvertTo-Json)
```
