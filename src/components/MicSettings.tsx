
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Settings, TestTube, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MicWizardPage from "./MicWizardPage";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

const MicSettings = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isListingDevices, setIsListingDevices] = useState(false);
  const { toast } = useToast();

  const { speak, listMicDevices } = useZandaleeAPI();

  const testVoice = async () => {
    setIsTestingVoice(true);
    try {
      await speak("UI is online. Voice test successful.");
      toast({
        title: "Voice Test",
        description: "TTS system is working correctly",
      });
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
    setIsListingDevices(true);
    try {
      const devices = await listMicDevices();
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
    } finally {
      setIsListingDevices(false);
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
              className="w-full min-h-[44px] p-3 bg-energy-cyan/20 hover:bg-energy-cyan/30 border border-energy-cyan/30 flex items-center space-x-2 text-xs sm:text-sm"
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
              className="w-full min-h-[44px] p-3 bg-energy-pulse/20 hover:bg-energy-pulse/30 border border-energy-pulse/30 flex items-center space-x-2 text-xs sm:text-sm"
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
              disabled={isListingDevices}
              className="w-full min-h-[44px] p-3 bg-energy-glow/20 hover:bg-energy-glow/30 border border-energy-glow/30 flex items-center space-x-2 text-xs sm:text-sm"
              variant="outline"
            >
              <TestTube className="w-4 h-4 text-energy-glow flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">List Devices</div>
                <div className="text-text-secondary truncate">
                  {isListingDevices ? 'Loading...' : 'Show available'}
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <MicWizardPage open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
};

export default MicSettings;
