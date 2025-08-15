
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Volume2, VolumeX, Mic, MicOff, Headphones, HeadphonesIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

const AudioControls = () => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const { toast } = useToast();
  const { getConfig, updateConfig } = useZandaleeAPI();

  // Load current audio settings from config
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        const config = await getConfig();
        if (config.audio) {
          setAudioEnabled(config.audio.enabled !== false);
          setMicEnabled(config.audio.input_enabled !== false);
          setSpeakerEnabled(config.audio.output_enabled !== false);
        }
      } catch (error) {
        console.log('Could not load audio config:', error);
      }
    };
    loadAudioSettings();
  }, [getConfig]);

  const handleAudioToggle = async (enabled: boolean) => {
    setAudioEnabled(enabled);
    try {
      await updateConfig({
        audio: { enabled }
      });
      toast({
        title: enabled ? "Audio Enabled" : "Audio Disabled",
        description: `Audio system is now ${enabled ? 'on' : 'off'}`,
      });
    } catch (error) {
      toast({
        title: "Audio Toggle Error",
        description: error instanceof Error ? error.message : 'Failed to toggle audio',
        variant: "destructive"
      });
    }
  };

  const handleMicToggle = async (enabled: boolean) => {
    setMicEnabled(enabled);
    try {
      await updateConfig({
        audio: { input_enabled: enabled }
      });
      toast({
        title: enabled ? "Microphone Enabled" : "Microphone Disabled",
        description: `Microphone is now ${enabled ? 'on' : 'off'}`,
      });
    } catch (error) {
      toast({
        title: "Microphone Toggle Error",
        description: error instanceof Error ? error.message : 'Failed to toggle microphone',
        variant: "destructive"
      });
    }
  };

  const handleSpeakerToggle = async (enabled: boolean) => {
    setSpeakerEnabled(enabled);
    try {
      await updateConfig({
        audio: { output_enabled: enabled }
      });
      toast({
        title: enabled ? "Speaker Enabled" : "Speaker Disabled",
        description: `Speaker output is now ${enabled ? 'on' : 'off'}`,
      });
    } catch (error) {
      toast({
        title: "Speaker Toggle Error",
        description: error instanceof Error ? error.message : 'Failed to toggle speaker',
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-text-primary text-sm">
          <Volume2 className="w-4 h-4 text-energy-cyan flex-shrink-0" />
          <span className="truncate">Audio Controls</span>
        </CardTitle>
        <CardDescription className="text-text-secondary text-xs">
          Toggle audio components on/off
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Master Switch */}
        <div className="flex items-center justify-between p-3 bg-space-surface/30 rounded-lg">
          <div className="flex items-center space-x-3">
            {audioEnabled ? (
              <Volume2 className="w-5 h-5 text-energy-cyan" />
            ) : (
              <VolumeX className="w-5 h-5 text-text-muted" />
            )}
            <div>
              <Label htmlFor="audio-master" className="text-sm font-medium">Audio</Label>
              <div className="text-xs text-text-secondary">Master audio control</div>
            </div>
          </div>
          <Switch
            id="audio-master"
            checked={audioEnabled}
            onCheckedChange={handleAudioToggle}
          />
        </div>

        {/* Microphone Switch */}
        <div className="flex items-center justify-between p-3 bg-space-surface/30 rounded-lg">
          <div className="flex items-center space-x-3">
            {micEnabled ? (
              <Mic className="w-5 h-5 text-energy-pulse" />
            ) : (
              <MicOff className="w-5 h-5 text-text-muted" />
            )}
            <div>
              <Label htmlFor="mic-toggle" className="text-sm font-medium">Mic</Label>
              <div className="text-xs text-text-secondary">Voice input</div>
            </div>
          </div>
          <Switch
            id="mic-toggle"
            checked={micEnabled}
            onCheckedChange={handleMicToggle}
            disabled={!audioEnabled}
          />
        </div>

        {/* Speaker Switch */}
        <div className="flex items-center justify-between p-3 bg-space-surface/30 rounded-lg">
          <div className="flex items-center space-x-3">
            {speakerEnabled ? (
              <Headphones className="w-5 h-5 text-energy-glow" />
            ) : (
              <HeadphonesIcon className="w-5 h-5 text-text-muted" />
            )}
            <div>
              <Label htmlFor="speaker-toggle" className="text-sm font-medium">Speaker</Label>
              <div className="text-xs text-text-secondary">Audio output</div>
            </div>
          </div>
          <Switch
            id="speaker-toggle"
            checked={speakerEnabled}
            onCheckedChange={handleSpeakerToggle}
            disabled={!audioEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioControls;
