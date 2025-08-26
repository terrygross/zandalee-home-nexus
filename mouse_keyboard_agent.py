# mouse_keyboard_agent.py
import pyautogui
import time
import subprocess
from colorama import Fore, Style
import pygetwindow as gw

def focus_chrome():
    try:
        chrome_windows = [w for w in gw.getWindowsWithTitle('Chrome') if w.isVisible]
        if not chrome_windows:
            raise Exception("No Chrome window found.")
        chrome_windows[0].activate()
        print(Fore.GREEN + "🧭 Switched to Chrome window." + Style.RESET_ALL)
        time.sleep(0.5)
        return True
    except Exception as e:
        print(Fore.RED + f"❌ Could not switch to Chrome: {e}" + Style.RESET_ALL)
        return False

def execute_action(action):
    action_type = action.get("action")

    if action_type == "click":
        x = action.get("x")
        y = action.get("y")
        if x is not None and y is not None:
            print(Fore.GREEN + f"🖱️ Clicking at ({x}, {y})" + Style.RESET_ALL)
            pyautogui.click(x, y)

    elif action_type == "move":
        x = action.get("x")
        y = action.get("y")
        duration = action.get("duration", 0.25)
        if x is not None and y is not None:
            print(Fore.GREEN + f"🕹️ Moving to ({x}, {y}) over {duration}s" + Style.RESET_ALL)
            pyautogui.moveTo(x, y, duration=duration)

    elif action_type == "type":
        text = action.get("text", "")
        print(Fore.GREEN + f"⌨️ Writing: {text}" + Style.RESET_ALL)
        pyautogui.write(text, interval=0.05)

    elif action_type == "keypress":
        key = action.get("key")
        if key:
            print(Fore.GREEN + f"⌨️ Pressing key: {key}" + Style.RESET_ALL)
            pyautogui.press(key)

    elif action_type == "hotkey":
        keys = action.get("keys", [])
        if isinstance(keys, list) and keys:
            print(Fore.GREEN + f"🎹 Pressing hotkey combo: {' + '.join(keys)}" + Style.RESET_ALL)
            pyautogui.hotkey(*keys)

    elif action_type == "scroll":
        amount = action.get("amount", 0)
        print(Fore.GREEN + f"🖱️ Scrolling: {amount}" + Style.RESET_ALL)
        pyautogui.scroll(amount)

    elif action_type == "sleep":
        duration = action.get("duration", 1)
        print(Fore.GREEN + f"⏳ Sleeping for {duration} seconds..." + Style.RESET_ALL)
        time.sleep(duration)

    elif action_type == "launch":
        program = action.get("application") or action.get("program") or ""
        program = program.lower().strip()

        app_aliases = {
            "notepad": "notepad",
            "editor": "notepad",
            "textpad": "notepad",
            "write": "notepad",
            "jot": "notepad"
        }

        exe = app_aliases.get(program, program)

        if exe:
            print(Fore.GREEN + f"🚀 Opening program: {exe}" + Style.RESET_ALL)
            subprocess.Popen(exe)
            time.sleep(1.5)

            if "notepad" in exe:
                pyautogui.hotkey("ctrl", "n")
                time.sleep(0.5)

    elif action_type == "focus" and action.get("target") == "chrome":
        focus_chrome()

    else:
        print(Fore.RED + f"❓ Unknown action type: {action_type}" + Style.RESET_ALL)
