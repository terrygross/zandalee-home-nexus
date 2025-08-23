import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  note?: string;
  result: string;
}

interface AuditResponse {
  ok: boolean;
  entries: AuditEntry[];
}

export function useSuperAdminAudit(enabled: boolean = false) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNewAttempts, setHasNewAttempts] = useState(false);
  const { toast } = useToast();

  const fetchAuditEntries = useCallback(async (limit: number = 50) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/audit/superadmin?limit=${limit}`);
      const data: AuditResponse = await response.json();
      
      if (data.ok) {
        setEntries(data.entries);
      }
    } catch (error) {
      console.error('Failed to fetch audit entries:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const markAsSeen = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      await fetch(`${baseUrl}/audit/superadmin/ack`, { method: 'POST' });
      setHasNewAttempts(false);
    } catch (error) {
      console.error('Failed to mark as seen:', error);
    }
  }, [enabled]);

  // Polling every 10 seconds
  useEffect(() => {
    if (!enabled) return;

    fetchAuditEntries();
    const interval = setInterval(() => {
      fetchAuditEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, [enabled, fetchAuditEntries]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!enabled) return;

    const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    
    try {
      const ws = new WebSocket(`${wsUrl}/ws`);
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'audit.superadmin' && message.event === 'attempt') {
            // Add new entry to the list
            setEntries(prev => [message.entry, ...prev]);
            setHasNewAttempts(true);
            
            // Show toast notification
            toast({
              title: "⚠️ Super-Admin Protection Alert",
              description: `${message.entry.actor} attempted ${message.entry.action} on ${message.entry.target}`,
              variant: "destructive",
              duration: 8000
            });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [enabled, toast]);

  return {
    entries,
    loading,
    hasNewAttempts,
    fetchAuditEntries,
    markAsSeen,
    recentEntries: entries.slice(0, 3)
  };
}