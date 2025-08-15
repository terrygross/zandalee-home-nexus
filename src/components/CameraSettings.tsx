
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { listCameraDevices, testCamera, setCameraEnabled: setAPICameraEnabled } = useZandaleeAPI();

  // Load camera state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('camera-enabled');
    if (savedState) {
      setCameraEnabled(JSON.parse(savedState));
    }
  }, []);

  const toggleCamera = async (enabled: boolean) => {
    setCameraEnabled(enabled);
    localStorage.setItem('camera-enabled', JSON.stringify(enabled));
    
    try {
      await setAPICameraEnabled(enabled);
      toast({
        title: enabled ? "Camera Enabled" : "Camera Disabled",
        description: enabled 
          ? "Camera system is now active for visual processing"
          : "Camera system has been deactivated",
      });
    } catch (error) {
      // Revert the toggle if API call fails
      setCameraEnabled(!enabled);
      localStorage.setItem('camera-enabled', JSON.stringify(!enabled));
      toast({
        title: "Camera Toggle Failed",
        description: error instanceof Error ? error.message : 'Failed to toggle camera',
        variant: "destructive"
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-text-primary text-xs">
          {cameraEnabled ? (
            <Camera className="w-4 h-4 text-energy-blue flex-shrink-0" />
          ) : (
            <CameraOff className="w-4 h-4 text-text-muted flex-shrink-0" />
          )}
          <span className="truncate">Camera</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Prominent Camera Toggle */}
        <div className={`p-2 rounded-lg border-2 transition-all ${
          cameraEnabled 
            ? 'bg-energy-blue/20 border-energy-blue/50' 
            : 'bg-space-surface/30 border-space-surface/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className={`w-4 h-4 ${cameraEnabled ? 'text-energy-blue' : 'text-text-muted'}`} />
              <Label htmlFor="camera-toggle" className="text-xs font-medium text-text-primary">
                Visual Input
              </Label>
            </div>
            <Switch
              id="camera-toggle"
              checked={cameraEnabled}
              onCheckedChange={toggleCamera}
            />
          </div>
          <div className="text-xs text-text-muted mt-1">
            {cameraEnabled ? 'Zandalee can see surroundings' : 'Visual processing disabled'}
          </div>
        </div>

        {/* Camera Controls - Only show when enabled */}
        {cameraEnabled && (
          <div className="space-y-1">
            <Button
              onClick={testCameraSystem}
              disabled={isTestingCamera}
              className="w-full h-auto p-2 bg-energy-blue/20 hover:bg-energy-blue/30 border border-energy-blue/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <TestTube className="w-3 h-3 text-energy-blue flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">
                  {isTestingCamera ? 'Testing...' : 'Test Camera'}
                </div>
              </div>
            </Button>

            <Button
              onClick={listDevices}
              disabled={isListingDevices}
              className="w-full h-auto p-2 bg-energy-pulse/20 hover:bg-energy-pulse/30 border border-energy-pulse/30 flex items-center space-x-2 text-xs"
              variant="outline"
            >
              <Camera className="w-3 h-3 text-energy-pulse flex-shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-text-primary truncate">
                  {isListingDevices ? 'Loading...' : 'List Devices'}
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Future Features Notice */}
        <div className="p-1 bg-energy-cyan/5 border border-energy-cyan/20 rounded-lg">
          <p className="text-xs text-energy-cyan">
            📹 Gesture recognition & lip-sync ready
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraSettings;
