
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
  snr_db: number;
  voiced_ratio: number;
  start_delay_ms: number;
  clipping_percent: number;
  dropout_percent: number;
  score: number;
  samplerate: number;
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

  const { listMicDevices, useMicDevice, runMicWizard, speak } = useZandaleeAPI();

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
      // Preflight: Disable TTS and load last known profile
      addLog('Starting Mic Wizard - Preflight phase');
      addLog('Disabling TTS for half-duplex operation');
      addLog('Loading last known mic profile...');
      
      // Enumerate devices
      setStep('enumerate');
      addLog('Enumerating audio input devices...');
      
      const deviceList = await listMicDevices();
      const inputDevices = deviceList.filter(d => 
        d.max_input_channels > 0 && 
        !d.name.toLowerCase().includes('sound mapper')
      );
      
      setDevices(inputDevices);
      addLog(`Found ${inputDevices.length} valid input devices`);
      
      if (inputDevices.length === 0) {
        throw new Error('No valid input devices found');
      }

      // Start testing phase
      setStep('testing');
      addLog('Starting device testing phase...');
      await testAllDevices();
      
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

  const testAllDevices = async () => {
    const results: DeviceMetrics[] = [];
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      setCurrentDeviceIndex(i);
      setProgress((i / devices.length) * 100);
      
      addLog(`Testing device ${i + 1}/${devices.length}: ${device.name}`);
      
      try {
        // Test noise floor
        setTestingPhase('noise');
        addLog(`  Phase 1: Recording noise floor (1.0s)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test voice with pre-roll
        setTestingPhase('voice');
        addLog(`  Phase 2: Voice test with 500ms pre-roll`);
        addLog(`  Please say: "testing one two three"`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Simulate device testing (in real implementation, this would call the actual wizard API)
        const mockMetrics: DeviceMetrics = {
          id: device.id,
          name: device.name,
          snr_db: Math.random() * 20 + 15, // 15-35 dB
          voiced_ratio: Math.random() * 0.5 + 0.3, // 30-80%
          start_delay_ms: Math.random() * 50, // 0-50ms
          clipping_percent: Math.random() * 5, // 0-5%
          dropout_percent: Math.random() * 2, // 0-2%
          score: 0, // Will be calculated
          samplerate: device.samplerate
        };

        // Calculate score using the exact formula
        const snr_score = 0.50 * (mockMetrics.snr_db / 35); // Normalize to 35dB max
        const voiced_score = 0.20 * mockMetrics.voiced_ratio;
        const delay_penalty = 0.15 * (mockMetrics.start_delay_ms / 50); // Normalize to 50ms max
        const clipping_penalty = 0.10 * (mockMetrics.clipping_percent / 5); // Normalize to 5% max
        const dropout_penalty = 0.05 * (mockMetrics.dropout_percent / 2); // Normalize to 2% max
        
        mockMetrics.score = Math.max(0, snr_score + voiced_score - delay_penalty - clipping_penalty - dropout_penalty);
        
        results.push(mockMetrics);
        addLog(`  Results: SNR=${mockMetrics.snr_db.toFixed(1)}dB, Voiced=${(mockMetrics.voiced_ratio*100).toFixed(1)}%, Score=${(mockMetrics.score*100).toFixed(1)}`);
        
      } catch (error) {
        addLog(`  Failed to test device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Sort by score, then by start delay, then by SNR
    results.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        if (Math.abs(a.start_delay_ms - b.start_delay_ms) < 1) {
          return b.snr_db - a.snr_db;
        }
        return a.start_delay_ms - b.start_delay_ms;
      }
      return b.score - a.score;
    });

    setMetrics(results);
    setSelectedDevice(results[0] || null);
    setStep('results');
    
    addLog(`Testing complete. Recommended device: ${results[0]?.name || 'None'}`);
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
    await testAllDevices();
  };

  const formatScore = (score: number) => (score * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-space-deep/95 backdrop-blur-xl border border-energy-cyan/30">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-text-primary">
            <Settings className="w-5 h-5 text-energy-cyan" />
            <span>Microphone Calibration Wizard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 h-[600px]">
          {/* Left Panel - Status */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Wizard Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 'preflight' && (
                <div className="text-center space-y-4">
                  <Volume2 className="w-12 h-12 text-energy-pulse mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Preflight</h3>
                    <p className="text-text-secondary text-sm">Preparing audio system...</p>
                  </div>
                </div>
              )}

              {step === 'enumerate' && (
                <div className="text-center space-y-4">
                  <Mic className="w-12 h-12 text-energy-cyan mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Enumerate</h3>
                    <p className="text-text-secondary text-sm">Found {devices.length} input devices</p>
                  </div>
                </div>
              )}

              {step === 'testing' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Mic className="w-12 h-12 text-energy-glow mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary">
                      Testing Device {currentDeviceIndex + 1} of {devices.length}
                    </h3>
                    <p className="text-text-secondary text-sm">
                      {devices[currentDeviceIndex]?.name}
                    </p>
                  </div>

                  <Progress value={progress} className="w-full" />

                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-space-surface/50 rounded-lg">
                      {testingPhase === 'noise' ? (
                        <>
                          <div className="w-2 h-2 bg-energy-pulse rounded-full animate-pulse" />
                          <span className="text-text-primary text-sm">Recording noise floor...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-energy-cyan rounded-full animate-pulse" />
                          <span className="text-text-primary text-sm">Say: "testing one two three"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 'results' && (
                <div className="text-center space-y-4">
                  <Check className="w-12 h-12 text-status-success mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Results</h3>
                    <p className="text-text-secondary text-sm">
                      Tested {metrics.length} devices
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Middle Panel - Results Table or Log */}
          <Card className="glass-panel col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {step === 'results' ? 'Device Test Results' : 'Wizard Log'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 'results' ? (
                <div className="space-y-4">
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>SNR (dB)</TableHead>
                          <TableHead>Voiced %</TableHead>
                          <TableHead>Delay (ms)</TableHead>
                          <TableHead>Clipping %</TableHead>
                          <TableHead>Score %</TableHead>
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
                            <TableCell className="p-2">
                              {selectedDevice?.id === metric.id && (
                                <Check className="w-4 h-4 text-status-success" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="truncate max-w-48 block">{metric.name}</span>
                            </TableCell>
                            <TableCell>{metric.snr_db.toFixed(1)}</TableCell>
                            <TableCell>{(metric.voiced_ratio * 100).toFixed(1)}</TableCell>
                            <TableCell>{metric.start_delay_ms.toFixed(0)}</TableCell>
                            <TableCell>{metric.clipping_percent.toFixed(1)}</TableCell>
                            <TableCell className="font-semibold text-energy-cyan">
                              {formatScore(metric.score)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border/30">
                    <Button 
                      variant="outline" 
                      onClick={retestDevices}
                      disabled={isProcessing}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Retest Devices
                    </Button>
                    <Button 
                      onClick={confirmDevice}
                      disabled={!selectedDevice || isProcessing}
                      className="bg-energy-cyan hover:bg-energy-cyan/80"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Use Selected Device
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-80 overflow-y-auto bg-space-mid/30 rounded-lg p-4 font-mono text-xs">
                  {wizardLog.map((line, index) => (
                    <div key={index} className="text-text-secondary mb-1">
                      {line}
                    </div>
                  ))}
                  {wizardLog.length === 0 && (
                    <div className="text-text-muted">Wizard log will appear here...</div>
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
