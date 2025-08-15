
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Settings, TestTube, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MicWizard from "./MicWizard";

const MicSettings = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const { toast } = useToast();

  const API_BASE = 'http://localhost:3001';

  const testVoice = async () => {
    setIsTestingVoice(true);
    try {
      const response = await fetch(`${API_BASE}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "UI is online. Voice test successful." })
      });

      if (response.ok) {
        toast({
          title: "Voice Test",
          description: "TTS system is working correctly",
        });
      } else {
        throw new Error('Voice test failed');
      }
    } catch (error) {
      toast({
        title: "Voice Test Failed",
        description: error instanceof Error ? error.message : 'TTS system error',
        variant: "destructive"
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  const listDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/mic/list`);
      const devices = await response.json();
      
      console.log('Available audio devices:', devices);
      toast({
        title: "Audio Devices",
        description: `Found ${devices.length} devices. Check console for details.`,
      });
    } catch (error) {
      toast({
        title: "Device List Error",
        description: error instanceof Error ? error.message : 'Failed to list devices',
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-text-primary">
            <Mic className="w-5 h-5 text-energy-cyan" />
            <span>Microphone Settings</span>
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Configure and calibrate your audio input device for optimal voice recognition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setWizardOpen(true)}
              className="h-auto p-4 bg-energy-cyan/20 hover:bg-energy-cyan/30 border border-energy-cyan/30 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Settings className="w-6 h-6 text-energy-cyan" />
              <div className="text-center">
                <div className="font-semibold text-text-primary">Run Mic Setup</div>
                <div className="text-xs text-text-secondary">Full calibration wizard</div>
              </div>
            </Button>

            <Button
              onClick={testVoice}
              disabled={isTestingVoice}
              className="h-auto p-4 bg-energy-pulse/20 hover:bg-energy-pulse/30 border border-energy-pulse/30 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Volume2 className="w-6 h-6 text-energy-pulse" />
              <div className="text-center">
                <div className="font-semibold text-text-primary">Test Voice</div>
                <div className="text-xs text-text-secondary">
                  {isTestingVoice ? 'Playing...' : 'TTS smoke test'}
                </div>
              </div>
            </Button>

            <Button
              onClick={listDevices}
              className="h-auto p-4 bg-energy-glow/20 hover:bg-energy-glow/30 border border-energy-glow/30 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <TestTube className="w-6 h-6 text-energy-glow" />
              <div className="text-center">
                <div className="font-semibold text-text-primary">List Devices</div>
                <div className="text-xs text-text-secondary">Show available mics</div>
              </div>
            </Button>

            <div className="p-4 bg-space-surface/30 rounded-lg border border-border/30">
              <div className="text-sm font-medium text-text-primary mb-2">Quick Commands</div>
              <div className="space-y-1 text-xs text-text-secondary">
                <code className="block bg-space-mid/50 px-2 py-1 rounded">:mic.list</code>
                <code className="block bg-space-mid/50 px-2 py-1 rounded">:mic.setup</code>
                <code className="block bg-space-mid/50 px-2 py-1 rounded">:mic.use &lt;id&gt;</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MicWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
};

export default MicSettings;
