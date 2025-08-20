
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  options?: {
    temperature?: number;
    num_ctx?: number;
  };
}

interface GatewayConfig {
  base: string;
  apiKey: string;
  model: string;
}

interface Voice {
  name: string;
  language?: string;
}

interface Memory {
  text: string;
  kind: 'semantic' | 'episodic' | 'procedural' | 'working';
  importance?: number;
  relevance?: number;
  tags?: string[];
  source?: string;
}

interface GatewayError {
  status: number;
  message: string;
}

class APIError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

export const useGateway = () => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await health();
        setIsHealthy(true);
      } catch {
        setIsHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      
      if (response.status === 401) {
        message = 'Unauthorized - check API key';
      } else if (response.status === 502) {
        message = 'Gateway error - check Salad connection';
      } else if (response.status === 404) {
        message = 'Endpoint not found';
      } else if (response.status >= 500) {
        message = 'Server error';
      }
      
      throw new APIError(response.status, message);
    }
    return response;
  };

  const health = async (): Promise<{ ok: boolean; msg: string }> => {
    const response = await fetch(`${API_BASE}/health`);
    await handleResponse(response);
    return response.json();
  };

  const getConfig = async (): Promise<GatewayConfig> => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      await handleResponse(response);
      return response.json();
    } catch (error) {
      // Fallback to localStorage if endpoint not available
      return {
        base: localStorage.getItem('gateway_base') || 'https://pomelo-gadogado-wkow7cp6m2u599hw.salad.cloud',
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
      await handleResponse(response);
    } catch (error) {
      // Fallback to localStorage
      localStorage.setItem('gateway_base', config.base);
      localStorage.setItem('gateway_apiKey', config.apiKey);
      localStorage.setItem('gateway_model', config.model);
    }
  };

  const getTags = async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/api/tags`);
    await handleResponse(response);
    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    setAvailableModels(models);
    return models;
  };

  const chat = async (body: ChatRequest): Promise<string> => {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    const data = await response.json();
    return data.message?.content || 'No response';
  };

  const voices = async (): Promise<Voice[]> => {
    const response = await fetch(`${API_BASE}/local/voices`);
    await handleResponse(response);
    return response.json();
  };

  const speak = async (body: { text: string; voice?: string; rate?: number; volume?: number }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const memoryLearn = async (body: Memory): Promise<void> => {
    const response = await fetch(`${API_BASE}/memory/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const memorySearch = async (q: string, limit = 20): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    await handleResponse(response);
    return response.json();
  };

  const keys = async (body: { text: string; enter?: boolean }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const mouse = async (body: { 
    action: 'move' | 'click' | 'double' | 'scroll'; 
    x?: number; 
    y?: number; 
    dx?: number; 
    dy?: number 
  }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/mouse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const openApp = async (body: { name: string; args?: string[] }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const upload = async (files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${API_BASE}/local/upload`, {
      method: 'POST',
      body: formData
    });
    await handleResponse(response);
  };

  const listDocs = async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/local/docs`);
    await handleResponse(response);
    return response.json();
  };

  return {
    isHealthy,
    availableModels,
    health,
    getConfig,
    setConfig,
    getTags,
    chat,
    voices,
    speak,
    memoryLearn,
    memorySearch,
    keys,
    mouse,
    openApp,
    upload,
    listDocs
  };
};
