
# Mic Wizard - Audio Device Calibration

## Overview

The Mic Wizard provides automated audio device testing and calibration for Zandalee AI. It performs comprehensive analysis of available input devices to determine the best microphone for voice interaction.

## Architecture

### Backend Components

- **AudioWizard Class** (`backend/audio_wizard.py`): Core testing logic
- **API Endpoints** (`backend/main.py`): REST endpoints for device management
- **Local Storage**: Configuration persisted to `config/audio.json`

### Dependencies

- `sounddevice`: Audio device enumeration and capture  
- `webrtcvad`: Voice Activity Detection
- `numpy`: Audio signal processing
- `scipy`: Audio resampling (if needed)

## API Endpoints

### GET /mic/list
Lists available input devices (filtered for real devices).

**Response:**
```json
[
  {
    "id": 9,
    "name": "Microphone Array (AMD ...)",
    "max_input_channels": 1,
    "samplerate": 16000
  }
]
```

### POST /mic/wizard
Runs complete device testing wizard.

**Request Body (optional):**
```json
{
  "frame_ms": 10,
  "samplerates": [16000, 48000, 44100],
  "vad_mode": 1,
  "start_voiced_frames": 2,
  "silence_hold_ms": 5000,
  "preroll_ms": 500,
  "voice_prompt": "testing one two three"
}
```

**Response:**
```json
{
  "ok": true,
  "results": [
    {
      "id": 9,
      "name": "Microphone Array (AMD ...)",
      "samplerate": 16000,
      "noise_rms": 0.0031,
      "voice_rms": 0.062,
      "snr_db": 25.9,
      "voiced_ratio": 0.67,
      "start_delay_ms": 20,
      "clipping_pct": 0.0,
      "dropouts": 0,
      "score": 0.82
    }
  ],
  "chosen": {
    "id": 9,
    "name": "Microphone Array (AMD ...)",
    "samplerate": 16000,
    "frame_ms": 10,
    "vad_mode": 1,
    "start_voiced_frames": 2,
    "end_unvoiced_frames": 500,
    "preroll_ms": 500,
    "silence_hold_ms": 5000
  }
}
```

### POST /mic/use
Manually select a specific device.

**Request Body:**
```json
{
  "id": 9
}
```

**Response:**
```json
{
  "ok": true
}
```

## Testing Process

### 1. Device Enumeration
- Use `sounddevice.query_devices()` to list all devices
- Filter for devices with `max_input_channels > 0`
- Exclude problematic devices (Sound Mapper, etc.)

### 2. Samplerate Testing
For each device, test samplerates in order:
1. 16000 Hz (preferred for voice)
2. 48000 Hz (high quality)
3. 44100 Hz (standard audio)

### 3. Two-Phase Audio Capture

**Phase 1: Noise Floor**
- Capture 1 second of ambient room noise
- Calculate RMS noise level

**Phase 2: Voice Test**
- Play optional beep notification
- Start capture with 500ms pre-roll buffer
- Use WebRTC VAD to detect voice activity
- Record until 5 seconds of silence or 10-second timeout
- Calculate voice RMS during speech segments

### 4. Metrics Calculation

- **noise_rms**: RMS level during quiet phase
- **voice_rms**: RMS level during speech
- **snr_db**: Signal-to-noise ratio in decibels
- **voiced_ratio**: Percentage of frames detected as speech
- **start_delay_ms**: Time from speech onset to VAD detection
- **clipping_pct**: Percentage of samples near digital clipping
- **dropouts**: Audio stream discontinuities

### 5. Scoring Algorithm

```
score = 0.50 * normalize(snr_db, max=35) +
        0.20 * voice_quality(voiced_ratio, optimal=0.4-0.8) -
        0.15 * delay_penalty(start_delay_ms, target=0-40ms) -
        0.10 * clipping_penalty(clipping_pct, max=5%) -
        0.05 * dropout_penalty(dropouts)
```

**Tie-breakers:**
1. Lower start delay
2. Higher SNR

## Configuration Persistence

Results are saved to `config/audio.json`:

```json
{
  "machine": "COMPUTERNAME",
  "device_id": 9,
  "device_name": "Microphone Array (AMD ...)",
  "samplerate": 16000,
  "frame_ms": 10,
  "vad_mode": 1,
  "start_voiced_frames": 2,
  "end_unvoiced_frames": 500,
  "preroll_ms": 500,
  "silence_hold_ms": 5000,
  "updated_at": "2025-01-16T10:30:00"
}
```

## Verification

Test the implementation with PowerShell:

```powershell
$B = "http://127.0.0.1:3001"

# List devices
Invoke-RestMethod "$B/mic/list"

# Run wizard
Invoke-RestMethod -Method Post -Uri "$B/mic/wizard" -ContentType "application/json" -Body (@{} | ConvertTo-Json)

# Use specific device
Invoke-RestMethod -Method Post -Uri "$B/mic/use" -ContentType "application/json" -Body (@{ id=9 } | ConvertTo-Json)
```

## Error Handling

- **No devices found**: Returns `{"ok": false, "error": "no_input_devices"}`
- **No working devices**: Returns `{"ok": false, "error": "no_working_devices"}`
- **Device access failure**: Logs warning and skips device
- **Audio capture failure**: Marks device as non-functional

## Half-Duplex Operation

The wizard temporarily disables TTS output during testing to prevent:
- Self-listening (microphone picking up speaker output)
- Audio driver conflicts
- Interference with voice detection

TTS is re-enabled after wizard completion.
