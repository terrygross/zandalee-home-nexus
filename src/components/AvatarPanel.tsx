
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AvatarPanel = () => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    localStorage.getItem('zandalee-avatar')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create object URL and store in localStorage
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    localStorage.setItem('zandalee-avatar', url);
    
    toast({
      title: "Avatar Updated",
      description: "Zandalee's avatar has been uploaded successfully",
    });
  };

  const removeAvatar = () => {
    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
    }
    setAvatarUrl(null);
    localStorage.removeItem('zandalee-avatar');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Avatar Removed",
      description: "Zandalee's avatar has been removed",
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="glass-panel h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-text-primary text-xs">
          <span>Zandalee Avatar</span>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={removeAvatar}
              className="h-4 w-4 p-0 hover:bg-status-error/20"
            >
              <X className="h-3 w-3 text-status-error" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col h-full">
        {/* Large Avatar Display - fills most of the space */}
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <Avatar className="w-32 h-32 border-2 border-energy-cyan/30">
            <AvatarImage src={avatarUrl || undefined} alt="Zandalee" className="object-cover" />
            <AvatarFallback className="bg-energy-cyan/10 text-energy-cyan">
              <User className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Upload Button */}
        <Button
          onClick={triggerFileInput}
          className="w-full h-auto p-2 bg-energy-blue/20 hover:bg-energy-blue/30 border border-energy-blue/30 flex items-center space-x-2 text-xs"
          variant="outline"
        >
          <Upload className="w-3 h-3 text-energy-blue flex-shrink-0" />
          <span className="text-text-primary truncate">
            {avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </span>
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Status */}
        <div className="text-xs text-center text-text-muted">
          {avatarUrl ? 'Ready for lip-sync' : 'No avatar uploaded'}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvatarPanel;
