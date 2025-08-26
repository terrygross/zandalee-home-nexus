declare global {
  interface Window {
    pywebview?: {
      api: {
        // status
        get_status: () => Promise<any>;
        status: () => Promise<any>;

        // speech
        enableTTS: (enabled: boolean) => Promise<{ ok: boolean; enabled: boolean }>;
        say: (text: string) => Promise<boolean>;
        speak: (text: string) => Promise<boolean>;

        // mic
        mic_list_devices: () => Promise<{ ok: boolean; devices?: any[]; error?: string }>;
        mic_use: (id: number) => Promise<{ ok: boolean; device?: any; error?: string }>;
        mic_test_current: () => Promise<{ ok: boolean; metrics?: any; wav_path?: string; error?: string }>;
        mic_wizard: () => Promise<{ ok: boolean; best?: any; results?: any[]; error?: string }>;

        // text command route (optional)
        send_text: (text: string) => Promise<any>;
      };
    };
  }
}
export {};

