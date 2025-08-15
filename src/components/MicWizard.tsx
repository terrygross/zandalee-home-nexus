
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mic, Volume2, Settings, Play, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AudioDevice {
  id: number;
  name: string;
  max_input_channels: number;
  samplerate: number;
}

interface DeviceMetrics {
  id: number;
  name: string;
  snr_db: number;
  voiced_ratio: number;
  start_delay_ms: number;
  clipping_percent: number;
  dropout_percent: number;
  score: number;
  samplerate: number;
}

interface MicWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MicWizard = ({ open, onOpenChange }: MicWizardProps) => {
  const [step, setStep] = useState<'preflight' | 'enumerate' | 'testing' | 'results' | 'confirm'>('preflight');
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [currentDevice, setCurrentDevice] = useState<number>(0);
  const [testingPhase, setTestingPhase] = useState<'noise' | 'voice'>('noise');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<DeviceMetrics[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const API_BASE = 'http://localhost:3001';

  useEffect(() => {
    if (open && step === 'preflight') {
      startWizard();
    }
  }, [open]);

  const startWizard = async () => {
    setIsProcessing(true);
    try {
      // Preflight: Pause TTS and load last known profile
      await fetch(`${API_BASE}/mic/preflight`, { method: 'POST' });
      
      // Enumerate devices
      setStep('enumerate');
      const response = await fetch(`${API_BASE}/mic/list`);
      const deviceList = await response.json();
      setDevices(deviceList.filter((d: AudioDevice) => d.max_input_channels > 0));
      
      // Start testing phase
      setStep('testing');
      await testAllDevices(deviceList.filter((d: AudioDevice) => d.max_input_channels > 0));
      
    } catch (error) {
      toast({
        title: "Mic Wizard Error",
        description: error instanceof Error ? error.message : 'Failed to start wizard',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testAllDevices = async (deviceList: AudioDevice[]) => {
    const results: DeviceMetrics[] = [];
    
    for (let i = 0; i < deviceList.length; i++) {
      const device = deviceList[i];
      setCurrentDevice(i);
      setProgress((i / deviceList.length) * 100);
      
      try {
        // Test noise floor
        setTestingPhase('noise');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s noise capture
        
        // Test voice
        setTestingPhase('voice');
        const response = await fetch(`${API_BASE}/mic/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: device.id })
        });
        
        if (response.ok) {
          const result = await response.json();
          results.push(result);
        }
        
      } catch (error) {
        console.warn(`Failed to test device ${device.id}:`, error);
      }
    }
    
    setMetrics(results);
    setSelectedDevice(results.sort((a, b) => b.score - a.score)[0] || null);
    setStep('results');
  };

  const confirmDevice = async () => {
    if (!selectedDevice) return;
    
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/mic/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDevice.id })
      });
      
      toast({
        title: "Mic Calibrated",
        description: `Using ${selectedDevice.name} with ${selectedDevice.snr_db.toFixed(1)}dB SNR`,
      });
      
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatScore = (score: number) => (score * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-space-deep/95 backdrop-blur-xl border border-energy-cyan/30">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-text-primary">
            <Settings className="w-5 h-5 text-energy-cyan" />
            <span>Microphone Calibration Wizard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'preflight' && (
            <div className="text-center space-y-4">
              <Volume2 className="w-12 h-12 text-energy-pulse mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Preparing Audio System</h3>
                <p className="text-text-secondary">Pausing TTS and loading previous configuration...</p>
              </div>
            </div>
          )}

          {step === 'enumerate' && (
            <div className="text-center space-y-4">
              <Mic className="w-12 h-12 text-energy-cyan mx-auto animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Discovering Audio Devices</h3>
                <p className="text-text-secondary">Found {devices.length} input devices with mono capability</p>
              </div>
            </div>
          )}

          {step === 'testing' && (
            <div className="space-y-6">
              <div className="text-center">
                <Mic className="w-12 h-12 text-energy-glow mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary">
                  Testing Device {currentDevice + 1} of {devices.length}
                </h3>
                <p className="text-text-secondary">
                  {devices[currentDevice]?.name}
                </p>
              </div>

              <Progress value={progress} className="w-full" />

              <div className="text-center">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-space-surface/50 rounded-lg">
                  {testingPhase === 'noise' ? (
                    <>
                      <div className="w-2 h-2 bg-energy-pulse rounded-full animate-pulse" />
                      <span className="text-text-primary">Recording noise floor...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-energy-cyan rounded-full animate-pulse" />
                      <span className="text-text-primary">Say: "testing one two three"</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-6">
              <div className="text-center">
                <Check className="w-12 h-12 text-status-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary">Calibration Results</h3>
                <p className="text-text-secondary">
                  Tested {metrics.length} devices. Recommended device highlighted.
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>SNR (dB)</TableHead>
                      <TableHead>Voiced %</TableHead>
                      <TableHead>Start Delay</TableHead>
                      <TableHead>Clipping %</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((metric) => (
                      <TableRow 
                        key={metric.id}
                        className={`cursor-pointer transition-colors ${
                          selectedDevice?.id === metric.id 
                            ? 'bg-energy-cyan/20 border-energy-cyan' 
                            : 'hover:bg-space-surface/50'
                        }`}
                        onClick={() => setSelectedDevice(metric)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {selectedDevice?.id === metric.id && (
                              <Check className="w-4 h-4 text-status-success" />
                            )}
                            <span className="truncate max-w-48">{metric.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{metric.snr_db.toFixed(1)}</TableCell>
                        <TableCell>{(metric.voiced_ratio * 100).toFixed(1)}%</TableCell>
                        <TableCell>{metric.start_delay_ms.toFixed(0)}ms</TableCell>
                        <TableCell>{metric.clipping_percent.toFixed(1)}%</TableCell>
                        <TableCell className="font-semibold text-energy-cyan">
                          {formatScore(metric.score)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('testing')}
                  disabled={isProcessing}
                >
                  Retest Devices
                </Button>
                <Button 
                  onClick={confirmDevice}
                  disabled={!selectedDevice || isProcessing}
                  className="bg-energy-cyan hover:bg-energy-cyan/80"
                >
                  {isProcessing ? 'Saving...' : 'Use Selected Device'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MicWizard;
