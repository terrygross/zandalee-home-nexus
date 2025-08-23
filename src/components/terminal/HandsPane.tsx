
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Keyboard, Mouse, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

export const HandsPane = () => {
  const [keyText, setKeyText] = useState('');
  const [enterKey, setEnterKey] = useState(false);

  const { keys, mouse } = useGateway();
  const { toast } = useToast();

  const handleSendKeys = async () => {
    if (!keyText.trim()) return;

    try {
      await keys({ text: keyText, enter: enterKey });
      toast({
        title: 'Keys Sent',
        description: `Typed: "${keyText}"${enterKey ? ' + Enter' : ''}`
      });
      setKeyText('');
      setEnterKey(false);
    } catch (error: any) {
      toast({
        title: 'Send Keys Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleMouseAction = async (action: 'move' | 'click' | 'double' | 'scroll', options: any = {}) => {
    try {
      await mouse({ action, ...options });
      toast({
        title: 'Mouse Action',
        description: `${action} executed successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Mouse Action Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyText">Text to Type</Label>
            <Input
              id="keyText"
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder="Enter text to type..."
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              id="enterKey"
              checked={enterKey}
              onChange={(e) => setEnterKey(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="enterKey">Press Enter after typing</Label>
          </div>
          
          <Button onClick={handleSendKeys} disabled={!keyText.trim()} className="w-full sm:w-auto min-h-[44px] text-sm">
            <Keyboard className="w-4 h-4 mr-2" />
            Send Keys
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mouse className="w-5 h-5" />
            Mouse Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('move', { dx: -50, dy: 0 })}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Move Left
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('move', { dx: 50, dy: 0 })}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Move Right
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('move', { dx: 0, dy: -50 })}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Move Up
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('move', { dx: 0, dy: 50 })}
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              Move Down
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button className="w-full min-h-[44px] text-xs sm:text-sm" onClick={() => handleMouseAction('click')}>
              Click
            </Button>
            <Button className="w-full min-h-[44px] text-xs sm:text-sm" onClick={() => handleMouseAction('double')}>
              Double Click
            </Button>
            <Button
              variant="outline" 
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('scroll', { dy: -3 })}
            >
              Scroll Up
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[44px] text-xs sm:text-sm"
              onClick={() => handleMouseAction('scroll', { dy: 3 })}
            >
              Scroll Down
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
