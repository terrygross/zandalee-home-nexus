
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
            MICROPHONE CALIBRATION
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground font-lcars">
            THE MIC WIZARD WILL TEST ALL AVAILABLE MICROPHONES AND HELP YOU CHOOSE THE BEST ONE FOR VOICE INTERACTION.
          </p>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-1 whitespace-nowrap">
              <Settings className="w-3 h-3 mr-1" />
              AUTOMATIC CALIBRATION
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-1 whitespace-nowrap">
              SNR TESTING
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-1 whitespace-nowrap">
              VOICE QUALITY ANALYSIS
            </Badge>
          </div>

          <Button 
            onClick={() => setIsWizardOpen(true)}
            size="lg" 
            className="w-full text-sm sm:text-base min-h-[48px] sm:min-h-[52px]"
          >
            <Play className="w-4 h-4 mr-2" />
            START MIC WIZARD
          </Button>

          <div className="text-sm text-muted-foreground space-y-1 font-lcars">
            <p>• TESTS ALL AVAILABLE INPUT DEVICES</p>
            <p>• MEASURES SIGNAL-TO-NOISE RATIO</p>
            <p>• ANALYZES VOICE CLARITY AND TIMING</p>
            <p>• AUTOMATICALLY SAVES BEST CONFIGURATION</p>
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
