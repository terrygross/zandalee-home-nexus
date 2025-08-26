import os
from piper import PiperVoice
import sounddevice as sd
import numpy as np
import wave
import tempfile

# --- Configuration ---
VOICES_TO_TEST = [
    "en_US-lessac-medium.onnx",
    "en_US-amy-medium.onnx",
    "en_US-hfc_female-medium.onnx",
    "en_GB-southern_english_female-low.onnx",
]
TEST_SENTENCE = "Hello, my name is Zandalee. This is what my voice sounds like."

# --- Main Script ---
def play_audio_from_file(file_path):
    """Reads a WAV file and plays it."""
    try:
        with wave.open(file_path, 'rb') as wf:
            samplerate = wf.getframerate()
            audio_data = wf.readframes(wf.getnframes())
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
        
        sd.play(audio_np, samplerate=samplerate)
        sd.wait()
    except Exception as e:
        print(f"Could not play audio file. Error: {e}")

def main():
    print("--- Zandalee Voice Sampler ---")
    for model_path in VOICES_TO_TEST:
        if not os.path.exists(model_path):
            print(f"\n⚠️  Skipping: Model file not found at '{model_path}'")
            continue

        # Create a temporary file path
        temp_filename = tempfile.mktemp(suffix=".wav")
        
        try:
            print(f"\n🔊 Loading voice: {model_path}...")
            voice = PiperVoice.load(model_path)
            
            print("   Synthesizing sample...")
            
            # --- THE FIX IS HERE ---
            # Open the file with the 'wave' library in write-binary ('wb') mode
            # and pass the file handle directly to the synthesis function.
            with wave.open(temp_filename, 'wb') as wav_file:
                voice.synthesize_wav(wav_file, TEST_SENTENCE)

            print(f"   ▶️  Playing sample for '{model_path}'...")
            play_audio_from_file(temp_filename)

        except Exception as e:
            print(f"   ❌ Error processing voice {model_path}: {e}")
        finally:
            # Ensure the temporary file is always deleted
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            
    print("\n✅  Voice sampling complete.")

if __name__ == "__main__":
    main()