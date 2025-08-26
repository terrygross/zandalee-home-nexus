import os
import time
import pytesseract
from PIL import ImageGrab, Image
from colorama import Fore, Style

def take_screenshot():
    timestamp = int(time.time())
    filename = f"screenshot_{timestamp}.png"
    session_dir = f"logs/session_{time.strftime('%Y-%m-%d_%H-%M-%S')}"

    os.makedirs(session_dir, exist_ok=True)
    filepath = os.path.join(session_dir, filename)

    # Capture screen
    img = ImageGrab.grab()
    img.save(filepath)
    print(f"📸 Screenshot saved: {filename}")

    # OCR
    try:
        text = pytesseract.image_to_string(img)
        with open(os.path.join(session_dir, "ocr.txt"), "w", encoding="utf-8") as f:
            f.write(text)
        print(Fore.CYAN + f"🔍 OCR captured text:\n{text[:300]}..." + Style.RESET_ALL)
    except Exception as e:
        print(Fore.RED + f"❌ OCR failed: {e}" + Style.RESET_ALL)
        text = ""

    return {
        "image_path": filepath,
        "ocr_text": text,
        "session_dir": session_dir
    }
