
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, Settings, Play } from 'lucide-react';
import MicWizard from '@/components/MicWizard';

export const MicWizardPane = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Microphone Calibration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The Mic Wizard will test all available microphones and help you choose the best one for voice interaction.
          </p>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Settings className="w-3 h-3 mr-1" />
              Automatic calibration
            </Badge>
            <Badge variant="outline">
              SNR testing
            </Badge>
            <Badge variant="outline">
              Voice quality analysis
            </Badge>
          </div>

          <Button 
            onClick={() => setIsWizardOpen(true)}
            size="lg" 
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Mic Wizard
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Tests all available input devices</p>
            <p>• Measures signal-to-noise ratio</p>
            <p>• Analyzes voice clarity and timing</p>
            <p>• Automatically saves best configuration</p>
          </div>
        </CardContent>
      </Card>

      <MicWizard 
        open={isWizardOpen} 
        onOpenChange={setIsWizardOpen} 
      />
    </div>
  );
};
