import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';

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

interface AudioDevice {
  id: number;
  name: string;
  channels: number;
  default?: boolean;
}

export const useGateway = () => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const { user } = useSession();

  // Helper to get auth headers
  const getAuthHeaders = (includePin = false) => {
    const headers: Record<string, string> = {};
    if (user?.familyName) {
      headers['X-User'] = user.familyName;
    }
    if (includePin && (user?.role === 'admin' || user?.role === 'superadmin') && user?.pin) {
      headers['X-PIN'] = user.pin;
    }
    return headers;
  };

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
    const response = await fetch(`${API_BASE}/health`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    return response.json();
  };

  const getConfig = async (): Promise<GatewayConfig> => {
    try {
      const response = await fetch(`${API_BASE}/config`, {
        headers: getAuthHeaders(true) // Include PIN for admin config access
      });
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
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(true) // Include PIN for admin config updates
        },
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
    const response = await fetch(`${API_BASE}/api/tags`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    setAvailableModels(models);
    return models;
  };

  const chat = async (body: ChatRequest): Promise<string> => {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    const data = await response.json();
    return data.message?.content || 'No response';
  };

  const voices = async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/local/voices`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    const data = await response.json();
    return data.voices || [];
  };

  const speak = async (body: { text: string; voice?: string; rate?: number; volume?: number }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/speak`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const memoryLearn = async (body: Memory): Promise<void> => {
    const response = await fetch(`${API_BASE}/memory/learn`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const memorySearch = async (q: string, limit = 20): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    return response.json();
  };

  const keys = async (body: { text: string; enter?: boolean }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/keys`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
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
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const openApp = async (body: { name: string; args?: string[] }): Promise<void> => {
    const response = await fetch(`${API_BASE}/local/app`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
  };

  const upload = async (files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${API_BASE}/local/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    await handleResponse(response);
  };

  const listDocs = async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/local/docs`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    return response.json();
  };

  const micList = async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/mic/list`, {
        headers: getAuthHeaders()
      });
      await handleResponse(response);
      const resp = await response.json();
      // Map backend shape to UI expectations
      return {
        ...resp,
        devices: (resp.devices || []).map((d: any) => ({
          ...d,
          channels: d.channels ?? d.max_input_channels, // map max_input_channels → channels
        })),
      };
    } catch (error) {
      console.warn('Mic list endpoint not available, using mock data');
      throw error;
    }
  };

  const micWizard = async (): Promise<{ ok: boolean; devices: any[]; chosen?: any }> => {
    try {
      const response = await fetch(`${API_BASE}/mic/wizard`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({})
      });
      await handleResponse(response);
      const resp = await response.json();
      // Return devices property to match component expectations
      return { ok: resp.ok, devices: resp.results ?? resp.devices ?? [], chosen: resp.chosen };
    } catch (error) {
      console.warn('Mic wizard endpoint not available');
      throw error;
    }
  };

  const micUse = async (id: number): Promise<{ ok: boolean }> => {
    try {
      const response = await fetch(`${API_BASE}/mic/use`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ id })
      });
      await handleResponse(response);
      return response.json();
    } catch (error) {
      console.warn('Mic use endpoint not available');
      throw error;
    }
  };

  // Diary endpoints
  const diaryAppend = async (body: { text: string; image?: string; emotion?: string; tags?: string[] }): Promise<{ ok: boolean; id: string; day: string }> => {
    const response = await fetch(`${API_BASE}/diary/append`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  const diaryRollup = async (body: { period?: string } = {}): Promise<{ ok: boolean; text: string }> => {
    const response = await fetch(`${API_BASE}/diary/rollup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  // Internet endpoints
  const openUrl = async (body: { url: string; browser?: string; autoRequest?: boolean }): Promise<{ ok: boolean; url: string }> => {
    const response = await fetch(`${API_BASE}/local/open-url`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  const fetchUrl = async (url: string): Promise<{ ok: boolean; contentType: string; text: string }> => {
    const response = await fetch(`${API_BASE}/net/fetch?url=${encodeURIComponent(url)}`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    return response.json();
  };

  const downloadUrl = async (body: { url: string }): Promise<{ ok: boolean; name: string; savedAs: string; size: number }> => {
    const response = await fetch(`${API_BASE}/net/download`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  // Permissions endpoints
  const permissionsExecute = async (body: { command: string }): Promise<{ allowed: boolean; reason?: string }> => {
    const response = await fetch(`${API_BASE}/permissions/execute`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  const permissionsRequest = async (body: { kind: 'app' | 'url'; payload: any; requester: string }): Promise<{ ok: boolean; request: any }> => {
    const response = await fetch(`${API_BASE}/permissions/request`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  const permissionsPending = async (): Promise<{ ok: boolean; pending: any[] }> => {
    const response = await fetch(`${API_BASE}/permissions/pending`, {
      headers: getAuthHeaders()
    });
    await handleResponse(response);
    return response.json();
  };

  const permissionsApprove = async (body: { id: string; approver: string; note?: string }): Promise<{ ok: boolean }> => {
    const response = await fetch(`${API_BASE}/permissions/approve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    await handleResponse(response);
    return response.json();
  };

  const permissionsDeny = async (body: { id: string; approver: string; note?: string }): Promise<{ ok: boolean }> => {
    const response = await fetch(`${API_BASE}/permissions/deny`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
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
    listDocs,
    micList,
    micWizard,
    micUse,
    diaryAppend,
    diaryRollup,
    openUrl,
    fetchUrl,
    downloadUrl,
    permissionsExecute,
    permissionsRequest,
    permissionsPending,
    permissionsApprove,
    permissionsDeny
  };
};
