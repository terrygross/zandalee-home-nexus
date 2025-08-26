# memory.py — Zandalee Memory Manager
# Ground-truth SQLite + journal + snapshots + hybrid recall + episodic rollups + procedural versions
from __future__ import annotations
import os, json, sqlite3, threading, argparse, uuid, base64, hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

# --------- Crypto (optional, token-gated) ----------
_CRYPTO_OK = False
try:
    from cryptography.fernet import Fernet
    _CRYPTO_OK = True
except Exception:
    Fernet = None  # type: ignore

def _derive_key_from_token(token: str) -> Optional[bytes]:
    if not (_CRYPTO_OK and token): return None
    h = hashlib.sha256(token.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(h)

class _Crypto:
    def __init__(self, token: Optional[str]):
        self.enabled = False
        self._fernet = None
        key = _derive_key_from_token(token or "")
        if key is not None:
            try:
                self._fernet = Fernet(key)  # type: ignore
                self.enabled = True
            except Exception:
                self.enabled = False

    def enc(self, s: str) -> str:
        if not (self.enabled and self._fernet): return s
        return "enc$" + self._fernet.encrypt(s.encode("utf-8")).decode("utf-8")

    def dec(self, s: str) -> str:
        if not (self.enabled and self._fernet): return s
        if not s.startswith("enc$"): return s
        ct = s[4:].encode("utf-8")
        return self._fernet.decrypt(ct).decode("utf-8")

    def enc_bytes(self, b: bytes) -> bytes:
        if not (self.enabled and self._fernet): return b
        return self._fernet.encrypt(b)

    def dec_bytes(self, b: bytes) -> bytes:
        if not (self.enabled and self._fernet): return b
        return self._fernet.decrypt(b)

# ---------------- Paths & Config ----------------

def _default_mem_dir() -> Path:
    base = Path(os.getenv("ZANDALEE_MEM_DIR", ""))
    if base:
        return Path(base)
    home = Path.home()
    return home / "Documents" / "Zandalee" / "zandalee_memories"

@dataclass
class MemoryConfig:
    base_dir: Path = _default_mem_dir()
    db_name: str = "mem.db"

# ---------------- Helpers ----------------

def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def _json_dumps(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False)

def _salience_score(s: Dict[str, Any]) -> float:
    importance = float(s.get("importance", 0.5))
    relevance  = float(s.get("relevance",  0.5))
    emotion    = float(s.get("emotion",    0.0))
    effort     = float(s.get("effort",     0.0))
    novelty    = float(s.get("novelty",    0.0))
    return 0.35*importance + 0.25*relevance + 0.20*emotion + 0.10*effort + 0.10*novelty

# ---------------- Memory Manager ----------------

class Memory:
    """
    Durable, human-like memory store (procedural | semantic | episodic | working)
    - Transparent field encryption (content/tags/salience/provenance) when ZANDALEE_LAWS_TOKEN is set
    - Encrypted journal (.enc) and encrypted snapshots (.enc)
    - Working log: lightweight rolling JSON array for operational traces
    """
    def __init__(self, cfg: Optional[MemoryConfig] = None):
        self.cfg = cfg or MemoryConfig()
        self.base = Path(self.cfg.base_dir)
        (self.base / "journal").mkdir(parents=True, exist_ok=True)
        (self.base / "snapshots").mkdir(parents=True, exist_ok=True)
        (self.base / "VERSION").write_text("mem-schema=1", encoding="utf-8")
        (self.base / "working_log.json").write_text("[]", encoding="utf-8") if not (self.base / "working_log.json").exists() else None

        token = os.getenv("ZANDALEE_LAWS_TOKEN", "")
        self.crypto = _Crypto(token)

        self.db_path = self.base / self.cfg.db_name
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._conn:
            self._conn.execute("PRAGMA journal_mode=WAL;")
            self._conn.execute("PRAGMA synchronous=NORMAL;")
            self._conn.execute("PRAGMA foreign_keys=ON;")
        self._init_schema()

    # ---------- Schema ----------
    def _init_schema(self):
        with self._conn:
            self._conn.execute("""
            CREATE TABLE IF NOT EXISTS meta (
              key TEXT PRIMARY KEY,
              value TEXT
            )""")
            self._conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
              id            INTEGER PRIMARY KEY AUTOINCREMENT,
              kind          TEXT NOT NULL,
              content       TEXT NOT NULL,
              tags          TEXT,
              salience      TEXT,
              provenance    TEXT,
              pinned        INTEGER DEFAULT 0,
              created_at    TEXT NOT NULL,
              updated_at    TEXT NOT NULL
            )""")
            # FTS is useful only if plaintext values are stored; when crypto is on we skip relying on FTS.
            self._conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
            USING fts5(content, tags, kind, content='memories', content_rowid='id')
            """)
            self._conn.execute("""
            CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
              INSERT INTO memories_fts(rowid, content, tags, kind)
              VALUES (new.id, new.content, new.tags, new.kind);
            END;""")
            self._conn.execute("""
            CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
              UPDATE memories_fts SET content=new.content, tags=new.tags, kind=new.kind
              WHERE rowid=new.id;
            END;""")
            self._conn.execute("""
            CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
              DELETE FROM memories_fts WHERE rowid=old.id;
            END;""")

            # Episodic rollups (monthly highlights)
            self._conn.execute("""
            CREATE TABLE IF NOT EXISTS episodic_rollups (
              id           INTEGER PRIMARY KEY AUTOINCREMENT,
              period       TEXT NOT NULL,
              summary      TEXT NOT NULL,
              source_ids   TEXT NOT NULL,
              created_at   TEXT NOT NULL
            )""")

            # Procedural versions (playbook change history)
            self._conn.execute("""
            CREATE TABLE IF NOT EXISTS procedural_versions (
              id           INTEGER PRIMARY KEY AUTOINCREMENT,
              subject_tag  TEXT NOT NULL,
              version      INTEGER NOT NULL,
              steps        TEXT NOT NULL,
              notes        TEXT,
              source_ids   TEXT,
              created_at   TEXT NOT NULL
            )""")

    # ---------- Working log ----------
    def _working_log(self, event: Dict[str, Any], limit: int = 500):
        path = self.base / "working_log.json"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = []
        event2 = {"ts": _utcnow(), **event}
        data.append(event2)
        if len(data) > limit:
            data = data[-limit:]
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- Journal ----------
    def _journal_append(self, event: Dict[str, Any]):
        ts = _utcnow()
        entry = {"ts": ts, "id": str(uuid.uuid4()), **event}
        jname = f"{ts[:10]}.jsonl.enc" if self.crypto.enabled else f"{ts[:10]}.jsonl"
        jpath = self.base / "journal" / jname
        line = _json_dumps(entry) + "\n"
        if self.crypto.enabled:
            # store one encrypted blob per line (base64 inside fernet)
            with open(jpath, "ab") as f:
                f.write(self.crypto.enc_bytes(line.encode("utf-8")) + b"\n")
        else:
            with open(jpath, "a", encoding="utf-8") as f:
                f.write(line)

    # ---------- Core API ----------
    def remember(self,
                 text: str,
                 kind: str = "semantic",
                 *,
                 tags: Optional[Iterable[str]] = None,
                 salience: Optional[Dict[str, Any]] = None,
                 provenance: Optional[Dict[str, Any]] = None,
                 pinned: bool = False) -> int:
        if not (text and text.strip()):
            raise ValueError("empty content")
        now = _utcnow()

        # plaintext JSON strings
        tjson = _json_dumps(list(tags or []))
        sjson = _json_dumps(salience or {})
        pjson = _json_dumps(provenance or {})

        # encrypt fields if enabled
        e_content = self.crypto.enc(text.strip())
        e_tags = self.crypto.enc(tjson)
        e_sal = self.crypto.enc(sjson)
        e_prov = self.crypto.enc(pjson)

        with self._lock, self._conn:
            cur = self._conn.execute("""
              INSERT INTO memories(kind, content, tags, salience, provenance, pinned, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (kind, e_content, e_tags, e_sal, e_prov, 1 if pinned else 0, now, now))
            rid = int(cur.lastrowid)

        self._journal_append({
            "event": "remember",
            "row_id": rid, "kind": kind, "content": "[encrypted]" if self.crypto.enabled else text.strip(),
            "tags": list(tags or []), "salience": salience or {}, "provenance": provenance or {}, "pinned": pinned
        })
        self._working_log({"ev": "remember", "id": rid, "kind": kind})
        return rid

    def _row_to_item(self, r) -> Dict[str, Any]:
        it = dict(r)
        # decrypt JSON strings then parse
        content = self.crypto.dec(it.get("content") or "")
        tags_s = self.crypto.dec(it.get("tags") or "[]")
        sal_s = self.crypto.dec(it.get("salience") or "{}")
        prov_s = self.crypto.dec(it.get("provenance") or "{}")
        it["content"] = content
        it["tags"] = json.loads(tags_s or "[]")
        it["salience"] = json.loads(sal_s or "{}")
        it["provenance"] = json.loads(prov_s or "{}")
        return it

    def recall(self,
               query: Optional[str] = None,
               k: int = 10,
               *,
               kinds: Optional[Iterable[str]] = None,
               tags_any: Optional[Iterable[str]] = None,
               sort_by_salience: bool = True) -> List[Dict[str, Any]]:
        with self._lock:
            if (query and query.strip()) and not self.crypto.enabled:
                q = query.strip()
                rows = self._conn.execute("""
                  SELECT m.* FROM memories_fts f
                  JOIN memories m ON m.id = f.rowid
                  WHERE memories_fts MATCH ?
                  ORDER BY rank
                  LIMIT ?
                """, (q, int(k*3))).fetchall()
            else:
                # when encrypted, do a broader fetch and filter in Python after decryption
                limit = int(k*8) if (query and query.strip()) else int(k)
                rows = self._conn.execute("""
                  SELECT * FROM memories ORDER BY datetime(created_at) DESC LIMIT ?
                """, (limit,)).fetchall()

        want_kinds = set((_k.lower() for _k in (kinds or [])))
        want_tags = set((t.strip().lower() for t in (tags_any or [])))

        items: List[Dict[str, Any]] = []
        for r in rows:
            it = self._row_to_item(r)
            if query and query.strip() and self.crypto.enabled:
                if (query.lower() not in (it["content"] or "").lower()) and \
                   (query.lower() not in " ".join(it.get("tags", [])).lower()):
                    continue
            if want_kinds and it.get("kind","").lower() not in want_kinds:
                continue
            if want_tags and not (set(t.lower() for t in it.get("tags", [])) & want_tags):
                continue
            items.append(it)

        if sort_by_salience:
            items.sort(key=lambda x: _salience_score(x.get("salience") or {}), reverse=True)
        return items[:k]

    def update(self, row_id: int, patch: Dict[str, Any]) -> bool:
        with self._lock:
            row = self._conn.execute("SELECT * FROM memories WHERE id=?", (int(row_id),)).fetchone()
            if not row: return False

            cur_it = self._row_to_item(row)
            content = patch.get("content", cur_it["content"])
            kind = patch.get("kind", cur_it["kind"])
            tags = patch.get("tags", cur_it["tags"])
            salience = patch.get("salience", cur_it["salience"])
            provenance = patch.get("provenance", cur_it["provenance"])
            pinned = int(patch.get("pinned", row["pinned"]))

            now = _utcnow()
            with self._conn:
                self._conn.execute("""
                  UPDATE memories
                  SET content=?, kind=?, tags=?, salience=?, provenance=?, pinned=?, updated_at=?
                  WHERE id=?
                """, (
                    self.crypto.enc(content),
                    kind,
                    self.crypto.enc(_json_dumps(tags)),
                    self.crypto.enc(_json_dumps(salience)),
                    self.crypto.enc(_json_dumps(provenance)),
                    pinned, now, int(row_id)
                ))
        self._journal_append({"event":"update","row_id":row_id,"patch":list(patch.keys())})
        self._working_log({"ev": "update", "id": row_id})
        return True

    def delete(self, row_id: int) -> bool:
        with self._lock, self._conn:
            cur = self._conn.execute("DELETE FROM memories WHERE id=?", (int(row_id),))
            ok = cur.rowcount > 0
        if ok:
            self._journal_append({"event":"delete","row_id":row_id})
            self._working_log({"ev": "delete", "id": row_id})
        return ok

    # ---------- Pins ----------
    def pin(self, row_id: int) -> bool:  return self.update(row_id, {"pinned": 1})
    def unpin(self, row_id: int) -> bool: return self.update(row_id, {"pinned": 0})

    # ---------- Stats & Snapshots ----------
    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self._conn.execute("SELECT COUNT(*) AS c FROM memories").fetchone()["c"]
            by_kind = [{"kind": r["kind"], "count": r["c"]} for r in self._conn.execute(
                "SELECT kind, COUNT(*) AS c FROM memories GROUP BY kind ORDER BY c DESC"
            ).fetchall()]
        size_mb = round(self.db_path.stat().st_size / (1024*1024), 3) if self.db_path.exists() else 0.0
        return {"dir": str(self.base), "db": str(self.db_path), "total": total, "by_kind": by_kind, "size_mb": size_mb, "encrypted": self.crypto.enabled}

    def snapshot(self) -> Path:
        with self._lock:
            rows = [dict(r) for r in self._conn.execute("SELECT * FROM memories ORDER BY id ASC").fetchall()]
            items: List[Dict[str, Any]] = []
            for r in rows:
                it = self._row_to_item(r)
                items.append(it)

        snap = {"version": "1.1", "created_at": _utcnow(), "count": len(items), "items": items}
        fname = f"snapshot_{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ')}.json"
        if self.crypto.enabled:
            outp = (self.base / "snapshots" / (fname + ".enc"))
            blob = json.dumps(snap, indent=2, ensure_ascii=False).encode("utf-8")
            outp.write_bytes(self.crypto.enc_bytes(blob))
        else:
            outp = (self.base / "snapshots" / fname)
            outp.write_text(json.dumps(snap, indent=2, ensure_ascii=False), encoding="utf-8")
        self._journal_append({"event":"snapshot","path":str(outp)})
        self._working_log({"ev":"snapshot","path":str(outp)})
        return outp

    def import_snapshot(self, path: Path) -> int:
        p = Path(path)
        raw: str
        if p.suffix == ".enc":
            blob = p.read_bytes()
            text = self.crypto.dec_bytes(blob).decode("utf-8")
            raw = text
        else:
            raw = p.read_text(encoding="utf-8")
        data = json.loads(raw)
        items = data.get("items", [])
        n = 0
        with self._lock, self._conn:
            for it in items:
                tjson = self.crypto.enc(_json_dumps(it.get("tags") or []))
                sjson = self.crypto.enc(_json_dumps(it.get("salience") or {}))
                pjson = self.crypto.enc(_json_dumps(it.get("provenance") or {}))
                self._conn.execute("""
                  INSERT INTO memories(id, kind, content, tags, salience, provenance, pinned, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    None, it.get("kind") or "semantic", self.crypto.enc(it.get("content") or ""),
                    tjson, sjson, pjson, int(it.get("pinned") or 0),
                    it.get("created_at") or _utcnow(), it.get("updated_at") or _utcnow()
                ))
                n += 1
        self._journal_append({"event":"import_snapshot","path":str(path), "inserted": n})
        self._working_log({"ev":"import", "n": n})
        return n

    # ---------- Episodic Rollups (monthly) ----------
    def rollup_month(self, period: Optional[str] = None) -> Tuple[int, Optional[int]]:
        if period is None:
            period = datetime.now(timezone.utc).strftime("%Y-%m")
        lo = period + "-01"
        hi = period + "-32"

        with self._lock:
            rows = self._conn.execute("""
              SELECT * FROM memories
              WHERE kind='episodic' AND created_at >= ? AND created_at < ?
            """, (lo, hi)).fetchall()

        items = []
        for r in rows:
            it = self._row_to_item(r)
            score = _salience_score(it.get("salience") or {})
            if score >= 0.55 or int(r.get("pinned") if isinstance(r, dict) else r["pinned"]) == 1:
                items.append(it)

        if not items:
            return (0, None)

        items.sort(key=lambda x: _salience_score(x.get("salience") or {}), reverse=True)
        headlines = []
        for it in items[:10]:
            tags = ", ".join(it.get("tags") or [])
            headlines.append(f"- {it['content']}" + (f" [{tags}]" if tags else ""))

        summary = f"Highlights for {period}:\n" + "\n".join(headlines)
        src_ids = []
        # find ids again from DB to avoid carrying it around in plaintext outputs
        for r in rows:
            src_ids.append(int(r["id"]))

        with self._lock, self._conn:
            exist = self._conn.execute("SELECT id FROM episodic_rollups WHERE period=?", (period,)).fetchone()
            if exist:
                rid = int(exist["id"])
                self._conn.execute("""
                  UPDATE episodic_rollups SET summary=?, source_ids=?, created_at=? WHERE id=?
                """, (summary, _json_dumps(src_ids), _utcnow(), rid))
            else:
                cur = self._conn.execute("""
                  INSERT INTO episodic_rollups(period, summary, source_ids, created_at)
                  VALUES (?, ?, ?, ?)
                """, (period, summary, _json_dumps(src_ids), _utcnow()))
                rid = int(cur.lastrowid)

        self._journal_append({"event":"rollup_month","period":period,"source_count":len(src_ids),"rollup_id":rid})
        self._working_log({"ev":"rollup","period":period,"count":len(src_ids)})
        return (len(src_ids), rid)

    # ---------- Procedural Versioning ----------
    def upsert_procedural(self,
                          subject_tag: str,
                          steps: List[str],
                          notes: Optional[str] = None,
                          source_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        now = _utcnow()
        steps_json = _json_dumps(list(steps))
        src_json = _json_dumps(list(source_ids or []))

        with self._lock, self._conn:
            row = self._conn.execute("""
              SELECT MAX(version) as v FROM procedural_versions WHERE subject_tag=?
            """, (subject_tag,)).fetchone()
            next_v = int(row["v"] or 0) + 1
            self._conn.execute("""
              INSERT INTO procedural_versions(subject_tag, version, steps, notes, source_ids, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            """, (subject_tag, next_v, steps_json, notes or "", src_json, now))

            existing = self._conn.execute("""
              SELECT * FROM memories WHERE kind='procedural' AND tags LIKE ?
            """, (f'%"{subject_tag}"%',)).fetchone()

            content = f"Procedure '{subject_tag}' (v{next_v})\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
            tag_json = self.crypto.enc(_json_dumps([subject_tag, "procedural"]))
            sal_json = self.crypto.enc(_json_dumps({"importance": 0.8, "relevance": 0.9, "confidence": 0.9}))

            if existing:
                self._conn.execute("""
                  UPDATE memories
                  SET content=?, tags=?, salience=?, updated_at=?
                  WHERE id=?
                """, (self.crypto.enc(content), tag_json, sal_json, now, int(existing["id"])))
                mem_id = int(existing["id"])
            else:
                cur = self._conn.execute("""
                  INSERT INTO memories(kind, content, tags, salience, provenance, pinned, created_at, updated_at)
                  VALUES ('procedural', ?, ?, ?, ?, 1, ?, ?)
                """, (self.crypto.enc(content), tag_json, sal_json, self.crypto.enc(_json_dumps({"kind":"system"})), now, now))
                mem_id = int(cur.lastrowid)

        self._journal_append({"event":"procedural_upsert","subject_tag":subject_tag,"version":next_v,"mem_id":mem_id})
        self._working_log({"ev":"procedural","tag":subject_tag,"v":next_v})
        return {"version": next_v, "subject_tag": subject_tag}

# ---------------- CLI ----------------

def _cli():
    ap = argparse.ArgumentParser(description="Zandalee Memory Manager (CLI)")
    sub = ap.add_subparsers(dest="cmd")

    p_learn = sub.add_parser("learn", help="Store a memory")
    p_learn.add_argument("text")
    p_learn.add_argument("--kind", default="semantic", choices=["procedural","semantic","episodic","working"])
    p_learn.add_argument("--tags", default="", help="comma list")
    p_learn.add_argument("--importance", type=float, default=0.5)
    p_learn.add_argument("--relevance", type=float, default=0.5)
    p_learn.add_argument("--emotion", type=float, default=0.0)
    p_learn.add_argument("--effort", type=float, default=0.0)
    p_learn.add_argument("--novelty", type=float, default=0.0)
    p_learn.add_argument("--confidence", type=float, default=0.5)
    p_learn.add_argument("--pinned", action="store_true")

    p_search = sub.add_parser("search", help="Recall memories")
    p_search.add_argument("query", nargs="?", default=None)
    p_search.add_argument("--k", type=int, default=10)
    p_search.add_argument("--kinds", default="", help="comma list")
    p_search.add_argument("--tags", default="", help="comma list")

    sub.add_parser("stats", help="Show stats")
    sub.add_parser("snapshot", help="Write snapshot")

    p_import = sub.add_parser("import", help="Import snapshot")
    p_import.add_argument("path")

    p_pin = sub.add_parser("pin", help="Pin memory id");     p_pin.add_argument("id", type=int)
    p_unpin = sub.add_parser("unpin", help="Unpin memory id"); p_unpin.add_argument("id", type=int)

    p_roll = sub.add_parser("rollup", help="Create/refresh monthly rollup"); p_roll.add_argument("--period", default=None, help="YYYY-MM")

    p_proc = sub.add_parser("proc", help="Upsert procedural version")
    p_proc.add_argument("subject_tag")
    p_proc.add_argument("--steps", required=True, help="JSON array of step strings")
    p_proc.add_argument("--notes", default="")
    p_proc.add_argument("--sources", default="[]", help="JSON array of memory ids")

    args = ap.parse_args()
    mem = Memory()

    if args.cmd == "learn":
        sal = {"importance": args.importance, "relevance": args.relevance, "emotion": args.emotion,
               "effort": args.effort, "novelty": args.novelty, "confidence": args.confidence}
        tags = [t.strip() for t in args.tags.split(",") if t.strip()]
        rid = mem.remember(args.text, kind=args.kind, tags=tags, salience=sal, provenance={"kind":"system"}, pinned=args.pinned)
        print("id:", rid); return

    if args.cmd == "search":
        kinds = [k.strip() for k in args.kinds.split(",") if k.strip()]
        tags = [t.strip() for t in args.tags.split(",") if t.strip()]
        items = mem.recall(args.query, k=args.k, kinds=kinds or None, tags_any=tags or None)
        for it in items:
            ts = (it.get("created_at") or "")[:19].replace("T"," ")
            print(f"[{ts}] #{it['id']} ({it['kind']}) {'/'.join(it.get('tags') or [])} :: {it['content']}")
        return

    if args.cmd == "stats":
        print(json.dumps(mem.stats(), indent=2)); return

    if args.cmd == "snapshot":
        p = mem.snapshot(); print("snapshot:", p); return

    if args.cmd == "import":
        n = mem.import_snapshot(Path(args.path)); print("imported:", n); return

    if args.cmd == "pin":
        print("ok" if mem.pin(args.id) else "not found"); return

    if args.cmd == "unpin":
        print("ok" if mem.unpin(args.id) else "not found"); return

    if args.cmd == "rollup":
        n, rid = mem.rollup_month(args.period); print(f"sources: {n}, rollup_id: {rid}"); return

    if args.cmd == "proc":
        try:
            steps = json.loads(args.steps); sources = json.loads(args.sources)
        except Exception as e:
            print("Invalid JSON for steps/sources:", e); return
        out = mem.upsert_procedural(args.subject_tag, steps, notes=args.notes, source_ids=sources)
        print(json.dumps(out)); return

    ap.print_help()

if __name__ == "__main__":
    _cli()
