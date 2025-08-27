import { Settings, Volume2, Zap, Palette, Cog, HelpCircle, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getApiBase } from "@/utils/apiConfig";

// Default configurations
const defaultAudioConfig = {
  voice: "Microsoft David Desktop - English (United States)",
  rate: 0,
  volume: 90,
  micDevice: "",
  sampleRate: 16000,
  vadMode: 1,
  vadFrameMs: 10,
  prerollMs: 500,
  silenceMs: 5000,
  halfDuplex: true
};

const defaultLLMConfig = {
  backend: "ollama",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "gemma3",
  metaApiKey: "",
  deepseekModel: ""
};

const defaultUIConfig = {
  theme: "dark",
  selfTestOnStart: true,
  enableInvites: true,
  showAdvanced: false
};

const defaultAvatarConfig = {
  enabled: false,
  selectedAvatar: "",
  avatarSize: 128,
  animationSpeed: 1.0
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDrawer({ isOpen, onOpenChange }: SettingsDrawerProps) {
  const [audioConfig, setAudioConfig] = useState(defaultAudioConfig);
  const [llmConfig, setLLMConfig] = useState(defaultLLMConfig);
  const [uiConfig, setUIConfig] = useState(defaultUIConfig);
  const [avatarConfig, setAvatarConfig] = useState(defaultAvatarConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load all configurations on component mount
  useEffect(() => {
    const loadConfigs = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        const [audioRes, llmRes, uiRes, avatarRes] = await Promise.all([
          fetch(`${getApiBase()}/config/audio`),
          fetch(`${getApiBase()}/config/llm`),
          fetch(`${getApiBase()}/config/ui`),
          fetch(`${getApiBase()}/config/avatar`)
        ]);

        if (audioRes.ok) {
          const audioData = await audioRes.json();
          setAudioConfig({ ...defaultAudioConfig, ...audioData });
        }

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          setLLMConfig({ ...defaultLLMConfig, ...llmData });
        }

        if (uiRes.ok) {
          const uiData = await uiRes.json();
          setUIConfig({ ...defaultUIConfig, ...uiData });
        }

        if (avatarRes.ok) {
          const avatarData = await avatarRes.json();
          setAvatarConfig({ ...defaultAvatarConfig, ...avatarData });
        }

      } catch (error) {
        console.error("Failed to load configurations:", error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigs();
  }, [isOpen]);

  const saveConfig = async (configType: string, config: any) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiBase()}/config/${configType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error(`Failed to save ${configType} config`);

      toast({
        title: "Success",
        description: `${configType.charAt(0).toUpperCase() + configType.slice(1)} settings saved`,
      });

    } catch (error) {
      console.error(`Failed to save ${configType} config:`, error);
      toast({
        title: "Error",
        description: `Failed to save ${configType} settings`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = async (configType: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiBase()}/config/${configType}/reset`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error(`Failed to reset ${configType} config`);

      // Reload the specific config
      const configRes = await fetch(`${getApiBase()}/config/${configType}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        
        switch (configType) {
          case 'audio':
            setAudioConfig({ ...defaultAudioConfig, ...configData });
            break;
          case 'llm':
            setLLMConfig({ ...defaultLLMConfig, ...configData });
            break;
          case 'ui':
            setUIConfig({ ...defaultUIConfig, ...configData });
            break;
          case 'avatar':
            setAvatarConfig({ ...defaultAvatarConfig, ...configData });
            break;
        }
      }

      toast({
        title: "Success",
        description: `${configType.charAt(0).toUpperCase() + configType.slice(1)} settings reset to defaults`,
      });

    } catch (error) {
      console.error(`Failed to reset ${configType} config:`, error);
      toast({
        title: "Error",
        description: `Failed to reset ${configType} settings`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] bg-space-darker border-space-light">
        <DrawerHeader className="border-b border-space-light">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-space-lightest">System Settings</DrawerTitle>
              <DrawerDescription className="text-text-muted">
                Configure Zandalee AI settings and preferences
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-text-muted hover:text-space-lightest"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="audio" className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-4 bg-space-mid">
                <TabsTrigger value="audio" className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="llm" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI Models
                </TabsTrigger>
                <TabsTrigger value="ui" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Interface
                </TabsTrigger>
                <TabsTrigger value="avatar" className="flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  Avatar
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-text-muted">Loading settings...</div>
                </div>
              ) : (
                <>
                  <TabsContent value="audio" className="space-y-6 pb-6">
                    <Card className="bg-space-mid border-space-light">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-space-lightest">Voice & Audio</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resetConfig('audio')}
                            disabled={isSaving}
                            className="border-space-light hover:bg-space-light"
                          >
                            Reset to Defaults
                          </Button>
                        </div>
                        <CardDescription className="text-text-muted">
                          Configure voice synthesis and audio input settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="voice" className="text-space-lightest">Voice</Label>
                            <Input
                              id="voice"
                              value={audioConfig.voice}
                              onChange={(e) => setAudioConfig({ ...audioConfig, voice: e.target.value })}
                              className="bg-space-darker border-space-light text-space-lightest"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="micDevice" className="text-space-lightest">Microphone Device</Label>
                            <Input
                              id="micDevice"
                              value={audioConfig.micDevice}
                              onChange={(e) => setAudioConfig({ ...audioConfig, micDevice: e.target.value })}
                              placeholder="Leave blank for default"
                              className="bg-space-darker border-space-light text-space-lightest"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-space-lightest">Speech Rate: {audioConfig.rate}</Label>
                            <Slider
                              value={[audioConfig.rate]}
                              onValueChange={(value) => setAudioConfig({ ...audioConfig, rate: value[0] })}
                              max={10}
                              min={-10}
                              step={1}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-space-lightest">Volume: {audioConfig.volume}%</Label>
                            <Slider
                              value={[audioConfig.volume]}
                              onValueChange={(value) => setAudioConfig({ ...audioConfig, volume: value[0] })}
                              max={100}
                              min={0}
                              step={5}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-space-lightest">Sample Rate: {audioConfig.sampleRate} Hz</Label>
                            <Select
                              value={audioConfig.sampleRate.toString()}
                              onValueChange={(value) => setAudioConfig({ ...audioConfig, sampleRate: parseInt(value) })}
                            >
                              <SelectTrigger className="bg-space-darker border-space-light text-space-lightest">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8000">8000 Hz</SelectItem>
                                <SelectItem value="16000">16000 Hz</SelectItem>
                                <SelectItem value="22050">22050 Hz</SelectItem>
                                <SelectItem value="44100">44100 Hz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator className="bg-space-light" />

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="text-space-lightest">Half Duplex Mode</Label>
                            <p className="text-sm text-text-muted">Enable for better voice detection</p>
                          </div>
                          <Switch
                            checked={audioConfig.halfDuplex}
                            onCheckedChange={(checked) => setAudioConfig({ ...audioConfig, halfDuplex: checked })}
                          />
                        </div>

                        <Button 
                          onClick={() => saveConfig('audio', audioConfig)}
                          disabled={isSaving}
                          className="w-full bg-energy-cyan hover:bg-energy-cyan/80 text-space-darker"
                        >
                          {isSaving ? 'Saving...' : 'Save Audio Settings'}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="llm" className="space-y-6 pb-6">
                    <Card className="bg-space-mid border-space-light">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-space-lightest">AI Language Models</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resetConfig('llm')}
                            disabled={isSaving}
                            className="border-space-light hover:bg-space-light"
                          >
                            Reset to Defaults
                          </Button>
                        </div>
                        <CardDescription className="text-text-muted">
                          Configure AI backend and model settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="backend" className="text-space-lightest">Backend</Label>
                            <Select
                              value={llmConfig.backend}
                              onValueChange={(value) => setLLMConfig({ ...llmConfig, backend: value })}
                            >
                              <SelectTrigger className="bg-space-darker border-space-light text-space-lightest">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                <SelectItem value="meta">Meta API</SelectItem>
                                <SelectItem value="deepseek">DeepSeek</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ollamaModel" className="text-space-lightest">Ollama Model</Label>
                            <Input
                              id="ollamaModel"
                              value={llmConfig.ollamaModel}
                              onChange={(e) => setLLMConfig({ ...llmConfig, ollamaModel: e.target.value })}
                              className="bg-space-darker border-space-light text-space-lightest"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ollamaUrl" className="text-space-lightest">Ollama URL</Label>
                          <Input
                            id="ollamaUrl"
                            value={llmConfig.ollamaUrl}
                            onChange={(e) => setLLMConfig({ ...llmConfig, ollamaUrl: e.target.value })}
                            className="bg-space-darker border-space-light text-space-lightest"
                          />
                        </div>

                        {llmConfig.backend === 'meta' && (
                          <div className="space-y-2">
                            <Label htmlFor="metaApiKey" className="text-space-lightest">Meta API Key</Label>
                            <Input
                              id="metaApiKey"
                              type="password"
                              value={llmConfig.metaApiKey}
                              onChange={(e) => setLLMConfig({ ...llmConfig, metaApiKey: e.target.value })}
                              className="bg-space-darker border-space-light text-space-lightest"
                            />
                          </div>
                        )}

                        {llmConfig.backend === 'deepseek' && (
                          <div className="space-y-2">
                            <Label htmlFor="deepseekModel" className="text-space-lightest">DeepSeek Model</Label>
                            <Input
                              id="deepseekModel"
                              value={llmConfig.deepseekModel}
                              onChange={(e) => setLLMConfig({ ...llmConfig, deepseekModel: e.target.value })}
                              className="bg-space-darker border-space-light text-space-lightest"
                            />
                          </div>
                        )}

                        <Button 
                          onClick={() => saveConfig('llm', llmConfig)}
                          disabled={isSaving}
                          className="w-full bg-energy-cyan hover:bg-energy-cyan/80 text-space-darker"
                        >
                          {isSaving ? 'Saving...' : 'Save LLM Settings'}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="ui" className="space-y-6 pb-6">
                    <Card className="bg-space-mid border-space-light">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-space-lightest">User Interface</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resetConfig('ui')}
                            disabled={isSaving}
                            className="border-space-light hover:bg-space-light"
                          >
                            Reset to Defaults
                          </Button>
                        </div>
                        <CardDescription className="text-text-muted">
                          Customize the interface appearance and behavior
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-space-lightest">Self-Test on Startup</Label>
                              <p className="text-sm text-text-muted">Run system diagnostics when starting</p>
                            </div>
                            <Switch
                              checked={uiConfig.selfTestOnStart}
                              onCheckedChange={(checked) => setUIConfig({ ...uiConfig, selfTestOnStart: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-space-lightest">Enable Invites</Label>
                              <p className="text-sm text-text-muted">Allow family member invitations</p>
                            </div>
                            <Switch
                              checked={uiConfig.enableInvites}
                              onCheckedChange={(checked) => setUIConfig({ ...uiConfig, enableInvites: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-space-lightest">Show Advanced Options</Label>
                              <p className="text-sm text-text-muted">Display technical settings</p>
                            </div>
                            <Switch
                              checked={uiConfig.showAdvanced}
                              onCheckedChange={(checked) => setUIConfig({ ...uiConfig, showAdvanced: checked })}
                            />
                          </div>
                        </div>

                        <Button 
                          onClick={() => saveConfig('ui', uiConfig)}
                          disabled={isSaving}
                          className="w-full bg-energy-cyan hover:bg-energy-cyan/80 text-space-darker"
                        >
                          {isSaving ? 'Saving...' : 'Save UI Settings'}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="avatar" className="space-y-6 pb-6">
                    <Card className="bg-space-mid border-space-light">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-space-lightest">Avatar Settings</CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resetConfig('avatar')}
                            disabled={isSaving}
                            className="border-space-light hover:bg-space-light"
                          >
                            Reset to Defaults
                          </Button>
                        </div>
                        <CardDescription className="text-text-muted">
                          Configure avatar appearance and behavior
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="text-space-lightest">Enable Avatar</Label>
                            <p className="text-sm text-text-muted">Show animated avatar during conversations</p>
                          </div>
                          <Switch
                            checked={avatarConfig.enabled}
                            onCheckedChange={(checked) => setAvatarConfig({ ...avatarConfig, enabled: checked })}
                          />
                        </div>

                        {avatarConfig.enabled && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="selectedAvatar" className="text-space-lightest">Selected Avatar</Label>
                              <Input
                                id="selectedAvatar"
                                value={avatarConfig.selectedAvatar}
                                onChange={(e) => setAvatarConfig({ ...avatarConfig, selectedAvatar: e.target.value })}
                                placeholder="Avatar name or ID"
                                className="bg-space-darker border-space-light text-space-lightest"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-space-lightest">Avatar Size: {avatarConfig.avatarSize}px</Label>
                                <Slider
                                  value={[avatarConfig.avatarSize]}
                                  onValueChange={(value) => setAvatarConfig({ ...avatarConfig, avatarSize: value[0] })}
                                  max={256}
                                  min={64}
                                  step={16}
                                  className="w-full"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-space-lightest">Animation Speed: {avatarConfig.animationSpeed.toFixed(1)}x</Label>
                                <Slider
                                  value={[avatarConfig.animationSpeed]}
                                  onValueChange={(value) => setAvatarConfig({ ...avatarConfig, animationSpeed: value[0] })}
                                  max={3.0}
                                  min={0.1}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        <Button 
                          onClick={() => saveConfig('avatar', avatarConfig)}
                          disabled={isSaving}
                          className="w-full bg-energy-cyan hover:bg-energy-cyan/80 text-space-darker"
                        >
                          {isSaving ? 'Saving...' : 'Save Avatar Settings'}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}