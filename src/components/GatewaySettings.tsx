
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGateway } from "@/hooks/useGateway";
import { useToast } from "@/hooks/use-toast";

const GatewaySettings = () => {
  const [base, setBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('qwen2.5-coder:32b');
  const [loading, setLoading] = useState(false);
  
  const { getConfig, setConfig } = useGateway();
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      setBase(config.base || '');
      setApiKey(config.apiKey || '');
      setModel(config.model || 'qwen2.5-coder:32b');
    } catch (error) {
      toast({
        title: "Config Load Failed",
        description: "Using defaults",
        variant: "destructive"
      });
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await setConfig({ base, apiKey, model });
      toast({
        title: "Settings Saved",
        description: "Gateway configuration updated"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gateway Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="base">Salad Base URL</Label>
          <Input
            id="base"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://your-salad-instance.com"
          />
        </div>
        
        <div>
          <Label htmlFor="apiKey">Salad API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="qwen2.5-coder:32b"
          />
        </div>
        
        <Button onClick={saveConfig} disabled={loading}>
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GatewaySettings;
