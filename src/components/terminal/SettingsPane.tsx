
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, TestTube, Settings, Code, Users } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { canInviteUsers } from '@/utils/roleGuards';
import { AppControlPane } from './AppControlPane';
import { ManageFamilyPane } from './ManageFamilyPane';

export const SettingsPane = () => {
  const [activeTab, setActiveTab] = useState('gateway');
  const [base, setBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'green' | 'amber' | 'red'>('idle');

  const { getConfig, setConfig, health, getTags, availableModels } = useGateway();
  const { toast } = useToast();
  const { user } = useSession();

  useEffect(() => {
    loadConfig();
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

  // Filter available models to ensure no empty values
  const validModels = availableModels.filter(modelName => modelName && modelName.trim() !== '');

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateway" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Gateway
          </TabsTrigger>
          <TabsTrigger value="appcontrol" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            App Control
          </TabsTrigger>
          {canInviteUsers(user) && (
            <TabsTrigger value="family" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Family
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 mt-4">
          <TabsContent value="gateway" className="h-full m-0">
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
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-3 h-10 flex-shrink-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  {validModels.length > 0 ? (
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {validModels.map((modelName) => (
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

                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={saveConfig} 
                    disabled={loading}
                    className="h-9 px-4 text-xs sm:h-10 sm:px-6 sm:text-sm"
                  >
                    {loading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={testConnection} 
                    disabled={testStatus === 'testing'}
                    className="h-9 px-4 text-xs sm:h-10 sm:px-6 sm:text-sm"
                  >
                    <TestTube className="w-3 h-3 mr-1 sm:w-4 sm:h-4 sm:mr-2" />
                    Test Connection
                  </Button>
                </div>

                {getTestStatusBadge()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appcontrol" className="h-full m-0">
            <AppControlPane />
          </TabsContent>

          {canInviteUsers(user) && (
            <TabsContent value="family" className="h-full m-0">
              <ManageFamilyPane />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};
