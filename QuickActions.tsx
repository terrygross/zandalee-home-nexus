import * as React from "react";
import { Button } from "@/components/ui/button";
import { Mic, List, Volume2 } from "lucide-react";

export function QuickActions() {
  const api = window.pywebview?.api;

  const runWizard = async () => {
    if (!api) return alert("Desktop bridge not ready.");
    try {
      const res = await api.mic_wizard();
      if (!res?.ok) return alert("Mic setup failed: " + (res?.error ?? "unknown"));
      const best = res.best ? `${res.best.name} (score ${res.best.score})` : "—";
      alert("Mic setup complete.\nBest: " + best);
    } catch (e: any) {
      alert("Mic setup error: " + e?.message ?? e);
    }
  };

  const listMics = async () => {
    if (!api) return alert("Desktop bridge not ready.");
    const res = await api.mic_list_devices();
    if (!res?.ok) return alert("No mic stack: " + (res?.error ?? "unknown"));
    alert("Devices:\n" + JSON.stringify(res.devices, null, 2));
  };

  const sayOnline = async () => {
    if (!api) return alert("Desktop bridge not ready.");
    // try say() first, fall back to speak()
    const ok = (await api.say?.("UI is online.")) ?? (await api.speak?.("UI is online."));
    if (!ok) alert("TTS call returned false (is speaker enabled?)");
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={runWizard} title="Run Mic Setup">
        <Mic className="h-4 w-4 mr-2" /> Mic Setup
      </Button>
      <Button variant="outline" onClick={listMics} title="List microphones">
        <List className="h-4 w-4 mr-2" /> List Mics
      </Button>
      <Button onClick={sayOnline} title='Say: "UI is online."'>
        <Volume2 className="h-4 w-4 mr-2" /> Say “UI is online.”
      </Button>
    </div>
  );
}
