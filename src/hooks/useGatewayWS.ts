// -------------------- useGatewayWS.ts --------------------
import { useEffect, useRef } from "react";

export function useGatewayWS(onPermissionEvent?: (evt: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const base =
      import.meta.env.VITE_ZANDALEE_API_BASE?.replace(/^http/, "ws").replace(/\/+$/, "") ||
      "ws://127.0.0.1:11500";
    const url = `${base}/ws`;

    let stop = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // noop
      };
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(m.data);
          if (msg?.type === "permission" && onPermissionEvent) onPermissionEvent(msg);
        } catch {
          // ignore
        }
      };
      ws.onclose = () => {
        if (!stop) setTimeout(connect, 1000);
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    connect();
    return () => {
      stop = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [onPermissionEvent]);

  return null;
}