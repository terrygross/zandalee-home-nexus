import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { SettingsModal } from "./components/SettingsModal";

function mountPortal() {
  let host = document.getElementById("zandalee-settings-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "zandalee-settings-root";
    document.body.appendChild(host);
  }
  const root = (host as any).__root || ReactDOM.createRoot(host);
  (host as any).__root = root;

  function App() {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      const openEvt = () => setOpen(true);
      window.addEventListener("zandalee:open-settings", openEvt as any);
      return () => window.removeEventListener("zandalee:open-settings", openEvt as any);
    }, []);

    return <SettingsModal open={open} onClose={() => setOpen(false)} />;
  }

  root.render(<App />);
}

function bindGear() {
  // try common selectors used by templates
  const selectors = [
    '[data-role="settings"]',
    '[aria-label*="Settings" i]',
    '[title*="Settings" i]',
    'button:has(svg[aria-label*="settings" i])',
    'button:has(svg[aria-hidden="true"])', // last resort for icon-only buttons
    '.settings-button',
    '.gear-button',
  ];
  let el: HTMLElement | null = null;
  for (const sel of selectors) {
    el = document.querySelector(sel) as HTMLElement | null;
    if (el) break;
  }
  if (el) {
    el.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("zandalee:open-settings"));
    }, { once: false });
    return true;
  }
  return false;
}

function ensureFallbackButton() {
  // If we couldn't find the gear, add a minimal fallback trigger.
  const id = "zandalee-settings-fallback";
  if (document.getElementById(id)) return;
  const btn = document.createElement("button");
  btn.id = id;
  btn.textContent = "⚙";
  btn.title = "Zandalee Settings";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.top = "10px";
  btn.style.zIndex = "2147483647";
  btn.style.background = "transparent";
  btn.style.border = "none";
  btn.style.fontSize = "20px";
  btn.style.cursor = "pointer";
  btn.onclick = () => window.dispatchEvent(new CustomEvent("zandalee:open-settings"));
  document.body.appendChild(btn);
}

function main() {
  mountPortal();

  const bound = bindGear();
  if (!bound) ensureFallbackButton();

  // Expose manual trigger for debugging
  (window as any).zOpenSettings = () => window.dispatchEvent(new CustomEvent("zandalee:open-settings"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
