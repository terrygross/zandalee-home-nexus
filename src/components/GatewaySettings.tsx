
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
        title: "CONFIG LOAD FAILED",
        description: "USING DEFAULTS",
        variant: "destructive"
      });
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await setConfig({ base, apiKey, model });
      toast({
        title: "SETTINGS SAVED",
        description: "GATEWAY CONFIGURATION UPDATED"
      });
    } catch (error) {
      toast({
        title: "SAVE FAILED",
        description: error instanceof Error ? error.message.toUpperCase() : 'UNKNOWN ERROR',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GATEWAY CONFIGURATION</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="base" className="text-lcars">SALAD BASE URL</Label>
          <Input
            id="base"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://your-salad-instance.com"
          />
        </div>
        
        <div>
          <Label htmlFor="apiKey" className="text-lcars">SALAD API KEY</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        
        <div>
          <Label htmlFor="model" className="text-lcars">MODEL</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="qwen2.5-coder:32b"
          />
        </div>
        
        <Button onClick={saveConfig} disabled={loading}>
          {loading ? 'SAVING...' : 'SAVE CONFIGURATION'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GatewaySettings;
