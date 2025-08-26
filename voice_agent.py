import speech_recognition as sr

def listen_and_transcribe():
    recognizer = sr.Recognizer()
    mic_index = 1  # Use working mic index
    try:
        with sr.Microphone(device_index=mic_index) as source:
            print("🎙️ Listening on mic index 1...")
            recognizer.pause_threshold = 1.2  # Allow slight pauses
            recognizer.phrase_time_limit = 20  # Max per segment
            recognizer.energy_threshold = 300  # Adjust if too insensitive
            recognizer.adjust_for_ambient_noise(source, duration=0.5)

            audio = recognizer.listen(source, timeout=5, phrase_time_limit=20)
            print("🧠 Processing...")
            return recognizer.recognize_google(audio)

    except sr.WaitTimeoutError:
        print("⏱️ Timed out waiting for speech.")
        return None
    except sr.UnknownValueError:
        print("❌ Could not understand audio.")
        return None
    except sr.RequestError as e:
        print(f"❌ API error: {e}")
        return None
    except Exception as e:
        print(f"❌ Voice Error: {e}")
        return None
