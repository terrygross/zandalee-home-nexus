
import { useState, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface VoiceMetrics {
  stt: number;
  llm: number;
  tts: number;
  total: number;
  vu_level: number;
}

interface AudioDevice {
  id: number;
  name: string;
  max_input_channels: number;
  samplerate: number;
}

interface DeviceMetrics {
  id: number;
  name: string;
  snr_db: number;
  voiced_ratio: number;
  start_delay_ms: number;
  clipping_percent: number;
  dropout_percent: number;
  score: number;
  samplerate: number;
}

interface MemoryItem {
  id: string;
  text: string;
  kind: string;
  tags: string[];
  importance: number;
  relevance: number;
  created_at: string;
  source: string;
  trust: string;
}

interface Config {
  audio?: {
    machine: string;
    device_id: number;
    device_name: string;
    samplerate: number;
    frame_ms: number;
    vad_mode: number;
    start_voiced_frames: number;
    end_unvoiced_frames: number;
    preroll_ms: number;
    half_duplex: boolean;
    input_gain_db: number;
  };
  llm?: {
    backend: string;
    ollama: { url: string; model: string };
    meta: { api_key: string };
    deepseek: { model: string };
    generation: {
      max_tokens: number;
      temperature: number;
      top_p: number;
      streaming: boolean;
    };
  };
  ui?: {
    theme: string;
    font_size: number;
    panels: {
      chat: boolean;
      meters: boolean;
      memory: boolean;
      actions: boolean;
      avatar: boolean;
    };
    self_test_on_start: boolean;
    latency_meters: boolean;
    earcons: boolean;
  };
  avatar?: {
    enabled: boolean;
    renderer: string;
    lipsync: { mode: string };
    perf: { fps_cap: number };
    sandbox: { separate_process: boolean };
  };
}

const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';

export const useZandaleeAPI = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>({
    stt: 0, llm: 0, tts: 0, total: 0, vu_level: 0
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${API_BASE.replace('http', 'ws')}/ws`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('Connected to Zandalee daemon');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'voice_metrics') {
          setVoiceMetrics(data.data);
        } else if (data.type === 'speaking_status') {
          setIsSpeaking(data.speaking);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('Disconnected from Zandalee daemon');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      return ws;
    };

    const ws = connectWebSocket();
    return () => ws.close();
  }, []);

  // Core APIs
  const getStatus = async () => {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to get status');
    return await response.json();
  };

  const speak = async (text: string) => {
    const response = await fetch(`${API_BASE}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('Failed to speak');
    return await response.json();
  };

  // Chat APIs
  const sendMessage = async (content: string): Promise<Message> => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, role: 'user' })
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    return await response.json();
  };

  // Mic APIs
  const listMicDevices = async (): Promise<AudioDevice[]> => {
    const response = await fetch(`${API_BASE}/mic/list`);
    if (!response.ok) throw new Error('Failed to list mic devices');
    return await response.json();
  };

  const useMicDevice = async (deviceId: number) => {
    const response = await fetch(`${API_BASE}/mic/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deviceId })
    });
    if (!response.ok) throw new Error('Failed to set mic device');
    return await response.json();
  };

  const runMicWizard = async (): Promise<DeviceMetrics[]> => {
    const response = await fetch(`${API_BASE}/mic/wizard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to run mic wizard');
    return await response.json();
  };

  // Memory APIs
  const learnMemory = async (text: string, kind: string = 'semantic', tags: string[] = [], importance: number = 0.5, relevance: number = 0.5) => {
    const response = await fetch(`${API_BASE}/memory/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, kind, tags, importance, relevance })
    });
    if (!response.ok) throw new Error('Failed to learn memory');
    return await response.json();
  };

  const searchMemories = async (query: string = '', tags: string[] = [], limit: number = 10): Promise<MemoryItem[]> => {
    const params = new URLSearchParams({
      q: query,
      tags: tags.join(','),
      limit: limit.toString()
    });
    const response = await fetch(`${API_BASE}/memory/search?${params}`);
    if (!response.ok) throw new Error('Failed to search memories');
    const result = await response.json();
    return result.items || [];
  };

  const updateMemory = async (id: string, patch: Partial<MemoryItem>) => {
    const response = await fetch(`${API_BASE}/memory/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch })
    });
    if (!response.ok) throw new Error('Failed to update memory');
    return await response.json();
  };

  // Diary APIs
  const appendDiary = async (text: string) => {
    const response = await fetch(`${API_BASE}/diary/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('Failed to append to diary');
    return await response.json();
  };

  const rollupDiary = async (period: 'daily' | 'weekly' | 'monthly') => {
    const response = await fetch(`${API_BASE}/diary/rollup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period })
    });
    if (!response.ok) throw new Error('Failed to rollup diary');
    return await response.json();
  };

  // Avatar APIs (stub)
  const getAvatarStatus = async () => {
    const response = await fetch(`${API_BASE}/avatar/status`);
    if (!response.ok) throw new Error('Failed to get avatar status');
    return await response.json();
  };

  // Config APIs
  const getConfig = async (): Promise<Config> => {
    const response = await fetch(`${API_BASE}/config`);
    if (!response.ok) throw new Error('Failed to get config');
    return await response.json();
  };

  const updateConfig = async (config: Partial<Config>) => {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to update config');
    return await response.json();
  };

  // Lifecycle APIs (optional)
  const startEngine = async () => {
    const response = await fetch(`${API_BASE}/engine/start`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to start engine');
    return await response.json();
  };

  const stopEngine = async () => {
    const response = await fetch(`${API_BASE}/engine/stop`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to stop engine');
    return await response.json();
  };

  // Self-test function
  const runSelfTest = async () => {
    const results = [];
    
    try {
      // Test status
      const status = await getStatus();
      results.push({ test: 'Status', passed: true, message: 'Daemon is online' });
    } catch (error) {
      results.push({ test: 'Status', passed: false, message: error instanceof Error ? error.message : 'Unknown error' });
    }

    try {
      // Test TTS
      await speak('UI is online.');
      results.push({ test: 'TTS', passed: true, message: 'Text-to-speech working' });
    } catch (error) {
      results.push({ test: 'TTS', passed: false, message: error instanceof Error ? error.message : 'Unknown error' });
    }

    try {
      // Test mic list
      const devices = await listMicDevices();
      results.push({ 
        test: 'Microphone', 
        passed: devices.length > 0, 
        message: `Found ${devices.length} audio devices` 
      });
    } catch (error) {
      results.push({ test: 'Microphone', passed: false, message: error instanceof Error ? error.message : 'Unknown error' });
    }

    return results;
  };

  return {
    isConnected,
    isSpeaking,
    voiceMetrics,
    
    // Core
    getStatus,
    speak,
    
    // Chat
    sendMessage,
    
    // Mic
    listMicDevices,
    useMicDevice,
    runMicWizard,
    
    // Memory
    learnMemory,
    searchMemories,
    updateMemory,
    
    // Diary
    appendDiary,
    rollupDiary,
    
    // Avatar
    getAvatarStatus,
    
    // Config
    getConfig,
    updateConfig,
    
    // Lifecycle
    startEngine,
    stopEngine,
    
    // Utilities
    runSelfTest
  };
};
