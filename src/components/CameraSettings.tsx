
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, TestTube, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

const CameraSettings = () => {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isListingDevices, setIsListingDevices] = useState(false);
  const { toast } = useToast();
  const { listCameraDevices, testCamera } = useZandaleeAPI();

  const toggleCamera = async (enabled: boolean) => {
    setCameraEnabled(enabled);
    
    if (enabled) {
      toast({
        title: "Camera Enabled",
        description: "Camera system is now active for future visual processing",
      });
    } else {
      toast({
        title: "Camera Disabled",
        description: "Camera system has been deactivated",
      });
    }
  };

  const testCameraSystem = async () => {
    setIsTestingCamera(true);
    try {
      await testCamera();
      toast({
        title: "Camera Test",
        description: "Camera system test completed successfully",
      });
    } catch (error) {
      toast({
        title: "Camera Test Failed",
        description: error instanceof Error ? error.message : 'Camera system error',
        variant: "destructive"
      });
    } finally {
      setIsTestingCamera(false);
    }
  };

  const listDevices = async () => {
    setIsListingDevices(true);
    try {
      const devices = await listCameraDevices();
      console.log('Available camera devices:', devices);
      toast({
        title: "Camera Devices",
        description: `Found ${devices.length} camera devices. Check console for details.`,
      });
    } catch (error) {
      toast({
        title: "Device List Error",
        description: error instanceof Error ? error.message : 'Failed to list camera devices',
        variant: "destructive"
      });
    } finally {
      setIsListingDevices(false);
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-text-primary text-sm">
          {cameraEnabled ? (
            <Camera className="w-4 h-4 text-energy-blue flex-shrink-0" />
          ) : (
            <CameraOff className="w-4 h-4 text-text-muted flex-shrink-0" />
          )}
          <span className="truncate">Camera Settings</span>
        </CardTitle>
        <CardDescription className="text-text-secondary text-xs">
          Configure visual input for future features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Camera Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-space-surface/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-energy-blue" />
            <Label htmlFor="camera-toggle" className="text-xs font-medium text-text-primary">
              Enable Camera
            </Label>
          </div>
          <Switch
            id="camera-toggle"
            checked={cameraEnabled}
            onCheckedChange={toggleCamera}
          />
        </div>

        {/* Camera Controls - Only show when enabled */}
        {cameraEnabled && (
          <div className="space-y-2">
            <Button
              onClick={testCameraSystem}
              disabled={isTestingCamera}
              className="w-full h-auto p-3 bg-energy-blue/20 hover:bg-energy-blue/30 border border-energy-blue/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <TestTube className="w-4 h-4 text-energy-blue flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">Test Camera</div>
                <div className="text-text-secondary truncate">
                  {isTestingCamera ? 'Testing...' : 'Check camera access'}
                </div>
              </div>
            </Button>

            <Button
              onClick={listDevices}
              disabled={isListingDevices}
              className="w-full h-auto p-3 bg-energy-pulse/20 hover:bg-energy-pulse/30 border border-energy-pulse/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <Camera className="w-4 h-4 text-energy-pulse flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">List Devices</div>
                <div className="text-text-secondary truncate">
                  {isListingDevices ? 'Loading...' : 'Show available cameras'}
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Future Features Notice */}
        <div className="p-2 bg-energy-cyan/5 border border-energy-cyan/20 rounded-lg">
          <p className="text-xs text-energy-cyan">
            📹 Future: Visual processing, gesture recognition, and avatar lip-sync
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraSettings;
