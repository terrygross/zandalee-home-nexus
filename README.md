
# Zandalee Terminal

A comprehensive AI assistant terminal that connects to a local gateway for chat, voice, memory, and PC control functionality.

## Environment Setup

Create a `.env.local` file in the root directory (optional):

```env
VITE_ZANDALEE_API_BASE=http://127.0.0.1:11500
```

If not set, the application defaults to `http://127.0.0.1:11500`.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Quick Test Steps

1. **Health Check**: Open the app - status bar should show gateway connection status
2. **Config**: Go to Settings tab, enter Salad base URL and API key, click "Test Connection"
3. **Chat**: Send a message in the Chat tab - should get AI response
4. **Speak**: Enable "Speak Back" toggle in Chat tab for TTS responses
5. **Memory**: Click ⭐ on assistant messages to save to memory, search in Memories tab
6. **Hands**: Use Hands tab to send keystrokes or mouse actions
7. **Docs**: Drag & drop files in Docs tab to upload

## API Endpoints

The gateway hook (`src/hooks/useGateway.ts`) connects to these endpoints:

### Core Gateway
- `GET /health` - Health check
- `GET /config` - Get configuration
- `POST /config` - Save configuration

### AI Chat
- `GET /api/tags` - List available models
- `POST /api/chat` - Send chat message

### Voice/TTS
- `GET /local/voices` - List available voices
- `POST /local/speak` - Text-to-speech

### Memory System
- `POST /memory/learn` - Save memory
- `GET /memory/search?q=&limit=` - Search memories

### PC Control (Hands)
- `POST /local/keys` - Send keystrokes
- `POST /local/mouse` - Mouse actions
- `POST /local/app` - Launch applications

### Document Processing
- `POST /local/upload` - Upload files (multipart)
- `GET /local/docs` - List uploaded documents

## Architecture

- **Single Hook**: `useGateway.ts` centralizes all API calls with typed interfaces
- **Component Structure**: Modular tab-based interface with focused components
- **Error Handling**: Consistent error handling with user-friendly toasts
- **Local Fallback**: Settings persist to localStorage when backend unavailable
- **Real-time Status**: Health check polling every 2 seconds

## Features

### Settings Panel
- Gateway configuration (base URL, API key, model)
- Connection testing with status badges
- Voice selection and persistence
- Pre-filled Salad Cloud URL

### Chat Interface
- Real-time AI conversations
- Memory saving with ⭐ button
- TTS integration with voice selection
- Message history with timestamps

### Memory System
- Search saved memories
- Semantic/episodic/procedural memory types
- Tag-based organization

### Hands (PC Control)
- Keyboard text input with Enter option
- Mouse movement and clicking
- Application launching (VS Code)

### Document Processing
- Drag & drop file upload
- File listing with size display
- Multiple file support

### Mic Wizard (UI Stub)
- Device selection interface
- Quality metrics display
- Configuration saving
- **Note**: Currently stubbed with mock data

## Build Output

The `npm run build` command produces a static build in the `dist/` directory suitable for hosting at any path (`/`).

## Error Handling

The application provides friendly error messages for common scenarios:
- **401**: "Unauthorized - check API key"
- **502**: "Gateway error - check Salad connection"
- **Timeout**: Network connectivity issues
- **Other**: Generic server errors

All errors show both inline feedback and toast notifications.
