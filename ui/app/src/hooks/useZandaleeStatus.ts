import { useEffect, useState } from "react";
import { zapi } from "../lib/bridge";
import type { Status } from "../types/api";

export function useZandaleeStatus(intervalMs = 1000) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const s = await zapi.get_status();
        if (alive) setStatus(s);
      } catch {
        // ignore polling errors in dev
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}