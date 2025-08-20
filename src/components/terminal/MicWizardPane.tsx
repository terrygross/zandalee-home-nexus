
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, CheckCircle, AlertCircle } from 'lucide-react';

// STUB: Mock data until backend is implemented
const mockDevices = [
  { id: 1, name: 'Default Microphone', quality: 95, recommended: true },
  { id: 2, name: 'USB Headset', quality: 88, recommended: false },
  { id: 3, name: 'Built-in Microphone', quality: 72, recommended: false }
];

const mockQualityScores = {
  noise_level: 85,
  clarity: 92,
  volume: 88,
  consistency: 90
};

export const MicWizardPane = () => {
  const handleChooseDevice = (deviceId: number) => {
    console.log('STUB: Choose device', deviceId);
  };

  const handleSaveSettings = () => {
    console.log('STUB: Save microphone settings');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Microphone Wizard
            </CardTitle>
            <Badge variant="secondary">STUBBED</Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mic className="w-4 h-4" />
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground">Quality: {device.quality}%</p>
                  </div>
                  {device.recommended && (
                    <Badge variant="default">Recommended</Badge>
                  )}
                </div>
                <Button
                  variant={device.recommended ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChooseDevice(device.id)}
                >
                  Choose
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(mockQualityScores).map(([metric, score]) => (
              <div key={metric} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  {score >= 85 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="capitalize">{metric.replace('_', ' ')}</span>
                </div>
                <span className="font-medium">{score}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Save Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSaveSettings} className="w-full">
            Save Microphone Configuration
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will save your preferred microphone settings for future sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
