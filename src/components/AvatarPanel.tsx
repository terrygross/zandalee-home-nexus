import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, User, X, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

type ViewMode = 'fill' | 'fit';

interface Avatar {
  id: string;
  name: string;
  photo_url: string;
  is_active: boolean;
  created_at: string;
}

const AvatarPanel = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [activeAvatar, setActiveAvatar] = useState<Avatar | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fill');
  const [avatarName, setAvatarName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const zandaleeAPI = useZandaleeAPI();

  // Load view mode from localStorage and fetch avatars on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('zandalee-avatar-view-mode') as ViewMode;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
    
    loadAvatars();
    loadActiveAvatar();
  }, []);

  const loadAvatars = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8759/avatar/list');
      const data = await response.json();
      
      if (data.ok) {
        setAvatars(data.items);
      }
    } catch (error) {
      console.error('Failed to load avatars:', error);
    }
  };

  const loadActiveAvatar = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8759/avatar/status');
      const data = await response.json();
      
      if (data.ok && data.active_avatar_id) {
        const activeAvatarData = {
          id: data.active_avatar_id,
          name: data.name,
          photo_url: data.photo_url,
          is_active: true,
          created_at: ''
        };
        setActiveAvatar(activeAvatarData);
      }
    } catch (error) {
      console.error('Failed to load active avatar:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!avatarName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the avatar",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', avatarName.trim());

      const response = await fetch('http://127.0.0.1:8759/avatar/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Avatar Uploaded",
          description: `Avatar "${data.name}" has been uploaded successfully`,
        });
        
        setAvatarName('');
        await loadAvatars();
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectAvatar = async (avatarId: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8759/avatar/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: avatarId })
      });

      const data = await response.json();

      if (data.ok) {
        await loadActiveAvatar();
        await loadAvatars();
        
        toast({
          title: "Avatar Selected",
          description: "Avatar has been set as active",
        });
      } else {
        throw new Error(data.error || 'Selection failed');
      }
    } catch (error) {
      toast({
        title: "Selection Failed",
        description: error instanceof Error ? error.message : "Failed to select avatar",
        variant: "destructive"
      });
    }
  };

  const deleteAvatar = async (avatarId: string, avatarName: string) => {
    if (!confirm(`Are you sure you want to delete "${avatarName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8759/avatar/${avatarId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Avatar Deleted",
          description: `Avatar "${avatarName}" has been deleted`,
        });
        
        await loadAvatars();
        await loadActiveAvatar();
      } else {
        throw new Error(data.error || 'Deletion failed');
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete avatar",
        variant: "destructive"
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('zandalee-avatar-view-mode', mode);
  };

  return (
    <div className="h-full flex flex-col bg-card/50 border-b border-border/30">
      {/* Compact Header */}
      <div className="flex-shrink-0 p-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Zandalee Avatar</h3>
          <div className="flex text-[10px] border border-energy-cyan/30 rounded overflow-hidden">
            <button
              onClick={() => toggleViewMode('fill')}
              className={`px-2 py-1 transition-colors ${
                viewMode === 'fill' 
                  ? 'bg-energy-cyan/20 text-energy-cyan' 
                  : 'text-text-muted hover:bg-energy-cyan/10'
              }`}
            >
              Fill
            </button>
            <button
              onClick={() => toggleViewMode('fit')}
              className={`px-2 py-1 transition-colors ${
                viewMode === 'fit' 
                  ? 'bg-energy-cyan/20 text-energy-cyan' 
                  : 'text-text-muted hover:bg-energy-cyan/10'
              }`}
            >
              Fit
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col p-2 min-h-0">
        {/* Avatar Viewer - Takes available space */}
        <div className="flex-1 min-h-32 rounded-md overflow-hidden border border-energy-cyan/30 bg-space-surface/40 mb-2">
          {activeAvatar ? (
            <img
              src={activeAvatar.photo_url}
              alt={activeAvatar.name}
              className={`w-full h-full ${
                viewMode === 'fill' ? 'object-cover' : 'object-contain bg-space-surface'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-energy-cyan/10">
              <div className="text-center text-energy-cyan">
                <User className="w-12 h-12 mx-auto mb-2" />
                <div className="text-xs text-text-muted">No active avatar</div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Section - Compact */}
        <div className="flex-shrink-0 space-y-2 mb-2">
          <Input
            placeholder="Avatar name..."
            value={avatarName}
            onChange={(e) => setAvatarName(e.target.value)}
            className="h-8 text-xs bg-space-surface/60 border-energy-cyan/30"
            disabled={isUploading}
          />
          
          <Button
            onClick={triggerFileInput}
            disabled={isUploading || !avatarName.trim()}
            className="w-full h-8 bg-energy-blue/20 hover:bg-energy-blue/30 border border-energy-blue/30 text-xs"
            variant="outline"
          >
            <Upload className="w-3 h-3 mr-2 text-energy-blue" />
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>
        </div>

        {/* Avatar List - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`flex items-center gap-2 p-2 rounded border text-xs transition-colors ${
                avatar.is_active 
                  ? 'border-energy-cyan/50 bg-energy-cyan/10' 
                  : 'border-energy-cyan/20 bg-space-surface/20 hover:bg-space-surface/40'
              }`}
            >
              <img
                src={avatar.photo_url}
                alt={avatar.name}
                className="w-6 h-6 rounded object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary truncate">{avatar.name}</div>
              </div>
              <div className="flex items-center gap-1">
                {avatar.is_active ? (
                  <Check className="w-3 h-3 text-energy-cyan" />
                ) : (
                  <Button
                    onClick={() => selectAvatar(avatar.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] hover:bg-energy-cyan/20 text-energy-cyan"
                  >
                    Select
                  </Button>
                )}
                <Button
                  onClick={() => deleteAvatar(avatar.id, avatar.name)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-status-error/20"
                >
                  <Trash2 className="w-3 h-3 text-status-error" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default AvatarPanel;
