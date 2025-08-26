import os
import time
import json
import requests
import traceback
from colorama import Fore, Style
from dotenv import load_dotenv

load_dotenv()

# --- Agent Imports ---
# We assume these files exist and have the necessary functions
from screenshot_agent import take_screenshot
from mouse_keyboard_agent import execute_action
# Note: speak function is now passed in as an argument, so we don't import it here

# --- Configuration ---
MODEL_NAME = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {TOGETHER_API_KEY}",
    "Content-Type": "application/json"
}

def query_together_ai(prompt):
    """Sends a prompt to the Together AI API and returns the text output."""
    print(Fore.CYAN + "🤖 Querying Together AI for actions...")
    payload = {
        "model": MODEL_NAME, "prompt": prompt, "max_tokens": 600, "temperature": 0.7,
        "top_p": 0.9, "repetition_penalty": 1.1, "stop": ["User:", "Assistant:"]
    }
    try:
        response = requests.post("https://api.together.xyz/inference", headers=HEADERS, json=payload)
        response.raise_for_status()
        result = response.json()
        output_text = result.get("output", {}).get("choices", [{}])[0].get("text", "")
        print(Fore.YELLOW + "🧪 RAW AI RESPONSE:" + Style.RESET_ALL, output_text[:300].strip() + "...")
        return output_text
    except Exception as e:
        print(Fore.RED + f"❌ AI query failed: {e}")
        return ""

def extract_json_objects(text):
    """Extracts JSON objects from a string using regex."""
    import re
    actions = []
    try:
        # Prioritize finding a complete JSON array
        array_match = re.search(r'\[\s*{[\s\S]*?}\s*]', text)
        if array_match:
            return json.loads(array_match.group())
        
        # Fallback to finding individual JSON objects
        object_matches = re.findall(r'{[^{}]+}', text)
        for obj_str in object_matches:
            try:
                actions.append(json.loads(obj_str))
            except json.JSONDecodeError:
                continue
        return actions
    except Exception as e:
        print(Fore.RED + f"❌ Failed to extract JSON: {e}")
        return []

def handle_instruction(instruction: str, speak_func):
    """
    This is the main function called by main.py. It now fully processes requests.
    """
    instruction = instruction.strip()
    
    # 1. Handle JSON input for direct execution
    try:
        data = json.loads(instruction)
        actions = data if isinstance(data, list) else [data]
        speak_func("JSON instruction detected. Executing now.")
        for action in actions:
            execute_action(action)
            time.sleep(0.5)
        return
    except (json.JSONDecodeError, TypeError):
        pass

    # 2. Handle natural language by connecting to the AI "brain"
    try:
        speak_func(f"Okay, thinking about: {instruction}")
        
        screenshot_data = take_screenshot()
        prompt = (
            "You are a desktop control AI. Based on the user's request and screen OCR, "
            "return one or more JSON commands in a list.\n\n"
            f"User Request: {instruction}\n\n"
            f"OCR Text: {screenshot_data['ocr_text']}\n\n"
            "Only respond with raw JSON in a list format, e.g., "
            '[ { "action": "type", "text": "Hello world" } ]. '
            "If you cannot determine an action, return an empty list []."
        )

        ai_output = query_together_ai(prompt)
        actions = extract_json_objects(ai_output)

        if not actions:
            speak_func("I understood the request, but I couldn't determine a valid action to take.")
            return

        speak_func(f"I have a plan with {len(actions)} steps. Starting now.")
        for i, action in enumerate(actions):
            print(Fore.MAGENTA + f"➡️ Step {i+1}: {json.dumps(action)}")
            execute_action(action)
            time.sleep(0.5)
            
        speak_func("I've completed the request.")

    except Exception as e:
        traceback.print_exc()
        speak_func("I'm sorry, I ran into an unexpected error with that request.")