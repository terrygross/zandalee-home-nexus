# gemini_agent.py
import google.generativeai as genai
import os
import json
from colorama import Fore, Style

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyDfmXyktP93JG5bJbqCAjd_LMyBvmQ5cU0"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("models/gemini-1.5-flash")  # ✅ WORKING MODEL

def query_gemini(prompt):
    print(Fore.CYAN + "🔮 Querying Gemini..." + Style.RESET_ALL)
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        print(Fore.YELLOW + "🧪 Gemini RAW:" + Style.RESET_ALL, text[:300] + "...")
        return text
    except Exception as e:
        print(Fore.RED + f"❌ Gemini failed: {e}" + Style.RESET_ALL)
        return ""
