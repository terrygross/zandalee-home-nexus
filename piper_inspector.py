# piper_inspector.py
import os
from piper import PiperVoice

VOICE_MODEL_PATH = "en_US-lessac-medium.onnx"

print(f"--- Inspecting PiperVoice from model: {VOICE_MODEL_PATH} ---")

if not os.path.exists(VOICE_MODEL_PATH):
    print(f"ERROR: Make sure '{VOICE_MODEL_PATH}' is in this folder.")
else:
    try:
        voice = PiperVoice.load(VOICE_MODEL_PATH)

        print("\nAvailable functions for the 'PiperVoice' object:")
        print("-------------------------------------------------")

        # Print all available functions that don't start with an underscore
        for item in dir(voice):
            if not item.startswith('_'):
                print(item)
        print("-------------------------------------------------")

    except Exception as e:
        print(f"\nAn error occurred: {e}")