import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';

interface PermissionEvent {
  type: 'permission';
  event: 'created' | 'updated';
  record: any;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionEvents, setPermissionEvents] = useState<PermissionEvent[]>([]);
  const { user } = useSession();

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    const wsUrl = API_BASE.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'permission') {
          setPermissionEvents(prev => [...prev, message as PermissionEvent]);
        }
        
        // Handle heartbeats
        if (message.type === 'heartbeat') {
          // Respond to heartbeat if needed
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
      console.log('WebSocket disconnected');
      
      // Reconnect after delay
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const clearPermissionEvents = useCallback(() => {
    setPermissionEvents([]);
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    isConnected,
    permissionEvents,
    clearPermissionEvents,
    connect,
    disconnect
  };
};