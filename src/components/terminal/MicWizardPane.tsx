
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mic, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

interface MicDevice {
  id: number;
  name: string;
  channels: number;
  default?: boolean;
}

interface ScoredDevice {
  id: number;
  name: string;
  SNR: number;
  voiced: number;
  startDelay: number;
  clip: number;
  score: number;
}

export const MicWizardPane = () => {
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const [wizardResults, setWizardResults] = useState<ScoredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'devices' | 'wizard' | 'results'>('devices');
  const [isStubbed, setIsStubbed] = useState(false);

  const { micList, micWizard, micUse } = useGateway();
  const { toast } = useToast();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const deviceList = await micList();
      setDevices(deviceList);
      // Check if we got mock data (indicates stubbed endpoint)
      if (deviceList.some(d => d.name === 'Default Microphone')) {
        setIsStubbed(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading devices',
        description: error.message || 'Failed to load microphone devices',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startWizard = async () => {
    setLoading(true);
    setStep('wizard');
    
    try {
      const results = await micWizard();
      setWizardResults(results.devices);
      setSelectedDevice(results.chosen?.id || results.devices[0]?.id);
      setStep('results');
      
      if (!results.persisted) {
        setIsStubbed(true);
      }
    } catch (error: any) {
      toast({
        title: 'Wizard Error',
        description: error.message || 'Failed to run microphone wizard',
        variant: 'destructive'
      });
      setStep('devices');
    } finally {
      setLoading(false);
    }
  };

  const applyAndSave = async () => {
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      await micUse({ id: selectedDevice });
      toast({
        title: 'Mic calibrated',
        description: `Device ${selectedDevice} configured successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Configuration Error',
        description: error.message || 'Failed to save microphone configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isStubbed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <Badge variant="secondary">STUBBED</Badge>
            <span className="text-sm text-yellow-800">
              Backend endpoints not available - showing mock data
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Microphone Wizard
            </CardTitle>
            <Badge variant="outline">
              Wizard mutes TTS while running
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {step === 'devices' && (
              <>
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mic className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.channels} channel{device.channels !== 1 ? 's' : ''}
                            {device.default && ' (Default)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={startWizard} 
                  disabled={loading || devices.length === 0}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {loading ? 'Starting...' : 'Start Wizard'}
                </Button>
              </>
            )}

            {step === 'wizard' && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Running microphone analysis...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
              </div>
            )}

            {step === 'results' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Wizard Results</h3>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>SNR (dB)</TableHead>
                        <TableHead>Voiced %</TableHead>
                        <TableHead>Start Delay (ms)</TableHead>
                        <TableHead>Clip %</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wizardResults.map((result) => (
                        <TableRow 
                          key={result.id}
                          className={`cursor-pointer ${selectedDevice === result.id ? 'bg-accent' : ''}`}
                          onClick={() => setSelectedDevice(result.id)}
                        >
                          <TableCell>
                            {selectedDevice === result.id && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell>{result.SNR}</TableCell>
                          <TableCell>{result.voiced}%</TableCell>
                          <TableCell>{result.startDelay}</TableCell>
                          <TableCell>{result.clip}%</TableCell>
                          <TableCell className="font-semibold">{result.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('devices')}>
                    Back to Devices
                  </Button>
                  <Button 
                    onClick={applyAndSave}
                    disabled={!selectedDevice || loading}
                  >
                    {loading ? 'Saving...' : 'Apply & Save'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
