
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
    <div className="h-full bg-lcars-dark-gray/40 rounded border border-lcars-orange/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2 border-b border-lcars-orange/20 flex-shrink-0">
        <div className="text-lcars-light-gray font-lcars-sans text-xs uppercase tracking-wider font-bold">
          AVATAR STATUS
        </div>
        <div className="flex text-[10px] border border-lcars-teal/30 rounded overflow-hidden">
          <button
            onClick={() => toggleViewMode('fill')}
            className={`px-2 py-1 transition-colors ${
              viewMode === 'fill' 
                ? 'bg-lcars-teal/20 text-lcars-teal' 
                : 'text-lcars-light-gray hover:bg-lcars-teal/10'
            }`}
          >
            FILL
          </button>
          <button
            onClick={() => toggleViewMode('fit')}
            className={`px-2 py-1 transition-colors ${
              viewMode === 'fit' 
                ? 'bg-lcars-teal/20 text-lcars-teal' 
                : 'text-lcars-light-gray hover:bg-lcars-teal/10'
            }`}
          >
            FIT
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-3 pt-2 min-h-0">
        {/* Active Avatar Display */}
        <div className="h-32 rounded border border-lcars-teal/30 bg-lcars-black/60 mb-3 flex-shrink-0 overflow-hidden">
          {activeAvatar ? (
            <img
              src={activeAvatar.photo_url}
              alt={activeAvatar.name}
              className={`w-full h-full ${
                viewMode === 'fill' ? 'object-cover' : 'object-contain'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-lcars-teal">
                <User className="w-12 h-12 mx-auto mb-1" />
                <div className="text-xs text-lcars-light-gray">NO ACTIVE AVATAR</div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="space-y-2 mb-3 flex-shrink-0">
          <Input
            placeholder="AVATAR NAME..."
            value={avatarName}
            onChange={(e) => setAvatarName(e.target.value)}
            className="h-7 text-xs bg-lcars-black/60 border-lcars-teal/30 text-white placeholder:text-lcars-light-gray/60 font-lcars-mono uppercase"
            disabled={isUploading}
          />
          
          <Button
            onClick={triggerFileInput}
            disabled={isUploading || !avatarName.trim()}
            className="w-full h-7 bg-lcars-blue/20 hover:bg-lcars-blue/30 border border-lcars-blue/30 text-xs font-lcars-sans uppercase tracking-wider"
            variant="outline"
          >
            <Upload className="w-3 h-3 text-lcars-blue mr-2" />
            <span className="text-white">
              {isUploading ? 'UPLOADING...' : 'UPLOAD AVATAR'}
            </span>
          </Button>
        </div>

        {/* Avatar List */}
        <div className="flex-1 min-h-0">
          <div className="h-full space-y-1">
            {avatars.slice(0, 4).map((avatar) => (
              <div
                key={avatar.id}
                className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                  avatar.is_active 
                    ? 'border-lcars-teal/50 bg-lcars-teal/10' 
                    : 'border-lcars-orange/20 bg-lcars-black/20 hover:bg-lcars-black/40'
                }`}
              >
                <img
                  src={avatar.photo_url}
                  alt={avatar.name}
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-lcars-mono uppercase">{avatar.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  {avatar.is_active ? (
                    <Check className="w-3 h-3 text-lcars-teal" />
                  ) : (
                    <Button
                      onClick={() => selectAvatar(avatar.id)}
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 hover:bg-lcars-teal/20 text-[9px] font-lcars-sans uppercase"
                    >
                      <span className="text-lcars-teal">SEL</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteAvatar(avatar.id, avatar.name)}
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-lcars-red/20"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-lcars-red" />
                  </Button>
                </div>
              </div>
            ))}
            {avatars.length > 4 && (
              <div className="text-center text-xs text-lcars-light-gray/60 font-lcars-mono pt-1">
                +{avatars.length - 4} MORE AVATARS
              </div>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
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
