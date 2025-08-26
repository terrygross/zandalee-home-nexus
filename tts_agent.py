import os
import sounddevice as sd
import numpy as np
import wave
import tempfile
from piper import PiperVoice

# --- Configuration ---
# Set to the voice you have chosen.
VOICE_MODEL_PATH = "en_GB-southern_english_female-low.onnx" 

# --- Initialization ---
try:
    if not os.path.exists(VOICE_MODEL_PATH):
        raise FileNotFoundError(f"TTS model not found at '{VOICE_MODEL_PATH}'")
    voice = PiperVoice.load(VOICE_MODEL_PATH)
except Exception as e:
    print(f"❌ CRITICAL TTS ERROR: Could not load voice model. {e}")
    voice = None

def speak(text: str):
    """Generates and plays audio using the loaded Piper TTS engine."""
    if not voice:
        print(f"TTS Error: Voice model not loaded. Cannot speak: '{text}'")
        return
    
    print(f"🗣️ Zandalee says: {text}")
    
    # Synthesize to a temporary WAV file for maximum stability
    temp_filename = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
            temp_filename = temp_wav.name
        
        with wave.open(temp_filename, 'wb') as wav_file:
            wav_file.setnchannels(voice.config.num_channels)
            wav_file.setsampwidth(voice.config.sample_width)
            wav_file.setframerate(voice.config.sample_rate)
            voice.synthesize(text, wav_file)

        # Play the audio from the temporary file
        with wave.open(temp_filename, 'rb') as wf:
            samplerate = wf.getframerate()
            audio_data = wf.readframes(wf.getnframes())
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
        
        sd.play(audio_np, samplerate=samplerate)
        sd.wait()
    except Exception as e:
        print(f"❌ TTS playback error: {e}")
    finally:
        # Ensure the temporary file is always deleted
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)
