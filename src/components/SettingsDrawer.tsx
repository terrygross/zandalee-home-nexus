import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, RotateCcw, Key, Brain, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useLLMProviders, type ProviderType } from "@/hooks/useLLMProviders";

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
  
  const {
    providers,
    activeProvider,
    coreLaws,
    updateProvider,
    setActive,
    updateCoreLaws,
    validateCoreLaws
  } = useLLMProviders();

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const currentConfig = await getConfig();
      setConfig(currentConfig);
    } catch (error) {
      // Gracefully fallback to localStorage mode if backend config fails
      console.log('Backend config not available, using localStorage mode');
      setConfig({});
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
          avatar: false,
          camera: false
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
      },
      camera: {
        enabled: false,
        device_id: 0,
        device_name: "Default Camera",
        resolution: "720p",
        fps: 30,
        features: {
          gesture_recognition: false,
          face_tracking: false,
          lip_sync_input: false
        }
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

  const handleProviderUpdate = (type: ProviderType, field: string, value: string) => {
    const currentProvider = providers[type] || { apiKey: '', model: '', baseUrl: '' };
    updateProvider(type, { ...currentProvider, [field]: value });
  };

  const handleCoreLawsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (validateCoreLaws(content)) {
          updateCoreLaws(content);
          toast({
            title: "Core Laws Loaded",
            description: "JSON file loaded successfully",
          });
        } else {
          toast({
            title: "Invalid JSON",
            description: "The uploaded file contains invalid JSON",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const providerOptions: { value: ProviderType; label: string; needsBaseUrl?: boolean }[] = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'meta', label: 'Meta Llama', needsBaseUrl: true },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'deepseek', label: 'DeepSeek', needsBaseUrl: true },
    { value: 'ollama', label: 'Ollama (Local)', needsBaseUrl: true },
    { value: 'custom', label: 'Custom OpenAI-Compatible', needsBaseUrl: true }
  ];

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
            Configure LLM providers, core laws, audio, and system settings
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-120px)] mt-6">
          <Tabs defaultValue="providers" className="flex-1">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="laws">Core Laws</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="ui">UI</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="camera">Camera</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4">
              <TabsContent value="providers" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Key className="w-4 h-4 text-energy-cyan" />
                      <span>LLM Providers</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Configure API keys and models for different LLM providers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 p-2 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-status-warning" />
                      <span className="text-xs text-status-warning">Keys stored locally. Not secure for production use.</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="active_provider" className="text-xs">Active Provider</Label>
                      <Select value={activeProvider} onValueChange={(value) => setActive(value as ProviderType)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {providerOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {providerOptions.map(({ value, label, needsBaseUrl }) => (
                      <div key={value} className={`space-y-3 p-3 rounded-lg ${activeProvider === value ? 'bg-energy-cyan/5 border border-energy-cyan/20' : 'bg-space-surface/20'}`}>
                        <h4 className="text-xs font-medium text-text-primary">{label}</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`${value}_key`} className="text-xs">API Key</Label>
                          <Input
                            id={`${value}_key`}
                            type="password"
                            value={providers[value]?.apiKey || ''}
                            onChange={(e) => handleProviderUpdate(value, 'apiKey', e.target.value)}
                            placeholder="Enter API key..."
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${value}_model`} className="text-xs">Model</Label>
                          <Input
                            id={`${value}_model`}
                            value={providers[value]?.model || ''}
                            onChange={(e) => handleProviderUpdate(value, 'model', e.target.value)}
                            placeholder={value === 'openai' ? 'gpt-3.5-turbo' : value === 'gemini' ? 'gemini-pro' : 'model-name'}
                            className="text-xs"
                          />
                        </div>

                        {needsBaseUrl && (
                          <div className="space-y-2">
                            <Label htmlFor={`${value}_url`} className="text-xs">Base URL</Label>
                            <Input
                              id={`${value}_url`}
                              value={providers[value]?.baseUrl || ''}
                              onChange={(e) => handleProviderUpdate(value, 'baseUrl', e.target.value)}
                              placeholder={value === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com'}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="laws" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-energy-blue" />
                      <span>Core Laws</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Define Zandalee's core principles and behavior rules</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="core_laws" className="text-xs">Core Laws JSON</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleCoreLawsUpload}
                            className="hidden"
                            id="upload_laws"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('upload_laws')?.click()}
                            className="text-xs"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Upload
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id="core_laws"
                        value={coreLaws}
                        onChange={(e) => updateCoreLaws(e.target.value)}
                        placeholder='{"principles": ["Be helpful", "Be honest"], "restrictions": ["No harmful content"]}'
                        className="min-h-[200px] font-mono text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${validateCoreLaws(coreLaws) ? 'text-status-success' : 'text-status-error'}`}>
                          {validateCoreLaws(coreLaws) ? '✓ Valid JSON' : '✗ Invalid JSON'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCoreLaws(JSON.stringify(JSON.parse(coreLaws), null, 2))}
                          disabled={!validateCoreLaws(coreLaws)}
                          className="text-xs"
                        >
                          Format
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-space-surface/30 rounded-lg">
                      <h4 className="text-xs font-medium text-text-primary mb-2">Example Core Laws:</h4>
                      <pre className="text-xs text-text-muted overflow-x-auto">
{`{
  "identity": "Family desktop AI assistant",
  "principles": [
    "Always be helpful and respectful",
    "Protect user privacy and data",
    "Provide accurate information"
  ],
  "capabilities": [
    "Help with coding projects",
    "Manage memories and knowledge",
    "Assist with daily tasks"
  ]
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

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

              <TabsContent value="camera" className="space-y-4">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Camera Configuration</CardTitle>
                    <CardDescription className="text-xs">Visual input and processing settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="camera_enabled"
                        checked={getConfigValue('camera.enabled')}
                        onCheckedChange={(checked) => updateConfigValue('camera.enabled', checked)}
                      />
                      <Label htmlFor="camera_enabled" className="text-xs">Enable Camera</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="camera_device_name" className="text-xs">Device Name</Label>
                      <Input
                        id="camera_device_name"
                        value={getConfigValue('camera.device_name')}
                        onChange={(e) => updateConfigValue('camera.device_name', e.target.value)}
                        disabled={!getConfigValue('camera.enabled')}
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="resolution" className="text-xs">Resolution</Label>
                        <Select 
                          value={getConfigValue('camera.resolution')} 
                          onValueChange={(value) => updateConfigValue('camera.resolution', value)}
                          disabled={!getConfigValue('camera.enabled')}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="480p">480p</SelectItem>
                            <SelectItem value="720p">720p</SelectItem>
                            <SelectItem value="1080p">1080p</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="camera_fps" className="text-xs">FPS</Label>
                        <Input
                          id="camera_fps"
                          type="number"
                          value={getConfigValue('camera.fps')}
                          onChange={(e) => updateConfigValue('camera.fps', parseInt(e.target.value))}
                          disabled={!getConfigValue('camera.enabled')}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-space-surface/30 rounded-lg">
                      <h4 className="text-xs font-medium text-text-primary">Future Features</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="gesture_recognition"
                            checked={getConfigValue('camera.features.gesture_recognition')}
                            onCheckedChange={(checked) => updateConfigValue('camera.features.gesture_recognition', checked)}
                            disabled={!getConfigValue('camera.enabled')}
                          />
                          <Label htmlFor="gesture_recognition" className="text-xs">Gesture Recognition</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="face_tracking"
                            checked={getConfigValue('camera.features.face_tracking')}
                            onCheckedChange={(checked) => updateConfigValue('camera.features.face_tracking', checked)}
                            disabled={!getConfigValue('camera.enabled')}
                          />
                          <Label htmlFor="face_tracking" className="text-xs">Face Tracking</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="lip_sync_input"
                            checked={getConfigValue('camera.features.lip_sync_input')}
                            onCheckedChange={(checked) => updateConfigValue('camera.features.lip_sync_input', checked)}
                            disabled={!getConfigValue('camera.enabled')}
                          />
                          <Label htmlFor="lip_sync_input" className="text-xs">Lip Sync Input for Avatar</Label>
                        </div>
                      </div>

                      <div className="text-xs text-text-muted italic">
                        Note: These features will be available in future updates
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
