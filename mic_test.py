import sounddevice as sd
from scipy.io.wavfile import write

DEVICE_ID = 9  # ✅ Confirmed mic from earlier
DURATION = 5  # seconds

# Get default sample rate for this device
device_info = sd.query_devices(DEVICE_ID)
sample_rate = int(device_info['default_samplerate'])

print(f"🎙️ Recording 5s from device {DEVICE_ID} at {sample_rate} Hz...")
recording = sd.rec(int(DURATION * sample_rate),
                   samplerate=sample_rate,
                   channels=1,
                   dtype='int16',
                   device=DEVICE_ID)
sd.wait()

OUTPUT_FILE = "test_output.wav"
write(OUTPUT_FILE, sample_rate, recording)
print(f"✅ Saved: {OUTPUT_FILE}")
