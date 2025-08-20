
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGateway } from "@/hooks/useGateway";
import { useToast } from "@/hooks/use-toast";
import { Keyboard, Mouse, FolderOpen } from "lucide-react";

const HandsControls = () => {
  const [keyText, setKeyText] = useState('');
  const [enterKey, setEnterKey] = useState(false);
  const [filePath, setFilePath] = useState('');
  
  const { sendKeys, mouseAction } = useGateway();
  const { toast } = useToast();

  const handleSendKeys = async () => {
    try {
      await sendKeys(keyText, enterKey);
      toast({
        title: "Keys Sent",
        description: `Typed: "${keyText}"${enterKey ? ' + Enter' : ''}`
      });
      setKeyText('');
    } catch (error) {
      toast({
        title: "Send Keys Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const handleMouseClick = async () => {
    try {
      await mouseAction('click', 100, 100);
      toast({
        title: "Mouse Click",
        description: "Clicked at (100, 100)"
      });
    } catch (error) {
      toast({
        title: "Mouse Action Failed", 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const handleOpenVSCode = async () => {
    try {
      // This would call POST /local/app {"name":"code","args":[path]}
      toast({
        title: "Opening VS Code",
        description: `Path: ${filePath || 'default workspace'}`
      });
    } catch (error) {
      toast({
        title: "App Launch Failed",
        description: error instanceof Error ? error.message : 'Unknown error', 
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Keyboard className="w-5 h-5" />
          <span>PC Control (Hands)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="keyText">Send Keys</Label>
          <div className="flex space-x-2">
            <Input
              id="keyText"
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder="Text to type..."
            />
            <Button onClick={handleSendKeys} disabled={!keyText}>
              <Keyboard className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              id="enterKey"
              checked={enterKey}
              onChange={(e) => setEnterKey(e.target.checked)}
            />
            <Label htmlFor="enterKey">Press Enter</Label>
          </div>
        </div>

        <div>
          <Label>Mouse Control</Label>
          <Button onClick={handleMouseClick} className="w-full">
            <Mouse className="w-4 h-4 mr-2" />
            Click at (100, 100)
          </Button>
        </div>

        <div>
          <Label htmlFor="filePath">Open in VS Code</Label>
          <div className="flex space-x-2">
            <Input
              id="filePath"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="File/folder path..."
            />
            <Button onClick={handleOpenVSCode}>
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HandsControls;
