import * as React from "react";
import { usePywebview } from "../hooks/usePywebview";

type Props = { open: boolean; onClose: () => void };

export function SettingsModal({ open, onClose }: Props) {
  const api = usePywebview();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [ttsEnabled, setTtsEnabled] = React.useState(false);
  const [ttsAvailable, setTtsAvailable] = React.useState(false);

  const [devices, setDevices] = React.useState<Array<{id:number; name:string}>>([]);
  const [selectedId, setSelectedId] = React.useState<number | undefined>(undefined);
  const [selectedName, setSelectedName] = React.useState<string>("");

  const [metrics, setMetrics] = React.useState<any | null>(null);

  const [sttAvailable, setSttAvailable] = React.useState(false);
  const [listening, setListening] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setError(null); setMetrics(null);
      try {
        if (!api) return;
        const st = (await (api.status?.() ?? api.get_status?.())) || {};
        setTtsAvailable(!!st?.tts?.available);
        setTtsEnabled(!!st?.tts?.enabled);
        setSttAvailable(!!st?.stt?.available);
        setListening(!!st?.stt?.listening);

        const devRes = await api.mic_list_devices?.();
        if (devRes?.ok) setDevices((devRes.devices || []).map((d:any)=>({id:d.id, name:d.name})));
        const cur = st?.mic?.device;
        if (cur?.id !== undefined) { setSelectedId(cur.id); setSelectedName(cur.name || ""); }
      } catch (e:any) {
        setError(e?.message ?? String(e));
      }
    })();
  }, [open, api]);

  const closeOnBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  const runWizard = async () => {
    if (!api) return;
    alert("When you click OK, please say 'testing one two three' out loud for ~5 seconds while I scan the microphones.");
    setLoading(true); setError(null); setMetrics(null);
    try {
      const res = await api.mic_wizard();
      if (!res?.ok) { setError(res?.error ?? "Mic setup failed"); return; }
      const best = res.best;
      if (best) {
        setSelectedId(best.id);
        setSelectedName(best.name || "");
        alert(`Mic setup complete.\nBest: ${best.name}\nSNR: ${best.snr_db} dB  Level: ${best.rms_dbfs} dBFS  Score: ${best.score}`);
      } else {
        alert("Mic setup finished, but no usable device was found.");
      }
    } catch (e:any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const useDevice = async () => {
    if (!api) return;
    if (selectedId === undefined) { setError("Choose a device first"); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.mic_use(selectedId);
      if (!res?.ok) { setError(res?.error ?? "Failed to select microphone"); return; }
      alert(`Selected: ${res.device?.name ?? selectedName}`);
    } catch (e:any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const testMic = async () => {
    if (!api) return;
    setLoading(true); setError(null);
    try {
      const res = await api.mic_test_current();
      if (!res?.ok) { setError(res?.error ?? "Mic test failed"); return; }
      setMetrics(res.metrics || null);
      alert("Mic test complete. See metrics below.");
    } catch (e:any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleTTS = async (v: boolean) => {
    if (!api) return;
    setLoading(true); setError(null);
    try {
      const r = await api.enableTTS(v);
      setTtsEnabled(!!r?.enabled);
    } catch (e:any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async () => {
    if (!api) return;
    try { const ok = (await api.say?.("UI is online.")) ?? (await api.speak?.("UI is online.")); if (!ok) alert("Speech disabled."); }
    catch (e:any) { alert("TTS error: " + (e?.message ?? e)); }
  };

  const startListening = async () => {
    if (!api) return;
    setLoading(true); setError(null);
    try {
      const r = await api.stt_start();
      if (!r?.ok) setError(r?.error ?? "Failed to start listening");
      setListening(!!r?.listening || r?.status === "already");
    } catch (e:any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  const stopListening = async () => {
    if (!api) return;
    setLoading(true); setError(null);
    try {
      const r = await api.stt_stop();
      if (!r?.ok) setError(r?.error ?? "Failed to stop listening");
      setListening(false);
    } catch (e:any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center" onMouseDown={closeOnBackdrop}>
      <div className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 w-[820px] max-w-[95vw] rounded-xl shadow-2xl border border-neutral-700" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-md bg-neutral-800 text-white hover:bg-neutral-700">Close</button>
        </div>

        <div className="p-4 grid gap-6">
          <section className="grid gap-3">
            <h3 className="text-base font-semibold">Audio</h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* TTS */}
              <div className="rounded-lg border border-neutral-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Text-to-Speech</div>
                    <div className="text-sm opacity-70">{ttsAvailable ? "Speaker available" : "Speaker not detected"}</div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="h-4 w-4" checked={ttsEnabled} disabled={!ttsAvailable || loading} onChange={(e)=>toggleTTS(e.target.checked)} />
                    <span className="text-sm">Enable speech</span>
                  </label>
                </div>
                <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50" disabled={!ttsEnabled || !ttsAvailable} onClick={testVoice}>
                  Test voice
                </button>
              </div>

              {/* MIC */}
              <div className="rounded-lg border border-neutral-700 p-3">
                <div className="font-medium mb-2">Microphone</div>
                <div className="flex items-center gap-2 mb-3">
                  <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50" disabled={!api || loading} onClick={runWizard}>
                    Run Mic Setup
                  </button>
                  <button className="px-3 py-1.5 rounded-md bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50" disabled={!api || loading || selectedId===undefined} onClick={testMic}>
                    Test mic
                  </button>
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-2 items-center">
                  <select className="w-full bg-neutral-900 text-white border border-neutral-700 rounded-md px-2 py-1.5"
                          value={selectedId ?? ""} onChange={(e)=>setSelectedId(e.target.value===""?undefined:Number(e.target.value))}>
                    <option value="">— Choose device —</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name} (id {d.id})</option>)}
                  </select>
                  <button className="px-3 py-1.5 rounded-md bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50" disabled={selectedId===undefined || loading} onClick={useDevice}>
                    Use
                  </button>
                </div>

                {selectedName && <div className="text-sm mt-2 opacity-75">Selected: <span className="font-mono">{selectedName}</span> (id {selectedId})</div>}

                {metrics && (
                  <div className="mt-3 text-sm grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>RMS dBFS: <b>{metrics.rms_dbfs}</b></div>
                    <div>Noise dBFS: <b>{metrics.noise_dbfs}</b></div>
                    <div>SNR dB: <b>{metrics.snr_db}</b></div>
                    <div>Speech ratio: <b>{metrics.speech_ratio}</b></div>
                    <div>Clipping %: <b>{metrics.clipping_pct}</b></div>
                    <div>Score: <b>{metrics.score}</b></div>
                  </div>
                )}
              </div>
            </div>

            {/* Listening controls */}
            <div className="rounded-lg border border-neutral-700 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Listening (Speech-to-Text)</div>
                  <div className="text-sm opacity-70">{sttAvailable ? (listening ? "Listening…" : "Ready") : "STT module not available"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
                          disabled={!sttAvailable || loading || listening} onClick={startListening}>Start</button>
                  <button className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                          disabled={!sttAvailable || loading || !listening} onClick={stopListening}>Stop</button>
                </div>
              </div>
            </div>

            {error && <div className="text-red-400 text-sm">Error: {error}</div>}
            {loading && <div className="text-sm opacity-75">Working…</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
