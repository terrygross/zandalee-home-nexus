
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

interface SettingsDrawerProps {
  children: React.ReactNode;
}

const SettingsDrawer = ({ children }: SettingsDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { getConfig, updateConfig } = useZandaleeAPI();

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const currentConfig = await getConfig();
      setConfig(currentConfig);
    } catch (error) {
      toast({
        title: "Config Load Error",
        description: error instanceof Error ? error.message : 'Failed to load configuration',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfig(config);
      toast({
        title: "Settings Saved",
        description: "Configuration has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = () => {
    // Reset to default configuration
    const defaultConfig = {
      audio: {
        machine: "PC-NAME",
        device_id: 0,
        device_name: "Default Microphone",
        samplerate: 16000,
        frame_ms: 10,
        vad_mode: 1,
        start_voiced_frames: 2,
        end_unvoiced_frames: 500,
        preroll_ms: 500,
        half_duplex: true,
        input_gain_db: 0
      },
      llm: {
        backend: "ollama",
        ollama: { url: "http://127.0.0.1:11434", model: "gemma3" },
        meta: { api_key: "" },
        deepseek: { model: "" },
        generation: {
          max_tokens: 512,
          temperature: 0.6,
          top_p: 0.95,
          streaming: true
        }
      },
      ui: {
        theme: "dark",
        font_size: 14,
        panels: {
          chat: true,
          meters: true,
          memory: true,
          actions: true,
          avatar: false
        },
        self_test_on_start: true,
        latency_meters: true,
        earcons: true
      },
      avatar: {
        enabled: false,
        renderer: "webgl",
        lipsync: { mode: "basic" },
        perf: { fps_cap: 30 },
        sandbox: { separate_process: true }
      }
    };
    setConfig(defaultConfig);
  };

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const updateConfigValue = (path: string, value: any) => {
    const keys = path.split('.');
    const newConfig = { ...config };
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const getConfigValue = (path: string, defaultValue: any = '') => {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] bg-space-deep/95 backdrop-blur-xl border-l border-energy-cyan/30">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2 text-text-primary">
            <Settings className="w-5 h-5 text-energy-cyan" />
            <span>Zandalee Settings</span>
          </SheetTitle>
          <SheetDescription className="text-text-secondary">
            Configure audio, LLM, UI, and avatar settings
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-120px)] mt-6">
          <Tabs defaultValue="audio" className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="llm">LLM</TabsTrigger>
              <TabsTrigger value="ui">UI</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4">
              <TabsContent value="audio" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Audio Configuration</CardTitle>
                    <CardDescription className="text-xs">Microphone and voice processing settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="machine" className="text-xs">Machine Name</Label>
                      <Input
                        id="machine"
                        value={getConfigValue('audio.machine')}
                        onChange={(e) => updateConfigValue('audio.machine', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="device_name" className="text-xs">Device Name</Label>
                      <Input
                        id="device_name"
                        value={getConfigValue('audio.device_name')}
                        onChange={(e) => updateConfigValue('audio.device_name', e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="samplerate" className="text-xs">Sample Rate</Label>
                        <Select value={getConfigValue('audio.samplerate')?.toString()} onValueChange={(value) => updateConfigValue('audio.samplerate', parseInt(value))}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16000">16kHz</SelectItem>
                            <SelectItem value="44100">44.1kHz</SelectItem>
                            <SelectItem value="48000">48kHz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vad_mode" className="text-xs">VAD Mode</Label>
                        <Select value={getConfigValue('audio.vad_mode')?.toString()} onValueChange={(value) => updateConfigValue('audio.vad_mode', parseInt(value))}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Quality (0)</SelectItem>
                            <SelectItem value="1">Low Bitrate (1)</SelectItem>
                            <SelectItem value="2">Aggressive (2)</SelectItem>
                            <SelectItem value="3">Very Aggressive (3)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preroll_ms" className="text-xs">Pre-roll (ms)</Label>
                        <Input
                          id="preroll_ms"
                          type="number"
                          value={getConfigValue('audio.preroll_ms')}
                          onChange={(e) => updateConfigValue('audio.preroll_ms', parseInt(e.target.value))}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="input_gain_db" className="text-xs">Input Gain (dB)</Label>
                        <Input
                          id="input_gain_db"
                          type="number"
                          value={getConfigValue('audio.input_gain_db')}
                          onChange={(e) => updateConfigValue('audio.input_gain_db', parseInt(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="half_duplex"
                        checked={getConfigValue('audio.half_duplex')}
                        onCheckedChange={(checked) => updateConfigValue('audio.half_duplex', checked)}
                      />
                      <Label htmlFor="half_duplex" className="text-xs">Half-duplex mode</Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="llm" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">LLM Configuration</CardTitle>
                    <CardDescription className="text-xs">Language model backend settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="backend" className="text-xs">Backend</Label>
                      <Select value={getConfigValue('llm.backend')} onValueChange={(value) => updateConfigValue('llm.backend', value)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama">Ollama</SelectItem>
                          <SelectItem value="meta">Meta</SelectItem>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {getConfigValue('llm.backend') === 'ollama' && (
                      <div className="space-y-4 p-4 bg-space-surface/30 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="ollama_url" className="text-xs">Ollama URL</Label>
                          <Input
                            id="ollama_url"
                            value={getConfigValue('llm.ollama.url')}
                            onChange={(e) => updateConfigValue('llm.ollama.url', e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ollama_model" className="text-xs">Model</Label>
                          <Input
                            id="ollama_model"
                            value={getConfigValue('llm.ollama.model')}
                            onChange={(e) => updateConfigValue('llm.ollama.model', e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 p-4 bg-space-surface/30 rounded-lg">
                      <h4 className="text-xs font-medium text-text-primary">Generation Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="max_tokens" className="text-xs">Max Tokens</Label>
                          <Input
                            id="max_tokens"
                            type="number"
                            value={getConfigValue('llm.generation.max_tokens')}
                            onChange={(e) => updateConfigValue('llm.generation.max_tokens', parseInt(e.target.value))}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="temperature" className="text-xs">Temperature</Label>
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={getConfigValue('llm.generation.temperature')}
                            onChange={(e) => updateConfigValue('llm.generation.temperature', parseFloat(e.target.value))}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ui" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">UI Configuration</CardTitle>
                    <CardDescription className="text-xs">User interface preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="theme" className="text-xs">Theme</Label>
                        <Select value={getConfigValue('ui.theme')} onValueChange={(value) => updateConfigValue('ui.theme', value)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="font_size" className="text-xs">Font Size</Label>
                        <Input
                          id="font_size"
                          type="number"
                          value={getConfigValue('ui.font_size')}
                          onChange={(e) => updateConfigValue('ui.font_size', parseInt(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-space-surface/30 rounded-lg">
                      <h4 className="text-xs font-medium text-text-primary">Panel Visibility</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(getConfigValue('ui.panels', {})).map(([panel, enabled]) => (
                          <div key={panel} className="flex items-center space-x-2">
                            <Switch
                              id={`panel_${panel}`}
                              checked={enabled as boolean}
                              onCheckedChange={(checked) => updateConfigValue(`ui.panels.${panel}`, checked)}
                            />
                            <Label htmlFor={`panel_${panel}`} className="text-xs capitalize">{panel}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="self_test_on_start"
                          checked={getConfigValue('ui.self_test_on_start')}
                          onCheckedChange={(checked) => updateConfigValue('ui.self_test_on_start', checked)}
                        />
                        <Label htmlFor="self_test_on_start" className="text-xs">Self-test on startup</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="latency_meters"
                          checked={getConfigValue('ui.latency_meters')}
                          onCheckedChange={(checked) => updateConfigValue('ui.latency_meters', checked)}
                        />
                        <Label htmlFor="latency_meters" className="text-xs">Show latency meters</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="earcons"
                          checked={getConfigValue('ui.earcons')}
                          onCheckedChange={(checked) => updateConfigValue('ui.earcons', checked)}
                        />
                        <Label htmlFor="earcons" className="text-xs">Audio earcons</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="avatar" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avatar Configuration</CardTitle>
                    <CardDescription className="text-xs">Avatar rendering and behavior settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="avatar_enabled"
                        checked={getConfigValue('avatar.enabled')}
                        onCheckedChange={(checked) => updateConfigValue('avatar.enabled', checked)}
                      />
                      <Label htmlFor="avatar_enabled" className="text-xs">Enable Avatar</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="renderer" className="text-xs">Renderer</Label>
                      <Select 
                        value={getConfigValue('avatar.renderer')} 
                        onValueChange={(value) => updateConfigValue('avatar.renderer', value)}
                        disabled={!getConfigValue('avatar.enabled')}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="webgl">WebGL</SelectItem>
                          <SelectItem value="canvas">Canvas</SelectItem>
                          <SelectItem value="svg">SVG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 p-4 bg-space-surface/30 rounded-lg">
                      <h4 className="text-xs font-medium text-text-primary">Performance</h4>
                      <div className="space-y-2">
                        <Label htmlFor="fps_cap" className="text-xs">FPS Cap</Label>
                        <Input
                          id="fps_cap"
                          type="number"
                          value={getConfigValue('avatar.perf.fps_cap')}
                          onChange={(e) => updateConfigValue('avatar.perf.fps_cap', parseInt(e.target.value))}
                          disabled={!getConfigValue('avatar.enabled')}
                          className="text-xs"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="separate_process"
                          checked={getConfigValue('avatar.sandbox.separate_process')}
                          onCheckedChange={(checked) => updateConfigValue('avatar.sandbox.separate_process', checked)}
                          disabled={!getConfigValue('avatar.enabled')}
                        />
                        <Label htmlFor="separate_process" className="text-xs">Separate process (sandbox)</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-border/30 mt-4">
            <Button 
              variant="outline" 
              onClick={resetConfig}
              disabled={isLoading || isSaving}
              className="text-xs"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button 
              onClick={saveConfig}
              disabled={isLoading || isSaving}
              className="bg-energy-cyan hover:bg-energy-cyan/80 text-xs"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer;
