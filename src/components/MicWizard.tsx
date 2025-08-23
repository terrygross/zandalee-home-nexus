
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Volume2, Settings, Play, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGateway } from "@/hooks/useGateway";

interface AudioDevice {
  id: number;
  name: string;
  channels: number;
  default?: boolean;
}

interface DeviceResult {
  id: number;
  name: string;
  SNR: number;
  voiced: number;
  startDelay: number;
  clip: number;
  score: number;
}

interface MicWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MicWizard = ({ open, onOpenChange }: MicWizardProps) => {
  const [step, setStep] = useState<'devices' | 'running' | 'results'>('devices');
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [results, setResults] = useState<DeviceResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardProgress, setWizardProgress] = useState(0);
  const { toast } = useToast();
  const { micList, micWizard, micUse } = useGateway();

  useEffect(() => {
    if (open) {
      loadDevices();
    }
  }, [open]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const deviceData = await micList();
      // Handle both array format and object with devices property
      const deviceList = Array.isArray(deviceData) ? deviceData : (deviceData?.devices || []);
      setDevices(deviceList);
    } catch (error) {
      toast({
        title: "Error Loading Devices",
        description: "Could not load microphone devices. Using mock data.",
        variant: "destructive"
      });
      // Mock data fallback
      setDevices([
        { id: 1, name: "Default Microphone", channels: 1, default: true },
        { id: 2, name: "USB Headset", channels: 2 },
        { id: 3, name: "Built-in Microphone", channels: 1 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startWizard = async () => {
    setStep('running');
    setWizardProgress(0);
    setIsLoading(true);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setWizardProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const wizardResult = await micWizard();
      clearInterval(progressInterval);
      setWizardProgress(100);

      if (wizardResult.devices?.length > 0) {
        // Map backend metrics to UI format
        const mappedResults = wizardResult.devices.map((r: any) => ({
          id: r.id,
          name: r.name,
          SNR: r.snr_db,
          voiced: r.voiced_ratio,
          startDelay: r.start_delay_ms,
          clip: r.clipping_pct,
          score: r.score
        }));
        setResults(mappedResults);
        setSelectedDevice(mappedResults[0] || null);
        setStep('results');
      } else {
        throw new Error('No results from wizard');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast({
        title: "Wizard Error",
        description: "Using mock results for demonstration.",
        variant: "destructive"
      });
      
      // Mock results
      const mockResults: DeviceResult[] = devices.map((device, index) => ({
        id: device.id,
        name: device.name,
        SNR: 25.5 - index * 2,
        voiced: 0.75 - index * 0.1,
        startDelay: 20 + index * 10,
        clip: index * 0.5,
        score: 0.85 - index * 0.1
      }));
      
      setResults(mockResults);
      setSelectedDevice(mockResults[0]);
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  const applyDevice = async () => {
    if (!selectedDevice) return;

    setIsLoading(true);
    try {
      await micUse(selectedDevice.id);
      toast({
        title: "Mic Calibrated",
        description: `Now using ${selectedDevice.name} with ${selectedDevice.SNR.toFixed(1)}dB SNR`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: "Failed to save mic configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setStep('devices');
    setResults([]);
    setSelectedDevice(null);
    setWizardProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-3 h-3 sm:w-5 sm:h-5" />
            <span>Microphone Calibration Wizard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'devices' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Available Devices</span>
                    <Badge variant="secondary">
                      <Volume2 className="w-3 h-3 mr-1" />
                      Guided calibration
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading devices...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {device.channels} channel{device.channels !== 1 ? 's' : ''}
                                {device.default && ' • Default'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button 
                  onClick={startWizard} 
                  disabled={isLoading || devices.length === 0}
                  size="lg"
                  className="w-full sm:w-auto sm:px-8 text-sm min-h-[44px]"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Wizard
                </Button>
              </div>
            </>
          )}

          {step === 'running' && (
            <div className="space-y-6">
              <div className="text-center">
                <Mic className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
                <h3 className="text-lg font-semibold">Testing Microphones</h3>
                <p className="text-muted-foreground">
                  Please speak clearly when prompted...
                </p>
              </div>

              <Progress value={wizardProgress} className="w-full" />

              <div className="text-center">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span>Analyzing audio quality...</span>
                </div>
              </div>
            </div>
          )}

          {step === 'results' && (
            <>
              <div className="text-center mb-6">
                <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold">Calibration Complete</h3>
                <p className="text-muted-foreground">
                  Select the best device from the results below
                </p>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto p-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2"></th>
                      <th className="text-left p-2">Device</th>
                      <th className="text-left p-2">SNR (dB)</th>
                      <th className="text-left p-2">Voiced %</th>
                      <th className="hidden sm:table-cell text-left p-2">Start Delay</th>
                      <th className="hidden sm:table-cell text-left p-2">Clip</th>
                      <th className="text-left p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr 
                        key={result.id}
                        className={`border-b cursor-pointer transition-colors ${
                          selectedDevice?.id === result.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedDevice(result)}
                      >
                        <td className="p-2">
                          {selectedDevice?.id === result.id && (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                          )}
                        </td>
                        <td className="p-2 font-medium">{result.name}</td>
                        <td className="p-2">{result.SNR.toFixed(1)}</td>
                        <td className="p-2">{(result.voiced * 100).toFixed(1)}%</td>
                        <td className="hidden sm:table-cell p-2">{result.startDelay.toFixed(0)} ms</td>
                        <td className="hidden sm:table-cell p-2">{result.clip.toFixed(1)}%</td>
                        <td className="p-2 font-semibold text-primary">
                          {(result.score * 100).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={resetWizard}
                  className="w-full sm:w-auto text-sm min-h-[44px]"
                  size="default"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Run Again
                </Button>
                <Button 
                  onClick={applyDevice}
                  disabled={!selectedDevice || isLoading}
                  className="w-full sm:w-auto sm:px-8 text-sm min-h-[44px]"
                  size="default"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Apply & Save
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MicWizard;
