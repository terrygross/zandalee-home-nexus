import type { ZandaleeApi, Status, Result } from "../types/api";

function isWebview(): boolean {
  return typeof window !== "undefined" && !!window.pywebview?.api;
}

// Dev-mode mocks so the site works in the browser too.
const mockStatus: Status = {
  online: true,
  project: "Default Project",
  voice: "Zandalee",
  listening: false,
  speaking: false,
  hotword: false,
  vu_level: 0,
  lat_stt: 0,
  lat_llm: 0,
  lat_tts: 0,
  lat_total: 0,
};

const mock: ZandaleeApi = {
  async get_status() { return mockStatus; },

  async send_text(text: string) {
    console.log("[MOCK] send_text", text);
    return { ok: true, handled: false } as Result;
  },
  async speak(text: string) { console.log("[MOCK] speak", text); return true; },

  async mem_learn(text, kind = "semantic", tags = "", importance = 0.5, relevance = 0.5) {
    console.log("[MOCK] mem_learn", { text, kind, tags, importance, relevance });
    return { ok: true, id: Math.floor(Math.random() * 10000) } as Result<{ id: number }>;
  },
  async mem_search(query, limit = 20) {
    console.log("[MOCK] mem_search", query, limit);
    return { ok: true, results: [] } as Result<{ results: any[] }>;
  },
  async mem_snapshot() { console.log("[MOCK] mem_snapshot"); return { ok: true, path: "mock/snapshot.json" } as Result<{ path: string }>; },
  async mem_rollup(ym = "") { console.log("[MOCK] mem_rollup", ym); return { ok: true, path: "mock/rollup.json" } as Result<{ path: string }>; },

  async project_new(name) {
    console.log("[MOCK] project_new", name);
    mockStatus.project = name;
    return { ok: true, name, path: `C:/Projects/${name}`, created: true } as Result;
  },
  async project_switch(name) {
    console.log("[MOCK] project_switch", name);
    mockStatus.project = name;
    return { ok: true, name, path: `C:/Projects/${name}` } as Result;
  },
  async project_list() { return { ok: true, projects: ["Default Project", "Demo One"] } as Result<{ projects: string[] }>; },

  async policy_list() {
    return { ok: true, policy: { domains: { allow: [], block: [] }, apps: { allow: [], block: [] } } } as Result;
  },
  async policy_allow(kind, value) { console.log("[MOCK] allow", kind, value); return { ok: true, msg: "allowed" } as Result<{ msg: string }>; },
  async policy_block(kind, value) { console.log("[MOCK] block", kind, value); return { ok: true, msg: "blocked" } as Result<{ msg: string }>; },
  async laws_update_from_file(path, token) { console.log("[MOCK] laws_update", path, token ? "***" : ""); return { ok: true } as Result; },
};

// Export the actual API in app, or the mock in browser dev.
export const zapi: ZandaleeApi = isWebview() ? window.pywebview!.api : mock;