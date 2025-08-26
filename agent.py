import os
import openai
import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load Together API key from .env (force full path)
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
openai.api_key = os.getenv("TOGETHER_API_KEY")
openai.api_base = "https://api.together.xyz/v1"

# Read the prompt (your app idea)
with open("prompt.txt", "r", encoding="utf-8") as f:
    idea = f.read().strip()

print(f"🚀 Building: {idea}")

# Send to Together AI
response = openai.ChatCompletion.create(
    model="mistralai/Mixtral-8x7B-Instruct-v0.1",
    messages=[
        {"role": "system", "content": "You are a senior developer. Write complete, working code for the user's idea."},
        {"role": "user", "content": f"Build this:\n\n{idea}\n\nReturn only code, not explanations."}
    ],
    max_tokens=2048,
    temperature=0.5
)

# Extract code
reply = response["choices"][0]["message"]["content"]
print("✅ Response received.")

# Create a timestamped folder
timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
folder_path = os.path.join("projects", f"build_{timestamp}")
os.makedirs(folder_path, exist_ok=True)

# Save generated code
filename = os.path.join(folder_path, "main_output.txt")
with open(filename, "w", encoding="utf-8") as f:
    f.write(reply)

print(f"📁 Code saved to {filename}")

# Log the build
log_file = os.path.join("logs", f"log_{timestamp}.txt")
with open(log_file, "w", encoding="utf-8") as f:
    f.write(f"Prompt:\n{idea}\n\nResponse:\n{reply}")

print(f"📝 Log saved to {log_file}")
