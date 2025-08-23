import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Volume2, Settings, Play, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGateway } from "@/hooks/useGateway";

interface AudioDevice {
  id: number;
  name: string;
  channels: number;
  default?: boolean;
}

interface DeviceMetrics {
  id: number;
  name: string;
  SNR: number;
  voiced: number;
  startDelay: number;
  clip: number;
  score: number;
}

interface MicWizardPageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MicWizardPage = ({ open, onOpenChange }: MicWizardPageProps) => {
  const [step, setStep] = useState<'preflight' | 'enumerate' | 'testing' | 'results' | 'confirm'>('preflight');
  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([]);
  const [wizardResults, setWizardResults] = useState<DeviceMetrics[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wizardLog, setWizardLog] = useState<string[]>([]);
  const { toast } = useToast();
  const gateway = useGateway();

  const addLog = (message: string) => {
    setWizardLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    if (open && step === 'preflight') {
      startWizard();
    }
  }, [open]);

  const startWizard = async () => {
    setIsProcessing(true);
    setWizardLog([]);
    
    try {
      // Preflight
      addLog('Starting Mic Wizard - Preflight phase');
      addLog('Loading available devices...');
      
      // Enumerate devices
      setStep('enumerate');
      const deviceList = await gateway.micList();
      setAvailableDevices(deviceList.devices || []);
      addLog(`Found ${deviceList.devices?.length || 0} valid input devices`);
      
      if (!deviceList.devices || deviceList.devices.length === 0) {
        throw new Error('No valid input devices found');
      }

      // Start testing phase
      setStep('testing');
      addLog('Starting comprehensive device testing...');
      
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 200);

      try {
        addLog('Running wizard with real device testing...');
        const wizardResponse = await gateway.micWizard();
        
        clearInterval(progressInterval);
        setProgress(100);
        
        if (wizardResponse.ok) {
          setWizardResults(wizardResponse.devices || []);
          if (wizardResponse.chosen) {
            setSelectedDevice(wizardResponse.chosen);
          }
        } else {
          throw new Error('Wizard failed');
        }

        addLog(`Wizard completed successfully. Tested ${wizardResponse.devices?.length || 0} devices`);
        
        if (!wizardResponse.devices || wizardResponse.devices.length === 0) {
          throw new Error('No working devices found');
        }

        setStep('results');
        
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
      
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Mic Wizard Error",
        description: error instanceof Error ? error.message : 'Failed to start wizard',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectDevice = async (deviceId: number) => {
    setIsProcessing(true);
    addLog(`Applying device selection: ${deviceId}`);
    
    try {
      await gateway.micUse(deviceId);
      
      addLog('Device configuration saved');
      
      toast({
        title: "Mic Selected",
        description: `Device ${deviceId} is now active`,
      });
      
      onOpenChange(false);
      
    } catch (error) {
      addLog(`Error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const retestDevices = async () => {
    setStep('testing');
    setWizardResults([]);
    setSelectedDevice(null);
    setProgress(0);
    await startWizard();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>Microphone Calibration Wizard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Status Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-3">
              {step === 'preflight' && (
                <div className="text-center space-y-2">
                  <Volume2 className="w-8 h-8 text-primary mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-semibold">Preflight</h3>
                    <p className="text-muted-foreground text-xs">Preparing...</p>
                  </div>
                </div>
              )}

              {step === 'enumerate' && (
                <div className="text-center space-y-2">
                  <Mic className="w-8 h-8 text-primary mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-semibold">Enumerate</h3>
                    <p className="text-muted-foreground text-xs">Found {availableDevices.length} devices</p>
                  </div>
                </div>
              )}

              {step === 'testing' && (
                <div className="space-y-3">
                  <div className="text-center">
                    <Mic className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                    <h3 className="text-sm font-semibold">Testing Devices</h3>
                    <p className="text-muted-foreground text-xs">Real audio analysis</p>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {step === 'results' && (
                <div className="text-center space-y-2">
                  <Check className="w-8 h-8 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-sm font-semibold">Complete</h3>
                    <p className="text-muted-foreground text-xs">{wizardResults.length} devices tested</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Panel */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {step === 'results' ? 'Test Results' : 'Progress Log'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {step === 'results' ? (
                <div className="space-y-3 h-full flex flex-col">
                  <div className="overflow-x-auto overflow-y-auto max-h-64 p-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-muted">
                          <th className="text-left p-2 font-medium">Device</th>
                          <th className="text-center p-2 font-medium hidden sm:table-cell">SNR (dB)</th>
                          <th className="text-center p-2 font-medium hidden sm:table-cell">Voiced %</th>
                          <th className="text-center p-2 font-medium hidden md:table-cell">Delay (ms)</th>
                          <th className="text-center p-2 font-medium hidden md:table-cell">Clip %</th>
                          <th className="text-center p-2 font-medium">Score</th>
                          <th className="text-center p-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardResults.map((device) => (
                          <tr key={device.id} className="border-b border-muted/50">
                            <td className="p-2">{device.name}</td>
                            <td className="text-center p-2 hidden sm:table-cell">{device.SNR?.toFixed(1) || 'N/A'}</td>
                            <td className="text-center p-2 hidden sm:table-cell">{device.voiced ? (device.voiced * 100).toFixed(0) : 'N/A'}%</td>
                            <td className="text-center p-2 hidden md:table-cell">{device.startDelay || 'N/A'}</td>
                            <td className="text-center p-2 hidden md:table-cell">{device.clip ? (device.clip * 100).toFixed(1) : 'N/A'}%</td>
                            <td className="text-center p-2 font-bold">{device.score?.toFixed(2) || 'N/A'}</td>
                            <td className="text-center p-2">
                              <Button
                                onClick={() => selectDevice(device.id)}
                                size="sm"
                                className="bg-primary/20 hover:bg-primary/30 text-primary"
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <Button 
                      variant="outline" 
                      onClick={retestDevices}
                      disabled={isProcessing}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Retest
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto bg-muted/30 rounded p-2 font-mono text-xs">
                  {wizardLog.map((line, index) => (
                    <div key={index} className="text-muted-foreground mb-0.5">
                      {line}
                    </div>
                  ))}
                  {wizardLog.length === 0 && (
                    <div className="text-muted-foreground">Log output will appear here...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MicWizardPage;