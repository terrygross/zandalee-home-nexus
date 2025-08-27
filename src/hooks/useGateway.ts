
// -------------------- useGateway.ts --------------------
import { useMemo, useState, useEffect } from "react";
import { getApiBase } from "@/utils/apiConfig";

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText} ${txt}`);
  }
  return (await r.json()) as T;
}

// New unified helper for chat+tts
async function askAndSpeak(message: string): Promise<{ text: string }> {
  const resp = await fetch(`${getApiBase()}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`speak failed: ${resp.status} ${err}`);
  }

  const data = await resp.json().catch(() => ({} as any));
  const text =
    (typeof data.reply === "string" && data.reply.trim()) ||
    (typeof data.spoken === "string" && data.spoken.trim()) ||
    "Sorry, I couldn't generate a reply.";

  return { text };
}

// LLM-only fallback using /api/chat
async function askLLM(message: string, model?: string): Promise<{ text: string }> {
  const resp = await fetch(`${getApiBase()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
      stream: false,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`chat failed: ${resp.status} ${err}`);
  }
  const js = await resp.json().catch(() => ({}));
  // extract the assistant text robustly:
  const text =
    js?.message?.content ||
    js?.choices?.[0]?.message?.content ||
    js?.reply ||
    js?.text ||
    "";
  return { text: text || "Sorry, I couldn't generate a reply." };
}

export function useGateway() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await fetch(`${getApiBase()}/health`).then(j<{ ok: boolean; msg: string }>);
        setIsHealthy(true);
      } catch {
        setIsHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  const api = useMemo(() => {
    // ------------- Health & Config -------------
    const health = () => fetch(`${getApiBase()}/health`).then(j<{ ok: boolean; msg: string }>);
    const getConfig = () => fetch(`${getApiBase()}/config`).then(j<Record<string, any>>);
    const setConfig = (body: any) =>
      fetch(`${getApiBase()}/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<{ ok: boolean; config: any }>);

    // ------------- LLM (Ollama via Salad) -------------
    const getTags = async () => {
      const result = await fetch(`${getApiBase()}/api/tags`).then(j<{ models: any[] }>);
      setAvailableModels(result.models || []);
      return result;
    };
    const chat = (body: any) =>
      fetch(`${getApiBase()}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);

    // ------------- Voice (SAPI) -------------
    const voices = () => fetch(`${getApiBase()}/local/voices`).then(j<{ voices: string[] }>);
    const speak = (body: { text: string; voice?: string; rate?: number; volume?: number }) =>
      fetch(`${getApiBase()}/local/speak`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<{ ok: boolean }>);

    // ------------- PC Control -------------
    const keys = (body: any) =>
      fetch(`${getApiBase()}/local/keys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);
    const mouse = (body: any) =>
      fetch(`${getApiBase()}/local/mouse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);
    const openApp = (body: any) =>
      fetch(`${getApiBase()}/local/app`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);

    // ------------- Files -------------
    const upload = (files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      return fetch(`${getApiBase()}/local/upload`, { method: "POST", body: fd }).then(j<{ ok: boolean; files: any[] }>);
    };
    const listDocs = () => fetch(`${getApiBase()}/local/docs`).then(j<{ docs: any[] }>);

    // ------------- Memory & Diary -------------
    const memoryLearn = (body: any) =>
      fetch(`${getApiBase()}/memory/learn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<{ ok: boolean; id: string }>);
    const memorySearch = (q: string, limit = 50) =>
      fetch(`${getApiBase()}/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`).then(j<{ results: any[] }>);
    const diaryAppend = (body: any) =>
      fetch(`${getApiBase()}/diary/append`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<{ ok: boolean; id: string; day: string }>);
    const diaryRollup = (period: "daily" | "weekly" | "monthly") =>
      fetch(`${getApiBase()}/diary/rollup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) })
        .then(j<{ ok: boolean; period: string; text: string }>);

    // ------------- Mic Wizard -------------
    const micListRaw = () => fetch(`${getApiBase()}/mic/list`).then(j<{ devices: any[]; chosen?: number }>);
    const micWizardRaw = () => fetch(`${getApiBase()}/mic/wizard`, { method: "POST" }).then(j<{ devices?: any[]; results?: any[]; chosen: any; persisted?: boolean }>);
    const micUse = (id: number) =>
      fetch(`${getApiBase()}/mic/use`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
        .then(j<{ ok: boolean; id?: number }>);
    // shape adapters
    const micList = async () => {
      const r = await micListRaw();
      const devices = (r.devices || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        channels: d.channels ?? d.max_input_channels ?? 1,
        default: !!d.default,
      }));
      return { devices, chosen: r.chosen };
    };
    const micWizard = async () => {
      const r = await micWizardRaw();
      // backend may return {results} or {devices}
      const arr = r.results || r.devices || [];
      const devices = arr.map((d: any) => ({
        id: d.id,
        name: d.name,
        SNR: d.SNR ?? d.snr_db,
        voiced: d.voiced ?? d.voiced_ratio,
        startDelay: d.startDelay ?? d.start_delay_ms,
        clip: d.clip ?? d.clipping_pct,
        score: d.score,
      }));
      return { ok: true, devices, chosen: r.chosen, persisted: r.persisted ?? false };
    };

    // ------------- Internet & Permissions -------------
    const openUrl = (body: { url: string; browser?: string; autoRequest?: boolean }) =>
      fetch(`${getApiBase()}/local/open-url`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);
    const netFetch = (url: string) => fetch(`${getApiBase()}/net/fetch?url=${encodeURIComponent(url)}`).then(j<any>);
    const netDownload = (body: { url: string }) =>
      fetch(`${getApiBase()}/net/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(j<any>);
    const permExecute = (command: string) =>
      fetch(`${getApiBase()}/permissions/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) })
        .then(j<{ allowed: boolean; reason?: string }>);
    const permRequest = (kind: "app" | "url", payload: any, requester = "zandalee") =>
      fetch(`${getApiBase()}/permissions/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, payload, requester }) })
        .then(j<any>);
    const permPending = () => fetch(`${getApiBase()}/permissions/pending`).then(j<{ ok: boolean; pending: any[] }>);
    const permApprove = (id: string, approver: string, note?: string) =>
      fetch(`${getApiBase()}/permissions/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approver, note }) })
        .then(j<any>);
    const permDeny = (id: string, approver: string, note?: string) =>
      fetch(`${getApiBase()}/permissions/deny`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approver, note }) })
        .then(j<any>);

    return {
      API_BASE: getApiBase(),
      isHealthy,
      availableModels,
      // health/config
      health, getConfig, setConfig,
      // llm
      getTags, chat,
      // voice
      voices, speak,
      // pc control
      keys, mouse, openApp,
      // files
      upload, listDocs,
      // memory/diary
      memoryLearn, memorySearch, diaryAppend, diaryRollup,
      // mic
      micList, micWizard, micUse,
      // net + permissions
      openUrl, netFetch, netDownload,
      permExecute, permRequest, permPending, permApprove, permDeny,
      // New unified helpers
      askAndSpeak,
      askLLM,
    };
  }, []);

  return api;
}
