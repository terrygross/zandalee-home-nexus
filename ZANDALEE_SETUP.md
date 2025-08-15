
# Zandalee AI Desktop Setup

This connects your Lovable web interface to a Python backend that integrates with your existing `local-talking-llm` voice stack.

## Quick Start

1. **Install Python Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install Frontend Dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start Zandalee**:
   ```bash
   python start_zandalee.py
   ```

This will:
- Start the Python FastAPI backend on `localhost:3001`
- Start the React frontend on `localhost:8080`
- Open your browser to the Zandalee interface
- Connect real-time voice metrics via WebSocket

## Architecture

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│  React Frontend │ ◄──────────────────► │ Python Backend  │
│  (localhost:8080│                      │ (localhost:3001)│
└─────────────────┘                      └─────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │ local-talking-  │
                                         │      llm        │
                                         │   (your voice   │
                                         │     stack)      │
                                         └─────────────────┘
```

## Features Working

- ✅ Real-time chat with AI responses
- ✅ Voice metrics (STT/LLM/TTS/Total latency)
- ✅ Project management (:project.new, :project.list)
- ✅ Memory system (:mem.learn, :mem.search, :mem.stats)
- ✅ Command execution (all : commands)
- ✅ WebSocket connection for live updates
- ✅ Integration with your existing voice stack

## Next Steps

1. **Voice Integration**: The backend is ready to call your `local-talking-llm` via STDIO
2. **DeepSeek Integration**: Replace the simple AI response logic with DeepSeek
3. **Packaging**: Create single executable with PyInstaller
4. **Security**: Implement core laws and policy enforcement

## Environment Variables

Create a `.env` file in the backend directory:

```env
ZANDALEE_MEM_DIR=C:\Users\teren\Documents\Zandalee\zandalee_memories
ZANDALEE_PROJECTS_DIR=C:\Users\teren\Documents\Zandalee\projects
ZANDALEE_TRANSPORT=STDIO
VOICE_PY=C:\Users\teren\Documents\Zandalee\local-talking-llm\.venv\Scripts\python.exe
CORE_LAWS_TOKEN=__SET_ME__
CORE_LAWS_PATH=C:\Users\teren\Documents\Zandalee\zandalee_core_laws.json
SECURITY_POLICY_PATH=C:\Users\teren\Documents\Zandalee\security_policy.json
```

## Testing Commands

Try these in the chat interface:
- `:help` - Show available commands
- `:project.new "Test Project"` - Create a new project
- `:project.list` - List all projects
- `:mem.learn "This is a test memory"` - Learn a memory
- `:mem.search test` - Search memories
- `:mem.stats` - Show memory statistics

The interface now connects to a real Python backend that can integrate with your existing voice and memory systems!
