import numpy as np
import time
from faster_whisper import WhisperModel
import noisereduce as nr
import librosa
import webrtcvad
import torch

# --- Configuration ---
MODEL_SIZE = "base.en"
TARGET_SAMPLE_RATE = 16000
VAD_SILENCE_TIMEOUT = 2.0 # Seconds of silence to end recording
VAD_ENERGY_THRESHOLD = 300 # Sensitivity for speech detection

# --- Initialization ---
try:
    # Auto-detect GPU for faster performance
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(MODEL_SIZE, device=device, compute_type=compute_type)
    vad = webrtcvad.Vad(3) # Use the most aggressive VAD mode
except Exception as e:
    print(f"Could not initialize AI models in hotword_listener: {e}")
    model = None
    vad = None

def transcribe_request(audio_stream, channels, source_sample_rate, gain):
    """Records from a live pyaudio stream and transcribes with advanced processing."""
    if not model or not audio_stream or not vad: return ""

    audio_buffer = []
    last_speech_time = time.time()
    
    print("🎙️ Listening for request...")
    chunk_size = 1024
    
    # Record audio until silence is detected
    while time.time() - last_speech_time < VAD_SILENCE_TIMEOUT:
        try:
            pcm = audio_stream.read(chunk_size, exception_on_overflow=False)
            audio_chunk = np.frombuffer(pcm, dtype=np.int16)
            
            if channels > 1:
                audio_chunk = audio_chunk[0::channels] # Convert to mono
            audio_buffer.append(audio_chunk)
            
            # Update timer if speech energy is detected
            if np.abs(audio_chunk).mean() > VAD_ENERGY_THRESHOLD:
                last_speech_time = time.time()
        except IOError:
             time.sleep(0.05)

    if not audio_buffer: return ""
        
    print("🧠 Processing request...")
    audio_data_int16 = np.concatenate(audio_buffer, axis=0)
    audio_data_float = audio_data_int16.astype(np.float32) / 32768.0
    
    # Apply gain and processing
    audio_data_float = np.clip(audio_data_float * gain, -1.0, 1.0)
    if source_sample_rate != TARGET_SAMPLE_RATE:
        audio_data_float = librosa.resample(y=audio_data_float, orig_sr=source_sample_rate, target_sr=TARGET_SAMPLE_RATE)
    audio_data_float = nr.reduce_noise(y=audio_data_float, sr=TARGET_SAMPLE_RATE)
    
    # Transcribe the processed audio
    segments, _ = model.transcribe(audio_data_float, language="en")
    transcript = " ".join(seg.text for seg in segments).strip()
    print(f"📝 Transcript: {transcript}")
    return transcript
