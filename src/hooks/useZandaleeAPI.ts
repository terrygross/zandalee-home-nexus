import { useState, useEffect, useCallback } from 'react';

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

interface Project {
  name: string;
  status: string;
  lastUsed: string;
  memories: number;
}

const API_BASE = 'http://localhost:3001';

export const useZandaleeAPI = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>({
    stt: 0, llm: 0, tts: 0, total: 0, vu_level: 0
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to Zandalee backend');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'voice_metrics') {
        setVoiceMetrics(data.data);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from Zandalee backend');
    };
    
    return () => ws.close();
  }, []);

  const sendMessage = async (content: string): Promise<Message> => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, role: 'user' })
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    return await response.json();
  };

  const executeCommand = async (command: string) => {
    const response = await fetch(`${API_BASE}/commands/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    if (!response.ok) throw new Error('Failed to execute command');
    return await response.json();
  };

  const speak = async (text: string) => {
    const response = await fetch(`${API_BASE}/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) throw new Error('Failed to speak');
    return await response.json();
  };

  const listen = async () => {
    const response = await fetch(`${API_BASE}/voice/listen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to listen');
    return await response.json();
  };

  const getProjects = async (): Promise<Project[]> => {
    const response = await fetch(`${API_BASE}/projects`);
    if (!response.ok) throw new Error('Failed to get projects');
    return await response.json();
  };

  const createProject = async (name: string) => {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to create project');
    return await response.json();
  };

  const searchMemories = async (query: string) => {
    const response = await fetch(`${API_BASE}/memory/search/${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search memories');
    return await response.json();
  };

  const learnMemory = async (content: string, kind: string = 'semantic', tags: string[] = []) => {
    const response = await fetch(`${API_BASE}/memory/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, kind, tags, importance: 0.5, relevance: 0.5 })
    });
    
    if (!response.ok) throw new Error('Failed to learn memory');
    return await response.json();
  };

  const getStatus = async () => {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to get status');
    return await response.json();
  };

  return {
    isConnected,
    voiceMetrics,
    sendMessage,
    executeCommand,
    speak,
    listen,
    getProjects,
    createProject,
    searchMemories,
    learnMemory,
    getStatus
  };
};
