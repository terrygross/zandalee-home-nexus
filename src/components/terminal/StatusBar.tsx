
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGateway } from '@/hooks/useGateway';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export const StatusBar = () => {
  const { isHealthy, availableModels, getTags, getConfig } = useGateway();
  const { theme, setTheme } = useTheme();
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [currentModel, setCurrentModel] = useState('');

  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const [models, config] = await Promise.all([getTags(), getConfig()]);
        setCurrentModel(config.model);
        
        if (models?.models?.includes(config.model)) {
          setModelStatus('ready');
        } else {
          setModelStatus('missing');
        }
      } catch (error) {
        setModelStatus('error');
      }
    };

    if (isHealthy) {
      checkModelStatus();
      const interval = setInterval(checkModelStatus, 2000);
      return () => clearInterval(interval);
    } else {
      setModelStatus('error');
    }
  }, [isHealthy, getTags, getConfig]);

  const getStatusColor = () => {
    if (!isHealthy) return 'destructive';
    if (modelStatus === 'ready') return 'default';
    if (modelStatus === 'missing') return 'secondary';
    return 'destructive';
  };

  const getStatusText = () => {
    if (!isHealthy) return 'GATEWAY OFFLINE';
    if (modelStatus === 'ready') return `MODEL READY (${currentModel.toUpperCase()})`;
    if (modelStatus === 'missing') return 'GATEWAY OK, MODEL MISSING';
    return 'CHECKING STATUS...';
  };

  const cycleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'LIGHT';
    if (theme === 'dark') return 'DARK';
    return 'SYSTEM';
  };

  return (
    <div className="border-b bg-card p-4 lcars-panel">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${
              isHealthy ? 'bg-lcars-green animate-lcars-pulse' : 'bg-lcars-red'
            }`} style={{ clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)' }} />
            <span className="text-sm text-muted-foreground text-lcars">GATEWAY STATUS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={cycleTheme}
            size="sm"
            variant="outline"
            className="flex items-center gap-2 bg-lcars-cyan hover:bg-lcars-teal text-black font-bold px-3 py-1.5 text-xs rounded-full"
          >
            {getThemeIcon()}
            <span className="hidden sm:inline">{getThemeLabel()}</span>
          </Button>
          
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
      </div>
    </div>
  );
};
