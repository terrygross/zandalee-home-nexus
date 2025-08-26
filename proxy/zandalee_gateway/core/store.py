import json, os
from typing import List

def jsonl_read_all(path: str) -> List[dict]:
    if not os.path.exists(path): return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s: continue
            try: out.append(json.loads(s))
            except Exception: pass
    return out
