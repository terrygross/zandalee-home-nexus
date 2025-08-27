import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { getWsBase } from '@/utils/apiConfig';

interface PermissionEvent {
  type: 'permission';
  event: 'created' | 'updated';
  record: any;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionEvents, setPermissionEvents] = useState<PermissionEvent[]>([]);
  const { user } = useSession();

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsBase());

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