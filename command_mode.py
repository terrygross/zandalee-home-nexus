# command_mode.py
import os
import time
import json
from colorama import Fore, Style
from screenshot_agent import take_screenshot
from mouse_keyboard_agent import execute_action
from orchestrator import extract_json_objects
from gemini_agent import query_gemini
from voice_agent import listen_and_transcribe
import webbrowser

def interpret_human_command(user_input: str):
    lowered = user_input.lower()

    if lowered.startswith("remind me") or "calendar" in lowered:
        return [{"action": "launch", "application": "outlookcal:"}]
    elif lowered.startswith("google ") or lowered.startswith("search for ") or "google this" in lowered:
        query = user_input.replace("google", "").replace("search for", "").replace("this", "").strip()
        return [
            {"action": "focus", "target": "chrome"},
            {"action": "hotkey", "keys": ["ctrl", "l"]},
            {"action": "type", "text": f"https://www.google.com/search?q={query}"},
            {"action": "keypress", "key": "enter"}
        ]
    elif "screenshot" in lowered:
        return [{"action": "screenshot"}]

    return None

def handle_custom_action(action):
    if action["action"] == "websearch":
        query = action.get("query", "")
        webbrowser.open(f"https://www.google.com/search?q={query}")
        print(Fore.GREEN + f"🌐 Searched Google for: {query}" + Style.RESET_ALL)
    elif action["action"] == "screenshot":
        path = take_screenshot()
        print(Fore.GREEN + f"📸 Screenshot saved to: {path['filename']}" + Style.RESET_ALL)
    else:
        execute_action(action)

def main():
    print(Fore.CYAN + "🧠 Command Mode: Type instructions below. Type 'exit' to quit.\n" + Style.RESET_ALL)

    while True:
        try:
            user_input = input("💬 Your command: ").strip()
            if user_input.lower() == "exit":
                break
            elif user_input.lower() == "voice":
                user_input = listen_and_transcribe()
                if not user_input:
                    continue

            custom_actions = interpret_human_command(user_input)
            if custom_actions:
                print(Fore.GREEN + "💡 Using built-in smart interpretation" + Style.RESET_ALL)
                for action in custom_actions:
                    print(Fore.MAGENTA + f"\n➡️ Action:\n{json.dumps(action, indent=2)}" + Style.RESET_ALL)
                    handle_custom_action(action)
                continue

            screenshot_path = take_screenshot()

            prompt = (
                "You are a desktop control AI. Based on the user's prompt and current screen OCR, "
                "return one or more JSON commands to execute.\n\n"
                f"User Prompt: {user_input}\n\n"
                f"OCR Text: {screenshot_path['ocr_text']}\n\n"
                "Only respond with raw JSON like:\n"
                '{ "action": "type", "text": "Hello world" }\n'
                'or:\n'
                '{ "action": "click", "x": 400, "y": 300 }\n'
                "If unsure, return an empty object.\n"
            )

            ai_output = query_gemini(prompt)
            actions = extract_json_objects(ai_output)

            if not actions:
                print(Fore.YELLOW + "⚠️ No valid actions returned." + Style.RESET_ALL)
                continue

            print(Fore.MAGENTA + f"🎬 Replaying {len(actions)} action(s):" + Style.RESET_ALL)
            for i, action in enumerate(actions):
                print(Fore.MAGENTA + f"\n➡️ Action {i+1}:\n{json.dumps(action, indent=2)}" + Style.RESET_ALL)
                execute_action(action)
                time.sleep(0.5)

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(Fore.RED + f"❌ Error: {e}" + Style.RESET_ALL)

if __name__ == "__main__":
    main()
