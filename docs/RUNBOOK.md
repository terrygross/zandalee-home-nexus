
# Zandalee AI - Operations Runbook

## Voice Core

### Environment Configuration

Required environment variables:

```bash
# Python executable for voice stack
VOICE_PY=C:\Users\teren\Documents\Zandalee\local-talking-llm\.venv\Scripts\python.exe

# Root directory for Zandalee installation
ZANDALEE_ROOT=C:\Users\teren\Documents\Zandalee
```

### Voice Bridge Integration

The `/speak` endpoint integrates with your existing voice stack via the bridge:

**Command Structure:**
```bash
[VOICE_PY] [ZANDALEE_ROOT]\voice_client.py --transport STDIO --speak [text]
```

**Working Directory:** `C:\Users\teren\Documents\Zandalee`

**Process Flow:**
1. Validate text input (reject empty/whitespace-only)
2. Check bridge file exists at `voice_client.py`
3. Acquire half-duplex lock (reject concurrent calls with "busy")
4. Launch child process with bridge command
5. Measure wall-clock latency for TTS completion
6. Return result with timing metrics
7. Release lock

### Half-Duplex Enforcement

**Behavior:**
- Only one TTS operation allowed at a time
- Concurrent `/speak` calls return `{"ok": false, "error": "busy"}`
- `voice_active` flag indicates when TTS is in progress
- Lock is automatically released on completion or error

**Lock Scope:** Process-wide async lock using `asyncio.Lock()`

### API Endpoints

#### POST /speak
**Request:**
```json
{"text": "Hello world"}
```

**Success Response:**
```json
{"ok": true, "tts_ms": 1234}
```

**Error Responses:**
```json
{"ok": false, "error": "empty text"}
{"ok": false, "error": "busy"}
{"ok": false, "error": "voice_client.py not found"}
```

#### GET /voice/metrics
**Response:**
```json
{
  "ok": true,
  "voice_active": false,
  "last_tts_ms": 1234,
  "last_error": null
}
```

#### POST /voice/stop (Optional)
Currently returns:
```json
{"ok": false, "error": "not_supported"}
```

### Testing Commands

Verify voice core functionality:

```powershell
$B="http://127.0.0.1:3001"

# Test basic TTS
Invoke-RestMethod -Method Post -Uri "$B/speak" `
  -ContentType "application/json" `
  -Body (@{ text = "UI is online." } | ConvertTo-Json)

# Check metrics
Invoke-RestMethod "$B/voice/metrics"

# Test busy lock (run in parallel)
$job1 = Start-Job { Invoke-RestMethod -Method Post -Uri "$args" -ContentType "application/json" -Body (@{text="one"}|ConvertTo-Json) } -ArgumentList "$B/speak"
$job2 = Start-Job { Invoke-RestMethod -Method Post -Uri "$args" -ContentType "application/json" -Body (@{text="two"}|ConvertTo-Json) } -ArgumentList "$B/speak"
Receive-Job -Wait -AutoRemoveJob $job1,$job2
```

### Troubleshooting

**Common Issues:**

1. **"voice_client.py not found"**
   - Verify `ZANDALEE_ROOT` points to correct directory
   - Check bridge file exists at `[ZANDALEE_ROOT]\voice_client.py`

2. **"Process failed with code X"**
   - Check `VOICE_PY` points to valid Python executable
   - Verify local-talking-llm environment is activated
   - Check bridge script permissions

3. **No audio output**
   - Verify bridge integration with local-talking-llm TTS
   - Check system audio settings
   - Test bridge directly: `python voice_client.py --speak "test"`

4. **Always returns "busy"**
   - Restart backend server to clear stuck locks
   - Check for hanging subprocess calls

### Dependencies

- **Required:** Working local-talking-llm installation
- **Required:** voice_client.py bridge script
- **Required:** Python environment with asyncio support
- **Optional:** /voice/stop endpoint (process termination)
