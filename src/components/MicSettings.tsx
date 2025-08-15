
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-text-primary text-sm">
            <Mic className="w-4 h-4 text-energy-cyan flex-shrink-0" />
            <span className="truncate">Mic Settings</span>
          </CardTitle>
          <CardDescription className="text-text-secondary text-xs">
            Configure audio input device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Button
              onClick={() => setWizardOpen(true)}
              className="w-full h-auto p-3 bg-energy-cyan/20 hover:bg-energy-cyan/30 border border-energy-cyan/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <Settings className="w-4 h-4 text-energy-cyan flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">Setup Wizard</div>
                <div className="text-text-secondary truncate">Full calibration</div>
              </div>
            </Button>

            <Button
              onClick={testVoice}
              disabled={isTestingVoice}
              className="w-full h-auto p-3 bg-energy-pulse/20 hover:bg-energy-pulse/30 border border-energy-pulse/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <Volume2 className="w-4 h-4 text-energy-pulse flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">Test Voice</div>
                <div className="text-text-secondary truncate">
                  {isTestingVoice ? 'Playing...' : 'TTS test'}
                </div>
              </div>
            </Button>

            <Button
              onClick={listDevices}
              className="w-full h-auto p-3 bg-energy-glow/20 hover:bg-energy-glow/30 border border-energy-glow/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <TestTube className="w-4 h-4 text-energy-glow flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">List Devices</div>
                <div className="text-text-secondary truncate">Show available</div>
              </div>
            </Button>
          </div>

          <div className="p-3 bg-space-surface/30 rounded-lg border border-border/30">
            <div className="text-xs font-medium text-text-primary mb-2">Quick Commands</div>
            <div className="space-y-1 text-xs">
              <code className="block bg-space-mid/50 px-2 py-1 rounded text-text-secondary truncate">:mic.list</code>
              <code className="block bg-space-mid/50 px-2 py-1 rounded text-text-secondary truncate">:mic.setup</code>
              <code className="block bg-space-mid/50 px-2 py-1 rounded text-text-secondary truncate">:mic.use &lt;id&gt;</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <MicWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
};

export default MicSettings;
