
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useGateway } from '@/hooks/useGateway';

export const StatusBar = () => {
  const { isHealthy, availableModels, getTags, getConfig } = useGateway();
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [currentModel, setCurrentModel] = useState('');

  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const [models, config] = await Promise.all([getTags(), getConfig()]);
        setCurrentModel(config.model);
        
        if (models.includes(config.model)) {
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
        
        <Badge variant={getStatusColor()}>
          {getStatusText()}
        </Badge>
      </div>
    </div>
  );
};
