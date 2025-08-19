
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  max_tokens: number;
  options: {
    temperature: number;
    num_ctx: number;
  };
}

interface GatewayConfig {
  base?: string;
  apiKey?: string;
  model?: string;
}

interface Voice {
  name: string;
  language?: string;
}

export const useGateway = () => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        setIsHealthy(response.ok);
      } catch {
        setIsHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  // Get available models
  const getTags = async (): Promise<string[]> => {
    try {
      const response = await fetch(`${API_BASE}/api/tags`);
      if (!response.ok) throw new Error('Failed to get tags');
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      setAvailableModels(models);
      return models;
    } catch (error) {
      console.error('Get tags error:', error);
      return [];
    }
  };

  // Chat with model
  const chat = async (messages: ChatMessage[], model: string = 'qwen2.5-coder:32b'): Promise<string> => {
    const request: ChatRequest = {
      model,
      messages,
      stream: false,
      max_tokens: 512,
      options: {
        temperature: 0.2,
        num_ctx: 8192
      }
    };

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized - check API key');
      if (response.status === 502) throw new Error('Gateway error - check Salad connection');
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || 'No response';
  };

  // Config management
  const getConfig = async (): Promise<GatewayConfig> => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      if (!response.ok) throw new Error('Config endpoint not available');
      return await response.json();
    } catch {
      // Fallback to localStorage if gateway config not ready
      return {
        base: localStorage.getItem('gateway_base') || '',
        apiKey: localStorage.getItem('gateway_apiKey') || '',
        model: localStorage.getItem('gateway_model') || 'qwen2.5-coder:32b'
      };
    }
  };

  const setConfig = async (config: GatewayConfig): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to save config');
    } catch {
      // Fallback to localStorage if gateway config not ready
      if (config.base) localStorage.setItem('gateway_base', config.base);
      if (config.apiKey) localStorage.setItem('gateway_apiKey', config.apiKey);
      if (config.model) localStorage.setItem('gateway_model', config.model);
    }
  };

  // TTS
  const speak = async (text: string, voice?: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        rate: 0,
        volume: 100
      })
    });
    if (!response.ok) throw new Error('TTS failed');
  };

  const getVoices = async (): Promise<Voice[]> => {
    const response = await fetch(`${API_BASE}/local/voices`);
    if (!response.ok) throw new Error('Failed to get voices');
    return await response.json();
  };

  // Memory stubs (TODO: implement server-side)
  const learnMemory = async (text: string, kind: string = 'semantic'): Promise<void> => {
    console.warn('Memory/learn stubbed - implement server endpoint');
    // TODO: POST /memory/learn
  };

  const searchMemories = async (query: string): Promise<any[]> => {
    console.warn('Memory/search stubbed - implement server endpoint');
    // TODO: GET /memory/search?q=...
    return [];
  };

  // Hands stubs (TODO: implement server-side)
  const sendKeys = async (text: string, enter: boolean = false): Promise<void> => {
    console.warn('Hands/keys stubbed - implement server endpoint');
    // TODO: POST /local/keys
  };

  const mouseAction = async (action: string, x?: number, y?: number): Promise<void> => {
    console.warn('Hands/mouse stubbed - implement server endpoint');
    // TODO: POST /local/mouse
  };

  return {
    isHealthy,
    availableModels,
    getTags,
    chat,
    getConfig,
    setConfig,
    speak,
    getVoices,
    learnMemory,
    searchMemories,
    sendKeys,
    mouseAction
  };
};
