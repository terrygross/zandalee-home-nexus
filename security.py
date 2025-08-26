# security.py — minimal policy store + token-gated core-laws updates
from __future__ import annotations
import os, json
from pathlib import Path
from typing import Tuple, Any, Dict

APP_DIR = Path(os.getenv("APPDATA") or Path.home()) / "Zandalee"
APP_DIR.mkdir(parents=True, exist_ok=True)
POLICY_PATH = APP_DIR / "security_policy.json"
LAWS_TOKEN = os.getenv("ZANDALEE_LAWS_TOKEN", "")

_DEFAULT = {"domains": {"allow": [], "block": []}, "apps": {"allow": [], "block": []}}

class Security:
    def __init__(self):
        if not POLICY_PATH.exists():
            POLICY_PATH.write_text(json.dumps(_DEFAULT, indent=2), encoding="utf-8")
        self._policy = self._load()

    # --- Core laws token check ---
    def authorize_core_law_change(self, token: str) -> bool:
        return bool(LAWS_TOKEN and token and token == LAWS_TOKEN)

    # --- Policy ops ---
    def _load(self) -> Dict[str, Any]:
        try:
            return json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        except Exception:
            return json.loads(json.dumps(_DEFAULT))

    def save_policy(self) -> Tuple[bool, str]:
        try:
            POLICY_PATH.write_text(json.dumps(self._policy, indent=2), encoding="utf-8")
            return True, "saved"
        except Exception as e:
            return False, str(e)

    def list_policy(self) -> Tuple[bool, Dict[str, Any]]:
        return True, self._policy

    def allow_domain(self, host: str): 
        s = set(self._policy["domains"]["allow"]); s.add(host); self._policy["domains"]["allow"] = sorted(s); return True, f"domain allowed: {host}"
    def block_domain(self, host: str): 
        s = set(self._policy["domains"]["block"]); s.add(host); self._policy["domains"]["block"] = sorted(s); return True, f"domain blocked: {host}"
    def allow_app(self, exe: str): 
        s = set(self._policy["apps"]["allow"]); s.add(exe); self._policy["apps"]["allow"] = sorted(s); return True, f"app allowed: {exe}"
    def block_app(self, exe: str): 
        s = set(self._policy["apps"]["block"]); s.add(exe); self._policy["apps"]["block"] = sorted(s); return True, f"app blocked: {exe}"

    # --- Runtime risk evaluation (stub: default-allow) ---
    def evaluate(self, *, text: str = "", action: str = "", source: Dict[str, Any] | None = None):
        # You can expand with heuristics or blocklists.
        return "allow", "default"
