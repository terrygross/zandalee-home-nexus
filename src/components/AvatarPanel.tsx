
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, User, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'fill' | 'fit';

const AvatarPanel = () => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load avatar and view mode from localStorage on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem('zandalee-avatar');
    const savedViewMode = localStorage.getItem('zandalee-avatar-view-mode') as ViewMode;
    
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

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

    // Read file as data URL and store in localStorage
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarUrl(dataUrl);
      localStorage.setItem('zandalee-avatar', dataUrl);
      
      toast({
        title: "Avatar Updated",
        description: "Zandalee's avatar has been uploaded successfully",
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
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

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('zandalee-avatar-view-mode', mode);
  };

  return (
    <Card className="glass-panel h-full flex flex-col">
      <CardHeader className="pb-1 px-3 pt-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-text-primary text-xs">
          <span>Zandalee Avatar</span>
          <div className="flex items-center gap-1">
            {/* View Mode Toggle */}
            <div className="flex text-[10px] border border-energy-cyan/30 rounded overflow-hidden">
              <button
                onClick={() => toggleViewMode('fill')}
                className={`px-1.5 py-0.5 transition-colors ${
                  viewMode === 'fill' 
                    ? 'bg-energy-cyan/20 text-energy-cyan' 
                    : 'text-text-muted hover:bg-energy-cyan/10'
                }`}
              >
                Fill
              </button>
              <button
                onClick={() => toggleViewMode('fit')}
                className={`px-1.5 py-0.5 transition-colors ${
                  viewMode === 'fit' 
                    ? 'bg-energy-cyan/20 text-energy-cyan' 
                    : 'text-text-muted hover:bg-energy-cyan/10'
                }`}
              >
                Fit
              </button>
            </div>
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
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 pt-1 min-h-0">
        {/* Full Avatar Viewer - fills all available space */}
        <div className="relative flex-1 min-h-0 rounded-md overflow-hidden border border-energy-cyan/30 bg-space-surface/40">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Zandalee"
              className={`absolute inset-0 w-full h-full ${
                viewMode === 'fill' ? 'object-cover' : 'object-contain bg-space-surface'
              }`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-energy-cyan/10">
              <div className="text-center text-energy-cyan">
                <User className="w-16 h-16 mx-auto mb-2" />
                <div className="text-xs text-text-muted">No avatar uploaded</div>
              </div>
            </div>
          )}
        </div>

        {/* Compact Upload Button */}
        <Button
          onClick={triggerFileInput}
          className="w-full h-8 mt-2 bg-energy-blue/20 hover:bg-energy-blue/30 border border-energy-blue/30 flex items-center justify-center gap-2 text-xs flex-shrink-0"
          variant="outline"
        >
          <Upload className="w-3 h-3 text-energy-blue" />
          <span className="text-text-primary">
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
      </CardContent>
    </Card>
  );
};

export default AvatarPanel;
