
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Volume2, Mic, Brain, User, Palette, Monitor } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AudioConfig {
  input_device: { id: number; name: string };
  output_device: { id: number; name: string };
  volume: number;
  samplerate: number;
  frame_ms: number;
  vad_mode: number;
  start_voiced_frames: number;
  end_unvoiced_frames: number;
  preroll_ms: number;
  silence_hold_ms: number;
}

interface LLMConfig {
  provider: string;
  api_key: string;
  model: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  streaming: boolean;
}

interface UIConfig {
  theme: string;
  font_size: number;
  zoom_level: number;
  panels: {
    chat: boolean;
    meters: boolean;
    memory: boolean;
    actions: boolean;
    avatar: boolean;
  };
  self_test_on_start: boolean;
  latency_meters: boolean;
  earcons: boolean;
}

interface AvatarConfig {
  enabled: boolean;
  style: string;
  lip_sync: boolean;
  renderer: string;
  performance: {
    fps_cap: number;
    quality: string;
  };
  sandbox: {
    separate_process: boolean;
  };
}

const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';

// Default configurations
const DEFAULT_CONFIGS = {
  audio: {
    input_device: { id: -1, name: "Default Microphone" },
    output_device: { id: -1, name: "Default Speakers" },
    volume: 0.8,
    samplerate: 16000,
    frame_ms: 10,
    vad_mode: 1,
    start_voiced_frames: 2,
    end_unvoiced_frames: 500,
    preroll_ms: 500,
    silence_hold_ms: 5000
  },
  llm: {
    provider: "openai",
    api_key: "",
    model: "gpt-3.5-turbo",
    base_url: "",
    temperature: 0.7,
    max_tokens: 1000,
    streaming: true
  },
  ui: {
    theme: "system",
    font_size: 14,
    zoom_level: 1.0,
    panels: {
      chat: true,
      meters: true,
      memory: true,
      actions: true,
      avatar: true
    },
    self_test_on_start: true,
    latency_meters: true,
    earcons: true
  },
  avatar: {
    enabled: true,
    style: "realistic",
    lip_sync: true,
    renderer: "webgl",
    performance: {
      fps_cap: 30,
      quality: "medium"
    },
    sandbox: {
      separate_process: false
    }
  }
} as const;

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  
  // Config states
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(DEFAULT_CONFIGS.audio);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(DEFAULT_CONFIGS.llm);
  const [uiConfig, setUIConfig] = useState<UIConfig>(DEFAULT_CONFIGS.ui);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_CONFIGS.avatar);

  // Load all configs on mount
  useEffect(() => {
    if (isOpen) {
      loadAllConfigs();
    }
  }, [isOpen]);

  const loadAllConfigs = async () => {
    setLoading(true);
    try {
      // Try to load from backend first
      const [audioRes, llmRes, uiRes, avatarRes] = await Promise.allSettled([
        fetch(`${API_BASE}/config/audio`),
        fetch(`${API_BASE}/config/llm`),
        fetch(`${API_BASE}/config/ui`),
        fetch(`${API_BASE}/config/avatar`)
      ]);

      let backendWorking = false;

      // Load audio config
      if (audioRes.status === 'fulfilled' && audioRes.value.ok) {
        const audioData = await audioRes.value.json();
        setAudioConfig(audioData.config || DEFAULT_CONFIGS.audio);
        backendWorking = true;
      } else {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem('zandalee_audio_config');
        setAudioConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIGS.audio);
      }

      // Load LLM config
      if (llmRes.status === 'fulfilled' && llmRes.value.ok) {
        const llmData = await llmRes.value.json();
        setLLMConfig(llmData.config || DEFAULT_CONFIGS.llm);
        backendWorking = true;
      } else {
        const saved = localStorage.getItem('zandalee_llm_config');
        setLLMConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIGS.llm);
      }

      // Load UI config
      if (uiRes.status === 'fulfilled' && uiRes.value.ok) {
        const uiData = await uiRes.value.json();
        setUIConfig(uiData.config || DEFAULT_CONFIGS.ui);
        backendWorking = true;
      } else {
        const saved = localStorage.getItem('zandalee_ui_config');
        setUIConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIGS.ui);
      }

      // Load avatar config
      if (avatarRes.status === 'fulfilled' && avatarRes.value.ok) {
        const avatarData = await avatarRes.value.json();
        setAvatarConfig(avatarData.config || DEFAULT_CONFIGS.avatar);
        backendWorking = true;
      } else {
        const saved = localStorage.getItem('zandalee_avatar_config');
        setAvatarConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIGS.avatar);
      }

      setBackendAvailable(backendWorking);

      if (!backendWorking) {
        toast({
          title: "Backend Offline",
          description: "Using local settings. Changes will be saved locally.",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Failed to load configs:', error);
      setBackendAvailable(false);
      
      // Load all from localStorage
      const audioSaved = localStorage.getItem('zandalee_audio_config');
      const llmSaved = localStorage.getItem('zandalee_llm_config');
      const uiSaved = localStorage.getItem('zandalee_ui_config');
      const avatarSaved = localStorage.getItem('zandalee_avatar_config');

      setAudioConfig(audioSaved ? JSON.parse(audioSaved) : DEFAULT_CONFIGS.audio);
      setLLMConfig(llmSaved ? JSON.parse(llmSaved) : DEFAULT_CONFIGS.llm);
      setUIConfig(uiSaved ? JSON.parse(uiSaved) : DEFAULT_CONFIGS.ui);
      setAvatarConfig(avatarSaved ? JSON.parse(avatarSaved) : DEFAULT_CONFIGS.avatar);

      toast({
        title: "Settings Loaded",
        description: "Using local settings. Backend is offline.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (configType: string, configData: any) => {
    try {
      if (backendAvailable) {
        const response = await fetch(`${API_BASE}/config/${configType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: configData })
        });

        if (!response.ok) {
          throw new Error('Backend save failed');
        }
      }

      // Always save to localStorage as backup
      localStorage.setItem(`zandalee_${configType}_config`, JSON.stringify(configData));

      toast({
        title: "Success",
        description: `${configType} settings saved ${backendAvailable ? 'to backend' : 'locally'}`
      });
    } catch (error) {
      console.error(`Failed to save ${configType} config:`, error);
      
      // Fallback to localStorage
      localStorage.setItem(`zandalee_${configType}_config`, JSON.stringify(configData));
      
      toast({
        title: "Saved Locally",
        description: `${configType} settings saved to browser storage`,
        variant: "default"
      });
    }
  };

  const resetConfig = async (configType: string) => {
    try {
      if (backendAvailable) {
        const response = await fetch(`${API_BASE}/config/${configType}/reset`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Backend reset failed');
        }
      }

      // Reset to defaults
      const defaultConfig = DEFAULT_CONFIGS[configType as keyof typeof DEFAULT_CONFIGS];
      
      switch (configType) {
        case 'audio':
          setAudioConfig(defaultConfig as AudioConfig);
          break;
        case 'llm':
          setLLMConfig(defaultConfig as LLMConfig);
          break;
        case 'ui':
          setUIConfig(defaultConfig as UIConfig);
          break;
        case 'avatar':
          setAvatarConfig(defaultConfig as AvatarConfig);
          break;
      }

      // Clear localStorage
      localStorage.removeItem(`zandalee_${configType}_config`);

      toast({
        title: "Reset Complete",
        description: `${configType} settings reset to defaults`
      });

    } catch (error) {
      console.error(`Failed to reset ${configType} config:`, error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : `Failed to reset ${configType} settings`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[800px] max-w-[90vw]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading settings...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] max-w-[90vw]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Zandalee Settings
            {!backendAvailable && (
              <Badge variant="outline" className="ml-2">Local Mode</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Configure your AI assistant preferences and system settings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="audio" className="w-full">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-transparent w-full justify-start">
              <TabsTrigger value="audio" className="flex items-center gap-2 px-3 py-2 bg-lcars-blue text-black data-[state=active]:bg-lcars-orange">
                <Volume2 className="h-4 w-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="llm" className="flex items-center gap-2 px-3 py-2 bg-lcars-purple text-black data-[state=active]:bg-lcars-pink">
                <Brain className="h-4 w-4" />
                AI Model
              </TabsTrigger>
              <TabsTrigger value="ui" className="flex items-center gap-2 px-3 py-2 bg-lcars-yellow text-black data-[state=active]:bg-lcars-cyan">
                <Monitor className="h-4 w-4" />
                Interface
              </TabsTrigger>
              <TabsTrigger value="avatar" className="flex items-center gap-2 px-3 py-2 bg-lcars-violet text-black data-[state=active]:bg-lcars-green">
                <User className="h-4 w-4" />
                Avatar
              </TabsTrigger>
            </TabsList>

            {/* Audio Settings */}
            <TabsContent value="audio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audio Configuration</CardTitle>
                  <CardDescription>Manage microphone, speakers, and voice processing settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Input Device</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">ID: {audioConfig.input_device.id}</Badge>
                        <span className="text-sm text-muted-foreground">{audioConfig.input_device.name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Device</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">ID: {audioConfig.output_device.id}</Badge>
                        <span className="text-sm text-muted-foreground">{audioConfig.output_device.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Volume: {Math.round(audioConfig.volume * 100)}%</Label>
                    <Slider
                      value={[audioConfig.volume]}
                      onValueChange={([value]) => setAudioConfig({...audioConfig, volume: value})}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="samplerate">Sample Rate</Label>
                      <Input
                        id="samplerate"
                        type="number"
                        value={audioConfig.samplerate}
                        onChange={(e) => setAudioConfig({...audioConfig, samplerate: parseInt(e.target.value) || 16000})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frame_ms">Frame Size (ms)</Label>
                      <Input
                        id="frame_ms"
                        type="number"
                        value={audioConfig.frame_ms}
                        onChange={(e) => setAudioConfig({...audioConfig, frame_ms: parseInt(e.target.value) || 10})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => saveConfig('audio', audioConfig)}>
                      Save Audio Settings
                    </Button>
                    <Button variant="outline" onClick={() => resetConfig('audio')}>
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LLM Settings */}
            <TabsContent value="llm" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Model Configuration</CardTitle>
                  <CardDescription>Configure your AI provider and model settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select value={llmConfig.provider} onValueChange={(value) => setLLMConfig({...llmConfig, provider: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="meta">Meta/Together</SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={llmConfig.api_key}
                      onChange={(e) => setLLMConfig({...llmConfig, api_key: e.target.value})}
                      placeholder="Enter your API key"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={llmConfig.model}
                        onChange={(e) => setLLMConfig({...llmConfig, model: e.target.value})}
                        placeholder="e.g., gpt-3.5-turbo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base_url">Base URL (Optional)</Label>
                      <Input
                        id="base_url"
                        value={llmConfig.base_url}
                        onChange={(e) => setLLMConfig({...llmConfig, base_url: e.target.value})}
                        placeholder="Custom API endpoint"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature: {llmConfig.temperature}</Label>
                    <Slider
                      value={[llmConfig.temperature]}
                      onValueChange={([value]) => setLLMConfig({...llmConfig, temperature: value})}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_tokens">Max Tokens</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      value={llmConfig.max_tokens}
                      onChange={(e) => setLLMConfig({...llmConfig, max_tokens: parseInt(e.target.value) || 1000})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={llmConfig.streaming}
                      onCheckedChange={(checked) => setLLMConfig({...llmConfig, streaming: checked})}
                    />
                    <Label>Enable streaming responses</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => saveConfig('llm', llmConfig)}>
                      Save AI Settings
                    </Button>
                    <Button variant="outline" onClick={() => resetConfig('llm')}>
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UI Settings */}
            <TabsContent value="ui" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interface Configuration</CardTitle>
                  <CardDescription>Customize the appearance and behavior of the UI</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={uiConfig.theme} onValueChange={(value) => setUIConfig({...uiConfig, theme: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Font Size: {uiConfig.font_size}px</Label>
                      <Slider
                        value={[uiConfig.font_size]}
                        onValueChange={([value]) => setUIConfig({...uiConfig, font_size: value})}
                        max={24}
                        min={8}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zoom Level: {uiConfig.zoom_level}x</Label>
                      <Slider
                        value={[uiConfig.zoom_level]}
                        onValueChange={([value]) => setUIConfig({...uiConfig, zoom_level: value})}
                        max={2}
                        min={0.5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Panel Visibility</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(uiConfig.panels).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => 
                              setUIConfig({
                                ...uiConfig, 
                                panels: {...uiConfig.panels, [key]: checked}
                              })
                            }
                          />
                          <Label className="capitalize">{key}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Advanced Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={uiConfig.self_test_on_start}
                          onCheckedChange={(checked) => setUIConfig({...uiConfig, self_test_on_start: checked})}
                        />
                        <Label>Run self-test on startup</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={uiConfig.latency_meters}
                          onCheckedChange={(checked) => setUIConfig({...uiConfig, latency_meters: checked})}
                        />
                        <Label>Show latency meters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={uiConfig.earcons}
                          onCheckedChange={(checked) => setUIConfig({...uiConfig, earcons: checked})}
                        />
                        <Label>Enable audio notifications</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => saveConfig('ui', uiConfig)}>
                      Save UI Settings
                    </Button>
                    <Button variant="outline" onClick={() => resetConfig('ui')}>
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Avatar Settings */}
            <TabsContent value="avatar" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Configuration</CardTitle>
                  <CardDescription>Configure avatar appearance and rendering settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={avatarConfig.enabled}
                      onCheckedChange={(checked) => setAvatarConfig({...avatarConfig, enabled: checked})}
                    />
                    <Label>Enable Avatar</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Avatar Style</Label>
                    <Select value={avatarConfig.style} onValueChange={(value) => setAvatarConfig({...avatarConfig, style: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="abstract">Abstract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={avatarConfig.lip_sync}
                      onCheckedChange={(checked) => setAvatarConfig({...avatarConfig, lip_sync: checked})}
                    />
                    <Label>Enable Lip Sync</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renderer">Renderer</Label>
                    <Select value={avatarConfig.renderer} onValueChange={(value) => setAvatarConfig({...avatarConfig, renderer: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webgl">WebGL</SelectItem>
                        <SelectItem value="canvas">Canvas 2D</SelectItem>
                        <SelectItem value="css3d">CSS 3D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Performance Settings</Label>
                    <div className="space-y-2">
                      <Label>FPS Cap: {avatarConfig.performance.fps_cap}</Label>
                      <Slider
                        value={[avatarConfig.performance.fps_cap]}
                        onValueChange={([value]) => 
                          setAvatarConfig({
                            ...avatarConfig, 
                            performance: {...avatarConfig.performance, fps_cap: value}
                          })
                        }
                        max={60}
                        min={15}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quality">Quality</Label>
                      <Select 
                        value={avatarConfig.performance.quality} 
                        onValueChange={(value) => 
                          setAvatarConfig({
                            ...avatarConfig, 
                            performance: {...avatarConfig.performance, quality: value}
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={avatarConfig.sandbox.separate_process}
                      onCheckedChange={(checked) => 
                        setAvatarConfig({
                          ...avatarConfig, 
                          sandbox: {...avatarConfig.sandbox, separate_process: checked}
                        })
                      }
                    />
                    <Label>Run in separate process (experimental)</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => saveConfig('avatar', avatarConfig)}>
                      Save Avatar Settings
                    </Button>
                    <Button variant="outline" onClick={() => resetConfig('avatar')}>
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
