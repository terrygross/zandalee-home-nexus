import tkinter as tk
from tkinter import scrolledtext
import threading
import json
import time
import sys
import os
from datetime import datetime
import queue
import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel

# Initialize Whisper model (use "base" for speed, or "medium"/"large" for accuracy)
model = WhisperModel("base", compute_type="int8")

# Audio recording parameters
SAMPLE_RATE = 16000
CHUNK_SIZE = 1024
CHANNELS = 1
DTYPE = np.int16

# Placeholder dependencies (replace with your actual implementations)
def take_screenshot():
    return {"ocr_text": ""}  # Placeholder: Returns dictionary with OCR text

def execute_action(action):
    pass  # Placeholder: Executes JSON action (e.g., launch, type, click)

def extract_json_objects(text):
    return []  # Placeholder: Extracts JSON objects from text

def query_gemini(prompt):
    return ""  # Placeholder: Queries Gemini AI with prompt

LOG_PATH = "logs/session_log.txt"
END_PHRASES = ["that's it i'm done", "i'm done", "that's it"]

def log_event(text):
    try:
        os.makedirs("logs", exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {text.strip()}\n")
    except Exception as e:
        print(f"\U0001f6d1 Log write failed: {e}")

def listen_and_transcribe(stop_event, audio_queue):
    audio_buffer = []
    segments = []
    last_audio_time = time.time()
    silence_threshold = 0.01
    max_buffer_seconds = 10

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE, callback=lambda indata, frames, time, status: audio_queue.put(indata.copy()) if not stop_event.is_set() else None):
        while not stop_event.is_set():
            try:
                chunk = audio_queue.get(timeout=1)
                audio_buffer.append(chunk)
                energy = np.abs(chunk).mean()
                log_event(f"[Transcription Debug] Chunk energy: {energy:.4f}")
                if energy > silence_threshold:
                    last_audio_time = time.time()
                buffer_duration = len(audio_buffer) * CHUNK_SIZE / SAMPLE_RATE
                if buffer_duration >= max_buffer_seconds or (time.time() - last_audio_time > 2.0 and audio_buffer):
                    audio_data = np.concatenate(audio_buffer, axis=0)
                    audio_data = audio_data.astype(np.float32) / np.iinfo(DTYPE).max
                    log_event(f"[Transcription Debug] Processing buffer: {buffer_duration:.2f} seconds")
                    try:
                        whisper_segments, _ = model.transcribe(audio_data, language="en", beam_size=5)
                        for segment in whisper_segments:
                            text = segment.text.strip()
                            if text:
                                segments.append(text)
                                log_event(f"[Transcription Debug] Segment: {text}")
                    except Exception as e:
                        log_event(f"[Transcription Debug] Transcription error: {e}")
                    audio_buffer = []
                if time.time() - last_audio_time > 5.0 and not audio_buffer:
                    log_event("[Transcription Debug] Silence detected, stopping transcription")
                    break
            except queue.Empty:
                continue
            except Exception as e:
                log_event(f"[Transcription Debug] Error: {e}")
                break

    return segments

def run_gui():
    root = tk.Tk()
    root.title("Zandalee AI")
    root.geometry("400x100")
    label = tk.Label(root, text="Zandalee Voice Agent is running...", font=("Segoe UI", 12))
    label.pack(pady=20)
    root.mainloop()

if __name__ == "__main__":
    try:
        run_gui()
    except Exception as e:
        with open("error_log.txt", "w") as f:
            f.write(str(e))
        raise
