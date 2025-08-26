# memory_commands.py — console handlers with .env sanity check
from __future__ import annotations
import os, json, shlex
from typing import Callable, Any
import memory as zmem
import project_manager as pm

# Run once guard so we don't repeat warnings
_ENV_VALIDATED = False

def _mask_secret(s: str) -> str:
    if not s:
        return ""
    if len(s) <= 10:
        return "•••"
    return f"{s[:6]}…{s[-4:]}"

def validate_env_for_memory(*, speak: Callable[[str], Any] | None = None) -> None:
    """
    Ensures memory-sensitive keys are present before storing/searching.
    Doesn't exit the process; surfaces actionable warnings once.
    """
    global _ENV_VALIDATED
    if _ENV_VALIDATED:
        return
    _ENV_VALIDATED = True

    issues: list[str] = []
    warnings: list[str] = []

    token = os.getenv("ZANDALEE_LAWS_TOKEN")
    if not token:
        warnings.append("ZANDALEE_LAWS_TOKEN not set — memory encryption at rest is DISABLED.")
    elif len(token) < 16:
        warnings.append(f"ZANDALEE_LAWS_TOKEN looks too short ({_mask_secret(token)}). Consider a longer passphrase.")

    # Screenshots config is handled by main; no need to duplicate here.
    if warnings:
        msg = " | ".join(warnings)
        print(f"[MEMORY ENV] {msg}")
        if speak:
            speak("Heads up: memory encryption may be disabled; check your token settings.")

def handle(cmd: str, MEM: zmem.Memory, speak: Callable[[str], Any], SEC=None) -> bool:
    """
    Returns True if the command was handled. Safe to call before your other handlers.
    """
    # Ensure env is sane for memory ops (one-time warning)
    validate_env_for_memory(speak=speak)

    low = cmd.strip().lower()

    # ---- Project commands ----
    if low.startswith(":project.new") or low.startswith(":project.create"):
        name = cmd.split(" ", 1)[1].replace(":project.new", "").replace(":project.create", "").strip().strip('"')
        if not name:
            print('Usage: :project.new "My Project Name"'); return True
        info = pm.ensure_project(name)
        speak(f"Project {info.name} {'created' if info.created else 'opened'}.")
        print(json.dumps({"ok": True, "project": info.name, "path": str(info.path), "created": info.created}, indent=2))
        return True

    if low.startswith(":project.switch"):
        name = cmd.split(" ", 1)[1].replace(":project.switch", "").strip().strip('"')
        if not name:
            print('Usage: :project.switch "ExistingProjectName"'); return True
        info = pm.ensure_project(name)
        speak(f"Switched to project {info.name}.")
        print(json.dumps({"ok": True, "project": info.name, "path": str(info.path), "created": info.created}, indent=2))
        return True

    if low == ":project.list":
        print(json.dumps(pm.list_projects(), indent=2)); return True

    # ---- Memory commands ----
    if low.startswith(":mem.learn"):
        # :mem.learn "text" kind=semantic tags=a,b importance=0.8 confidence=0.9 emotion=0.3 relevance=0.9
        parts = shlex.split(cmd)
        args = parts[1:]
        if not args:
            print('Usage: :mem.learn "text" kind=<procedural|semantic|episodic|working> tags=a,b importance=.. confidence=.. emotion=.. relevance=..')
            return True
        text = args[0]
        kv = {"kind":"semantic","tags":[],"importance":0.5,"confidence":0.5,"emotion":0.0,"relevance":0.5,"effort":0.0,"novelty":0.0}
        for token in args[1:]:
            if "=" in token:
                k,v = token.split("=",1)
                if k=="kind": kv["kind"]=v
                elif k=="tags": kv["tags"]=[s.strip() for s in v.split(",") if s.strip()]
                elif k in ("importance","confidence","emotion","relevance","effort","novelty"):
                    kv[k]=float(v)

        # Security gate (if provided)
        if SEC is not None:
            decision, reason = SEC.evaluate(text=text, action="memory.store", source={"kind":"text"})
            if decision == "block":
                speak("That memory looks unsafe. Blocking.")
                print("BLOCKED:", reason); return True
            if decision == "confirm":
                speak("Do you want me to store this memory? y/N")
                ans = input("Confirm memory store? (y/N): ").strip().lower()
                if ans not in ("y","yes"): print("Cancelled."); return True

        sal = {k:kv[k] for k in ("importance","confidence","emotion","relevance","effort","novelty")}
        proj = pm.active_project_path()
        tags = list(kv["tags"])
        if proj: tags.append(f"project:{proj.name}")
        rid = MEM.remember(text, kind=kv["kind"], tags=tags, salience=sal, provenance={"kind":"text"})
        print(f"Stored memory id={rid}"); speak("Memory stored.")
        return True

    if low.startswith(":mem.search"):
        q = cmd[len(":mem.search"):].strip()
        items = MEM.recall(q if q else None, k=10)
        if not items: print("(no results)"); return True
        for it in items:
            ts = (it.get("created_at") or "")[:19].replace("T"," ")
            print(f"[{ts}] #{it['id']} ({it['kind']}) {'/'.join(it.get('tags') or [])} :: {it['content']}")
        return True

    if low == ":mem.stats":
        print(json.dumps(MEM.stats(), indent=2)); return True

    if low == ":mem.snapshot":
        path = MEM.snapshot(); print("Snapshot written:", path); speak("Snapshot written."); return True

    if low.startswith(":mem.import"):
        p = cmd[len(":mem.import"):].strip().strip('"')
        if not p: print("Usage: :mem.import <snapshot.json|.enc>"); return True
        from pathlib import Path as _P
        if not _P(p).exists(): print("Not found:", p); return True
        n = MEM.import_snapshot(_P(p))
        print(f"Imported {n} items."); speak("Import complete."); return True

    if low.startswith(":mem.pin "):
        try:
            mid = int(cmd.split(" ", 1)[1].strip()); print("ok" if MEM.pin(mid) else "not found")
        except: print("Usage: :mem.pin <id>")
        return True

    if low.startswith(":mem.unpin "):
        try:
            mid = int(cmd.split(" ", 1)[1].strip()); print("ok" if MEM.unpin(mid) else "not found")
        except: print("Usage: :mem.unpin <id>")
        return True

    if low.startswith(":mem.rollup"):
        period = cmd.split(" ",1)[1].strip() if " " in cmd else None
        n, rid = MEM.rollup_month(period if period else None)
        print(json.dumps({"sources": n, "rollup_id": rid})); return True

    return False

# Back-compat alias so old imports work:
handle_console_command = handle
