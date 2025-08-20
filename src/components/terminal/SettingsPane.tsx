
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, TestTube } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

export const SettingsPane = () => {
  const [base, setBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'green' | 'amber' | 'red'>('idle');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  const { getConfig, setConfig, health, getTags, voices, availableModels } = useGateway();
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
    loadVoices();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      setBase(config.base || 'https://pomelo-gadogado-wkow7cp6m2u599hw.salad.cloud');
      setApiKey(config.apiKey || '');
      setModel(config.model || 'qwen2.5-coder:32b');
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadVoices = async () => {
    try {
      const voiceList = await voices();
      setAvailableVoices(voiceList);
      const saved = localStorage.getItem('selected_voice');
      if (saved) {
        setSelectedVoice(saved);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await setConfig({ base, apiKey, model });
      toast({
        title: 'Settings Saved',
        description: 'Saved. Reconnect...'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      await health();
      const models = await getTags();
      
      if (models.includes(model)) {
        setTestStatus('green');
        toast({
          title: 'Connection Test',
          description: 'Gateway OK - Model ready'
        });
      } else {
        setTestStatus('amber');
        toast({
          title: 'Connection Test',
          description: 'Gateway reachable, model missing',
          variant: 'default'
        });
      }
    } catch (error: any) {
      setTestStatus('red');
      toast({
        title: 'Connection Test',
        description: error.status === 401 ? 'Gateway offline / unauthorized' : 'Gateway offline',
        variant: 'destructive'
      });
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selected_voice', voice);
  };

  const getTestStatusBadge = () => {
    switch (testStatus) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      case 'green':
        return <Badge variant="default">Gateway OK</Badge>;
      case 'amber':
        return <Badge variant="secondary">Gateway reachable, model missing</Badge>;
      case 'red':
        return <Badge variant="destructive">Gateway offline / unauthorized</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gateway Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="base">Base URL</Label>
            <Input
              id="base"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://pomelo-gadogado-wkow7cp6m2u599hw.salad.cloud"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            {availableModels.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="qwen2.5-coder:32b"
              />
            )}
          </div>

          <div className="flex space-x-2">
            <Button onClick={saveConfig} disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testStatus === 'testing'}>
              <TestTube className="w-4 h-4 mr-2" />
              Test Connection
            </Button>
          </div>

          {getTestStatusBadge()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <Select value={selectedVoice} onValueChange={handleVoiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice, index) => (
                  <SelectItem key={index} value={voice.name}>
                    {voice.name} {voice.language && `(${voice.language})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
