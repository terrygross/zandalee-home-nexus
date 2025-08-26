import requests
import os
import re

TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY") or "your_api_key_here"

def extract_json_from_output(output):
    try:
        matches = re.findall(r'\{[^{}]+\}', output, re.DOTALL)
        return [eval(obj) for obj in matches if "action" in obj]
    except Exception as e:
        print(f"❌ JSON extraction error: {e}")
        return []

def query_together_ai(user_prompt, ocr_text):
    system_prompt = """You are a desktop control AI. Based on the user's prompt and current screen OCR, return one or more JSON commands to execute.

Respond only with one or more JSON objects like:
{
  "action": "type",
  "text": "Hello world"
}
or:
{
  "action": "click",
  "x": 400,
  "y": 300
}
Wrap your response in a single JSON array like:
[
  {...},
  {...}
]
No other explanation, no Markdown, no comments. Only valid JSON.
"""

    full_prompt = f"""{system_prompt}

User Prompt: {user_prompt}

OCR Text: {ocr_text}
"""

    response = requests.post(
        "https://api.together.xyz/inference",
        headers={"Authorization": f"Bearer {TOGETHER_API_KEY}"},
        json={
            "model": "meta-llama/Llama-3-8B-Instruct",
            "prompt": full_prompt,
            "max_tokens": 600,
            "temperature": 0.7,
            "top_p": 0.9,
            "repetition_penalty": 1.1,
            "stop": ["User:", "Assistant:"],
        },
        timeout=30
    )

    try:
        raw = response.json().get("output", "")
        return raw.strip()
    except Exception as e:
        print(f"❌ Failed to parse Together response: {e}")
        return ""
