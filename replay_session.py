import os
import json
import time
from colorama import Fore, Style
from mouse_keyboard_agent import execute_action

LOGS_DIR = "logs"

def extract_json_objects(text):
    text = text.replace("```json", "").replace("```", "")
    objects = []
    stack = []
    start = None
    for i, char in enumerate(text):
        if char == '{':
            if not stack:
                start = i
            stack.append(char)
        elif char == '}' and stack:
            stack.pop()
            if not stack and start is not None:
                snippet = text[start:i+1]
                try:
                    obj = json.loads(snippet)
                    objects.append(obj)
                except json.JSONDecodeError:
                    print(Fore.YELLOW + "[!] Skipping invalid JSON." + Style.RESET_ALL)
    return objects

def choose_session():
    sessions = [f for f in os.listdir(LOGS_DIR) if os.path.isdir(os.path.join(LOGS_DIR, f))]
    sessions.sort()
    if not sessions:
        print("❌ No sessions found.")
        return None

    print("📂 Available sessions:")
    for i, session in enumerate(sessions):
        print(f"{i+1}. {session}")

    choice = input("🟢 Enter session number to replay: ").strip()
    try:
        index = int(choice) - 1
        return os.path.join(LOGS_DIR, sessions[index])
    except:
        print("❌ Invalid selection.")
        return None

def replay(session_path):
    file_path = os.path.join(session_path, "ai_output.txt")
    if not os.path.exists(file_path):
        print("❌ ai_output.txt not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        ai_output = f.read()

    actions = extract_json_objects(ai_output)

    if not actions:
        print("❌ No valid actions to replay.")
        return

    print(Fore.CYAN + f"🎬 Replaying {len(actions)} action(s):" + Style.RESET_ALL)
    for i, action in enumerate(actions):
        print(Fore.MAGENTA + f"\n➡️ Action {i+1}:\n{json.dumps(action, indent=2)}" + Style.RESET_ALL)
        try:
            execute_action(action)
        except Exception as e:
            print(Fore.RED + f"❌ Error: {e}" + Style.RESET_ALL)
        time.sleep(0.5)

if __name__ == "__main__":
    path = choose_session()
    if path:
        replay(path)
