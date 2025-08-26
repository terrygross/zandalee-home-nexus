declare global {
  interface Window {
    pywebview?: {
      api: {
        mic_wizard: () => Promise<any>;
        mic_list_devices: () => Promise<{ ok: boolean; devices?: any[]; error?: string }>;
        say: (text: string) => Promise<boolean>;
        speak: (text: string) => Promise<boolean>;
        get_status: () => Promise<any>;
        status: () => Promise<any>;
      };
    };
  }
}
export {};
