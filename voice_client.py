import sys, argparse
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
LLM_DIR = ROOT / "local-talking-llm"
sys.path.insert(0, str(LLM_DIR))

def _speak(text: str):
    from tts import TextToSpeechService  # from local-talking-llm\tts.py
    import sounddevice as sd
    tts = TextToSpeechService()
    sr, wav = tts.long_form_synthesize(text)
    sd.play(wav, sr)
    sd.wait()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--transport", default="STDIO")
    p.add_argument("--speak", default="")
    args = p.parse_args()
    if args.speak:
        _speak(args.speak)

if __name__ == "__main__":
    main()
