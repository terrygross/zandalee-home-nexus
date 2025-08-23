
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Volume2, Settings, Play, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

interface AudioDevice {
  id: number;
  name: string;
  max_input_channels: number;
  samplerate: number;
}

interface DeviceMetrics {
  id: number;
  name: string;
  samplerate: number;
  noise_rms: number;
  voice_rms: number;
  snr_db: number;
  voiced_ratio: number;
  start_delay_ms: number;
  clipping_pct: number;
  dropouts: number;
  score: number;
}

interface WizardConfig {
  frame_ms?: number;
  samplerates?: number[];
  vad_mode?: number;
  start_voiced_frames?: number;
  silence_hold_ms?: number;
  preroll_ms?: number;
  voice_prompt?: string;
}

interface WizardResponse {
  ok: boolean;
  results?: DeviceMetrics[];
  chosen?: any;
  error?: string;
}

interface MicWizardPageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MicWizardPage = ({ open, onOpenChange }: MicWizardPageProps) => {
  const [step, setStep] = useState<'preflight' | 'enumerate' | 'testing' | 'results' | 'confirm'>('preflight');
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [testingPhase, setTestingPhase] = useState<'noise' | 'voice'>('noise');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<DeviceMetrics[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wizardLog, setWizardLog] = useState<string[]>([]);
  const { toast } = useToast();

  const { listMicDevices, useMicDevice, speak } = useZandaleeAPI();

  const addLog = (message: string) => {
    setWizardLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    if (open && step === 'preflight') {
      startWizard();
    }
  }, [open]);

  const runMicWizard = async (config: WizardConfig = {}): Promise<WizardResponse> => {
    const response = await fetch('http://localhost:3001/mic/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  const startWizard = async () => {
    setIsProcessing(true);
    setWizardLog([]);
    
    try {
      // Preflight: Disable TTS and load last known profile
      addLog('Starting Mic Wizard - Preflight phase');
      addLog('Disabling TTS for half-duplex operation');
      addLog('Loading last known mic profile...');
      
      // Enumerate devices
      setStep('enumerate');
      addLog('Enumerating audio input devices...');
      
      const deviceList = await listMicDevices();
      setDevices(deviceList);
      addLog(`Found ${deviceList.length} valid input devices`);
      
      if (deviceList.length === 0) {
        throw new Error('No valid input devices found');
      }

      // Start testing phase - use real backend wizard
      setStep('testing');
      addLog('Starting comprehensive device testing...');
      addLog('This will test noise floor and voice quality for each device');
      
      // Show simulated progress during real testing
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 200);

      try {
        const wizardConfig: WizardConfig = {
          frame_ms: 10,
          samplerates: [16000, 48000, 44100],
          vad_mode: 1,
          start_voiced_frames: 2,
          silence_hold_ms: 5000,
          preroll_ms: 500,
          voice_prompt: "testing one two three"
        };

        addLog('Running wizard with real device testing...');
        addLog('Please say "testing one two three" when prompted');
        
        const result = await runMicWizard(wizardConfig);
        
        clearInterval(progressInterval);
        setProgress(100);
        
        if (!result.ok) {
          throw new Error(result.error || 'Wizard failed');
        }

        addLog(`Wizard completed successfully. Tested ${result.results?.length || 0} devices`);
        
        if (!result.results || result.results.length === 0) {
          throw new Error('No working devices found');
        }

        // Process results
        const sortedResults = result.results.sort((a, b) => {
          if (Math.abs(a.score - b.score) < 0.01) {
            if (Math.abs(a.start_delay_ms - b.start_delay_ms) < 1) {
              return b.snr_db - a.snr_db;
            }
            return a.start_delay_ms - b.start_delay_ms;
          }
          return b.score - a.score;
        });

        setMetrics(sortedResults);
        setSelectedDevice(sortedResults[0]);
        setStep('results');
        
        addLog(`Recommended device: ${sortedResults[0].name} (Score: ${(sortedResults[0].score * 100).toFixed(1)})`);
        
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

  const confirmDevice = async () => {
    if (!selectedDevice) return;
    
    setIsProcessing(true);
    addLog(`Applying device selection: ${selectedDevice.name}`);
    
    try {
      // Save to daemon (which handles both config/audio.json and memory)
      await useMicDevice(selectedDevice.id);
      
      addLog('Device configuration saved to config/audio.json');
      addLog('Device preference saved to semantic memory');
      addLog('Re-enabling TTS');
      
      // Play confirmation
      await speak('Mic calibrated.');
      
      toast({
        title: "Mic Calibrated",
        description: `Using ${selectedDevice.name} with ${selectedDevice.snr_db.toFixed(1)}dB SNR`,
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
    setMetrics([]);
    setSelectedDevice(null);
    setProgress(0);
    await startWizard();
  };

  const formatScore = (score: number) => (score * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-7xl h-[85vh] bg-space-deep/95 backdrop-blur-xl border border-energy-cyan/30 flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center space-x-2 text-text-primary text-sm sm:text-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-energy-cyan" />
            <span>Microphone Calibration Wizard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
          {/* Left Panel - Compact Status */}
          <Card className="glass-panel flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-3 p-3">
              {step === 'preflight' && (
                <div className="text-center space-y-2">
                  <Volume2 className="w-8 h-8 text-energy-pulse mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Preflight</h3>
                    <p className="text-text-secondary text-xs">Preparing...</p>
                  </div>
                </div>
              )}

              {step === 'enumerate' && (
                <div className="text-center space-y-2">
                  <Mic className="w-8 h-8 text-energy-cyan mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Enumerate</h3>
                    <p className="text-text-secondary text-xs">Found {devices.length} devices</p>
                  </div>
                </div>
              )}

              {step === 'testing' && (
                <div className="space-y-3">
                  <div className="text-center">
                    <Mic className="w-8 h-8 text-energy-glow mx-auto mb-2 animate-pulse" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      Testing Devices
                    </h3>
                    <p className="text-text-secondary text-xs">
                      Real audio analysis
                    </p>
                  </div>

                  <Progress value={progress} className="w-full" />

                  <div className="text-center">
                    <div className="inline-flex items-center space-x-1 px-2 py-1 bg-space-surface/50 rounded text-xs">
                      <div className="w-1.5 h-1.5 bg-energy-cyan rounded-full animate-pulse" />
                      <span className="text-text-primary">Say: "testing"</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 'results' && (
                <div className="text-center space-y-2">
                  <Check className="w-8 h-8 text-status-success mx-auto" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Complete</h3>
                    <p className="text-text-secondary text-xs">
                      {metrics.length} devices tested
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Panel - Results or Log */}
          <Card className="glass-panel lg:col-span-3 flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm">
                {step === 'results' ? 'Test Results' : 'Progress Log'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-3">
              {step === 'results' ? (
                <div className="space-y-3 h-full flex flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6"></TableHead>
                          <TableHead className="min-w-[200px]">Device</TableHead>
                          <TableHead className="w-16">SNR</TableHead>
                          <TableHead className="w-16">Voice%</TableHead>
                          <TableHead className="w-16">Delay</TableHead>
                          <TableHead className="w-16">Clip%</TableHead>
                          <TableHead className="w-16">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric) => (
                          <TableRow 
                            key={metric.id}
                            className={`cursor-pointer transition-colors text-xs ${
                              selectedDevice?.id === metric.id 
                                ? 'bg-energy-cyan/20 border-energy-cyan' 
                                : 'hover:bg-space-surface/50'
                            }`}
                            onClick={() => setSelectedDevice(metric)}
                          >
                            <TableCell className="p-1">
                              {selectedDevice?.id === metric.id && (
                                <Check className="w-3 h-3 text-status-success" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium p-1">
                              <span className="truncate block max-w-[180px]" title={metric.name}>
                                {metric.name}
                              </span>
                            </TableCell>
                            <TableCell className="p-1">{metric.snr_db.toFixed(1)}</TableCell>
                            <TableCell className="p-1">{(metric.voiced_ratio * 100).toFixed(1)}</TableCell>
                            <TableCell className="p-1">{metric.start_delay_ms.toFixed(0)}</TableCell>
                            <TableCell className="p-1">{metric.clipping_pct.toFixed(1)}</TableCell>
                            <TableCell className="font-semibold text-energy-cyan p-1">
                              {formatScore(metric.score)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 border-t border-border/30 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={retestDevices}
                      disabled={isProcessing}
                      size="default"
                      className="w-full sm:w-auto text-sm min-h-[44px]"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Retest
                    </Button>
                    <Button 
                      onClick={confirmDevice}
                      disabled={!selectedDevice || isProcessing}
                      className="bg-energy-cyan hover:bg-energy-cyan/80 w-full sm:w-auto sm:px-8 text-sm min-h-[44px]"
                      size="default"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Use Device
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto bg-space-mid/30 rounded p-2 font-mono text-xs">
                  {wizardLog.map((line, index) => (
                    <div key={index} className="text-text-secondary mb-0.5 leading-tight">
                      {line}
                    </div>
                  ))}
                  {wizardLog.length === 0 && (
                    <div className="text-text-muted">Log output will appear here...</div>
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
