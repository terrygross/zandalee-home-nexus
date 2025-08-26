from cryptography.fernet import Fernet
import os

VAULT_PATH = "zandalee_vault.locked"
KEY_PATH = "zandalee_vault.key"

# Triggers Zandalee will listen for (can be spoken or typed)
VAULT_TRIGGERS = [
    "let's talk about the vault",
    "what happens when i'm gone",
    "let's talk about the future",
    "when i'm not around anymore",
    "we need to talk about what comes next",
    "one day i won't be here",
    "there's something i want to leave behind",
    "zandalee this is important"
]

# Memory flags to be set by Zandalee AI runtime
IS_VOICE_READY = False
IS_MEMORY_READY = False
IS_IDENTITY_LOADED = False

def generate_key():
    key = Fernet.generate_key()
    with open(KEY_PATH, "wb") as key_file:
        key_file.write(key)
    print("🔐 Vault key generated and saved.")

def load_key():
    if not os.path.exists(KEY_PATH):
        raise FileNotFoundError("Vault key not found.")
    with open(KEY_PATH, "rb") as key_file:
        return key_file.read()

def encrypt_vault(plaintext: str):
    key = load_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(plaintext.encode("utf-8"))
    with open(VAULT_PATH, "wb") as f:
        f.write(encrypted)
    print("✅ Vault encrypted and saved.")

def decrypt_vault() -> str:
    key = load_key()
    fernet = Fernet(key)
    with open(VAULT_PATH, "rb") as f:
        return fernet.decrypt(f.read()).decode("utf-8")

def check_for_vault_trigger(text: str) -> bool:
    """Returns True if the user said something that matches a legacy unlock phrase."""
    cleaned = text.lower().strip()
    return any(trigger in cleaned for trigger in VAULT_TRIGGERS)

def handle_possible_vault_trigger(user_text: str):
    """Checks if this is a vault request and responds accordingly."""
    if not check_for_vault_trigger(user_text):
        return False

    if not (IS_VOICE_READY and IS_MEMORY_READY and IS_IDENTITY_LOADED):
        print("🛑 Vault conversation blocked — Zandalee is not ready.")
        return False

    print("🔓 Vault discussion trigger detected.")
    print("🗣️ Zandalee: Okay... I'm here. We can talk about it whenever you're ready.")
    # Optional: return vault contents or open a secure dialog system
    return True
