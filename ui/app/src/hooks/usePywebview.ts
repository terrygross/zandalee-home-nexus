import * as React from "react";

export function usePywebview() {
  const [api, setApi] = React.useState<any>(() => (window as any).pywebview?.api);

  React.useEffect(() => {
    if ((window as any).pywebview?.api) {
      setApi((window as any).pywebview.api);
      return;
    }
    const onReady = () => setApi((window as any).pywebview?.api);
    window.addEventListener("pywebviewready", onReady as any);
    const t = setInterval(() => {
      if ((window as any).pywebview?.api) {
        setApi((window as any).pywebview.api);
        clearInterval(t);
      }
    }, 250);
    return () => {
      window.removeEventListener("pywebviewready", onReady as any);
    };
  }, []);

  return api;
}
