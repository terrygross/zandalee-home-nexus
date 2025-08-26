# gui_agent.py

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
from multiprocessing import Process
from tts_agent import speak
from hotword_listener import listen_loop  # ✅ You must have this file ready!

# === Whisper Configuration ===
model = WhisperModel("base", compute_type="int8")
SAMPLE_RATE = 16000
CHUNK_SIZE = 1024
CHANNELS = 1
DTYPE = np.int16

LOG_PATH = "logs/session_log.txt"
END_PHRASES = ["that's it i'm done", "i'm done", "that's it"]

hotword_process = None
hotword_enabled = False

def log_event(text):
    try:
        os.makedirs("logs", exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {text.strip()}\n")
    except Exception as e:
        print(f"⚠️ Log write failed: {e}")

def listen_and_transcribe_live(stop_event, audio_queue, gui_callback):
    audio_buffer = []
    last_audio_time = time.time()
    silence_threshold = 0.01

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE,
                        callback=lambda indata, frames, time, status: audio_queue.put(indata.copy())
                        if not stop_event.is_set() else None):
        while not stop_event.is_set():
            try:
                chunk = audio_queue.get(timeout=1)
                audio_buffer.append(chunk)
                energy = np.abs(chunk).mean()
                if energy > silence_threshold:
                    last_audio_time = time.time()

                buffer_duration = len(audio_buffer) * CHUNK_SIZE / SAMPLE_RATE
                if buffer_duration >= 5.0 or (time.time() - last_audio_time > 2.0 and audio_buffer):
                    audio_data = np.concatenate(audio_buffer, axis=0)
                    audio_data = audio_data.astype(np.float32) / np.iinfo(DTYPE).max
                    try:
                        segments, _ = model.transcribe(audio_data, language="en", beam_size=5)
                        for segment in segments:
                            text = segment.text.strip()
                            if text:
                                gui_callback(text)
                    except Exception as e:
                        gui_callback(f"[error] {e}")
                    audio_buffer = []

                if time.time() - last_audio_time > 6.0 and not audio_buffer:
                    gui_callback("[system] Silence detected. Stopping.")
                    break

            except queue.Empty:
                continue

class AgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Zandalee AI")
        self.root.geometry("600x470")
        self.root.configure(bg="#111")
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        self.input_box = tk.Entry(root, font=("Segoe UI", 14), bg="#222", fg="white", insertbackground="white")
        self.input_box.pack(fill=tk.X, padx=10, pady=(10, 5))
        self.input_box.bind("<Return>", lambda e: self.handle_text())

        btn_frame = tk.Frame(root, bg="#111")
        btn_frame.pack(pady=5)

        self.cmd_button = tk.Button(btn_frame, text="Run Command", command=self.handle_text, bg="#444", fg="white")
        self.cmd_button.pack(side=tk.LEFT, padx=5)

        self.voice_button = tk.Button(btn_frame, text="🎤 Whisper Voice", command=self.handle_whisper_voice, bg="#444", fg="white")
        self.voice_button.pack(side=tk.LEFT, padx=5)

        self.toggle_btn = tk.Button(btn_frame, text="Enable Passive Listening", command=self.toggle_hotword, bg="#333", fg="white")
        self.toggle_btn.pack(side=tk.LEFT, padx=5)

        self.status_label = tk.Label(root, text="Passive Listening: OFF", fg="red", bg="#111", font=("Segoe UI", 10))
        self.status_label.pack(pady=(5, 2))

        tk.Label(root, text="🗣 Say 'That's it, I'm done' to finish", fg="gray", bg="#111", font=("Segoe UI", 10)).pack(pady=(2, 5))

        self.output = scrolledtext.ScrolledText(root, font=("Consolas", 11), bg="#111", fg="lime", wrap=tk.WORD)
        self.output.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        self.log("Zandalee AI ready.")

    def log(self, msg):
        self.output.insert(tk.END, f"{msg}\n")
        self.output.see(tk.END)
        log_event(msg)

    def toggle_hotword(self):
        global hotword_process, hotword_enabled
        if hotword_enabled:
            if hotword_process:
                hotword_process.terminate()
                hotword_process = None
            self.toggle_btn.config(text="Enable Passive Listening")
            self.status_label.config(text="Passive Listening: OFF", fg="red")
            self.log("🔕 Passive Listening disabled.")
            speak("Passive listening disabled.")
            hotword_enabled = False
        else:
            hotword_process = Process(target=listen_loop)
            hotword_process.start()
            self.toggle_btn.config(text="Disable Passive Listening")
            self.status_label.config(text="Passive Listening: ON", fg="green")
            self.log("🎧 Passive Listening enabled.")
            speak("Passive listening enabled.")
            hotword_enabled = True

    def handle_text(self):
        user_input = self.input_box.get().strip()
        if not user_input:
            return
        self.input_box.delete(0, tk.END)
        self.log(f"> {user_input}")
        threading.Thread(target=self.process_command, args=(user_input,)).start()

    def handle_whisper_voice(self):
        self.log("🎤 Listening with Whisper...")
        stop_event = threading.Event()
        audio_queue = queue.Queue()
        threading.Thread(target=listen_and_transcribe_live, args=(stop_event, audio_queue, self.handle_transcription)).start()
        threading.Timer(12, lambda: stop_event.set()).start()

    def handle_transcription(self, text):
        self.log(f"🗣️ {text}")
        if any(end in text.lower() for end in END_PHRASES):
            self.log("✅ Trigger phrase detected.")
        else:
            threading.Thread(target=self.process_command, args=(text,)).start()

    def process_command(self, user_input):
        try:
            log_event(f"[Command Input] {user_input}")
            lowered = user_input.lower()
            for phrase in [
                "jot down a note", "jot down", "note to self", "drop down a note", "write this down",
                "not down", "lockdown a", "take a note", "write me a note",
                "zandalee"
            ] + END_PHRASES:
                lowered = lowered.replace(phrase, "")

            lowered = lowered.strip()
            log_event(f"[Cleaned Input] {lowered}")

            if not lowered:
                actions = [
                    {"action": "launch", "application": "notepad"},
                    {"action": "sleep", "duration": 1.5},
                    {"action": "type", "text": user_input.strip()}
                ]
            elif any(x in lowered for x in ["note", "write", "thought"]):
                actions = [
                    {"action": "launch", "application": "notepad"},
                    {"action": "sleep", "duration": 1.5},
                    {"action": "type", "text": lowered.strip()}
                ]
            elif lowered.startswith("remind me") or "calendar" in lowered:
                actions = [{"action": "launch", "application": "outlookcal:"}]
            elif lowered.startswith("google ") or lowered.startswith("search for ") or "google this" in lowered:
                query = lowered.replace("google", "").replace("search for", "").replace("this", "").strip()
                actions = [
                    {"action": "focus", "target": "chrome"},
                    {"action": "hotkey", "keys": ["ctrl", "l"]},
                    {"action": "type", "text": f"https://www.google.com/search?q={query}"},
                    {"action": "keypress", "key": "enter"}
                ]
            elif "screenshot" in lowered:
                actions = [{"action": "screenshot"}]
            else:
                screenshot = take_screenshot()
                prompt = (
                    "You are a desktop control AI. Based on the user's prompt and current screen OCR, "
                    "return one or more JSON commands to execute.\n\n"
                    f"User Prompt: {user_input}\n\n"
                    f"OCR Text: {screenshot['ocr_text']}\n\n"
                    "Respond only with raw JSON."
                )
                ai_output = query_gemini(prompt)
                actions = extract_json_objects(ai_output)

            if not actions:
                self.log("⚠️ No valid actions.")
                return

            for i, action in enumerate(actions):
                self.log(f"➡️ Action {i+1}: {json.dumps(action)}")
                execute_action(action)
                time.sleep(0.5)

        except Exception as e:
            self.log(f"❌ Error: {e}")
            log_event(f"[ERROR] {e}")

    def close(self):
        global hotword_process
        if hotword_process:
            hotword_process.terminate()
        self.root.quit()

def run_gui():
    root = tk.Tk()
    app = AgentGUI(root)
    root.mainloop()

if __name__ == "__main__":
    try:
        run_gui()
    except Exception as e:
        with open("error_log.txt", "w") as f:
            f.write(str(e))
        raise
