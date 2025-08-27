// Utility function to handle both relative and absolute API base URLs
export const getApiBase = (): string => {
  const base = import.meta.env.VITE_ZANDALEE_API_BASE || "/api";
  if (base.startsWith('/')) {
    // Relative path - use current origin
    return `${window.location.origin}${base}`;
  }
  // Absolute URL
  return base.replace(/\/+$/, "");
};

// Utility function to handle both relative and absolute WebSocket URLs  
export const getWsBase = (): string => {
  const wsBase = import.meta.env.VITE_WS_BASE || "/ws";
  if (wsBase.startsWith('/')) {
    // Relative path - use current origin with ws protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${wsBase}`;
  }
  // Absolute URL
  return wsBase;
};

// Legacy function for backward compatibility - returns the base URL for fetch calls
export const getBaseUrl = (): string => {
  return getApiBase();
};