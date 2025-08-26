import { useState, useEffect } from "react";
import { FileText, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, LogEntry } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate log updates
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        timestamp: new Date(),
        level: ['info', 'debug', 'warning'][Math.floor(Math.random() * 3)] as any,
        message: [
          'Voice activity detected',
          'Memory system query completed',
          'Network connection stable',
          'Processing user input',
          'TTS synthesis complete',
          'Debug: Cache miss for query',
          'Warning: High latency detected',
          'Info: Project context loaded'
        ][Math.floor(Math.random() * 8)],
        component: ['core', 'stt', 'tts', 'memory', 'network'][Math.floor(Math.random() * 5)]
      };
      
      setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
    }, 3000 + Math.random() * 5000); // Random interval between 3-8 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOpenLogsFolder = async () => {
    try {
      const response = await api.open_logs_folder();
      if (response.ok) {
        toast({
          title: "Logs Folder",
          description: "Opening logs folder in file explorer"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open logs folder",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    // In a real app, this would fetch fresh logs
    toast({
      title: "Logs Refreshed",
      description: "Log view has been updated"
    });
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'info':
        return 'bg-primary text-primary-foreground';
      case 'debug':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getComponentColor = (component?: string) => {
    if (!component) return 'bg-muted/20 text-muted-foreground';
    
    const colors = {
      'core': 'bg-primary/20 text-primary',
      'stt': 'bg-accent/20 text-accent-foreground',
      'tts': 'bg-accent/20 text-accent-foreground',
      'memory': 'bg-success/20 text-success',
      'network': 'bg-warning/20 text-warning'
    };
    
    return colors[component as keyof typeof colors] || 'bg-muted/20 text-muted-foreground';
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">System Logs</h3>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={handleOpenLogsFolder}
          variant="outline"
          size="sm"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Open Folder
        </Button>
        
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Auto-scroll toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Live tail view</span>
        <Button
          onClick={() => setAutoScroll(!autoScroll)}
          variant="ghost"
          size="sm"
          className={cn(
            "text-xs h-6 px-2",
            autoScroll ? "text-primary" : "text-muted-foreground"
          )}
        >
          Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* Logs List */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No logs available</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <Card 
              key={`${log.timestamp.getTime()}-${index}`} 
              className="border-border/30 bg-background/20 hover:bg-background/40 transition-all"
            >
              <CardContent className="p-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        className={cn(
                          "text-xs px-1.5 py-0.5 font-mono",
                          getLevelColor(log.level)
                        )}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      
                      {log.component && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs px-1.5 py-0.5",
                            getComponentColor(log.component)
                          )}
                        >
                          {log.component}
                        </Badge>
                      )}
                      
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-foreground leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}