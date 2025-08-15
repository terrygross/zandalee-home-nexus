
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Volume2, VolumeX, Mic, MicOff, Speaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

const AudioControls = () => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const { toast } = useToast();
  const { getConfig, updateConfig } = useZandaleeAPI();

  const toggleAudio = async () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    toast({
      title: newState ? "Audio Enabled" : "Audio Disabled",
      description: `Master audio is now ${newState ? 'on' : 'off'}`,
    });
  };

  const toggleMic = async () => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    toast({
      title: newState ? "Microphone Enabled" : "Microphone Disabled",
      description: `Microphone is now ${newState ? 'on' : 'off'}`,
    });
  };

  const toggleSpeaker = async () => {
    const newState = !speakerEnabled;
    setSpeakerEnabled(newState);
    toast({
      title: newState ? "Speaker Enabled" : "Speaker Disabled", 
      description: `Speaker is now ${newState ? 'on' : 'off'}`,
    });
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-text-primary text-xs">Audio Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Master Audio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {audioEnabled ? <Volume2 className="w-4 h-4 text-energy-cyan" /> : <VolumeX className="w-4 h-4 text-status-error" />}
            <span className="text-xs text-text-primary">Audio</span>
          </div>
          <Switch
            checked={audioEnabled}
            onCheckedChange={toggleAudio}
            className="scale-75"
          />
        </div>

        {/* Microphone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {micEnabled ? <Mic className="w-4 h-4 text-energy-cyan" /> : <MicOff className="w-4 h-4 text-status-error" />}
            <span className="text-xs text-text-primary">Mic</span>
          </div>
          <Switch
            checked={micEnabled}
            onCheckedChange={toggleMic}
            className="scale-75"
          />
        </div>

        {/* Speaker */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Speaker className="w-4 h-4 text-energy-cyan" />
            <span className="text-xs text-text-primary">Speaker</span>
          </div>
          <Switch
            checked={speakerEnabled}
            onCheckedChange={toggleSpeaker}
            className="scale-75"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioControls;
