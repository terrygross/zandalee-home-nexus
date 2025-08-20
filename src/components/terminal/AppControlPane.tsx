
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, FolderOpen } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

export const AppControlPane = () => {
  const [filePath, setFilePath] = useState('');
  const { openApp } = useGateway();
  const { toast } = useToast();

  const handleOpenVSCode = async () => {
    try {
      await openApp({ name: 'code', args: filePath ? [filePath] : [] });
      toast({
        title: 'App Launched',
        description: `VS Code opened${filePath ? ` with: ${filePath}` : ' successfully'}`
      });
      setFilePath('');
    } catch (error: any) {
      toast({
        title: 'App Launch Failed',
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
            <Code className="w-5 h-5" />
            Application Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filePath">File/Folder Path (Optional)</Label>
            <Input
              id="filePath"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Enter file or folder path..."
            />
          </div>
          
          <Button onClick={handleOpenVSCode} className="w-full">
            <FolderOpen className="w-4 h-4 mr-2" />
            Open VS Code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
