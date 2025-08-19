import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Upload, User, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import LCARSButton from "@/components/lcars/LCARSButton";
import LCARSPillButton from "@/components/lcars/LCARSPillButton";

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

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

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
    <div className="h-full bg-lcars-black rounded-lg border-2 border-lcars-teal flex flex-col overflow-hidden">
      {/* LCARS Header - Pure black background */}
      <div className="px-4 py-2 border-b-2 border-lcars-teal font-bold uppercase tracking-wider text-sm text-black bg-lcars-teal rounded-t-lg overflow-hidden flex items-center justify-between flex-shrink-0">
        <span>AVATAR STATUS</span>
        <div className="flex text-[10px] border border-lcars-teal/30 rounded overflow-hidden bg-lcars-black">
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
      
      {/* Main Content - Pure black background, no nested containers */}
      <div className="flex-1 flex flex-col p-4 min-h-0 bg-lcars-black">
        {/* Active Avatar Display */}
        <div className="h-32 rounded border border-lcars-teal/30 bg-lcars-black mb-4 flex-shrink-0 overflow-hidden">
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

        {/* Upload Section - LCARS Style */}
        <div className="space-y-3 mb-4 flex-shrink-0">
          <input
            placeholder="AVATAR NAME..."
            value={avatarName}
            onChange={(e) => setAvatarName(e.target.value)}
            className="w-full h-8 px-3 text-xs bg-lcars-black border border-lcars-teal/50 text-white placeholder:text-lcars-light-gray/60 font-lcars-mono uppercase rounded focus:border-lcars-teal focus:outline-none"
            disabled={isUploading}
          />
          
          <LCARSButton
            onClick={triggerFileInput}
            disabled={isUploading || !avatarName.trim()}
            color="blue"
            className="w-full h-10 text-xs"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'UPLOADING...' : 'UPLOAD AVATAR'}
          </LCARSButton>
        </div>

        {/* Avatar List - Pure black background */}
        <div className="flex-1 min-h-0 bg-lcars-black">
          <div className="h-full space-y-2 overflow-y-auto">
            {avatars.slice(0, 4).map((avatar) => (
              <div
                key={avatar.id}
                className={`flex items-center gap-3 p-2 rounded border transition-colors bg-lcars-black ${
                  avatar.is_active 
                    ? 'border-lcars-teal/50' 
                    : 'border-lcars-orange/30 hover:border-lcars-orange/50'
                }`}
              >
                <img
                  src={avatar.photo_url}
                  alt={avatar.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0 border border-lcars-teal/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-lcars-mono uppercase">{avatar.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  {avatar.is_active ? (
                    <Check className="w-4 h-4 text-lcars-teal" />
                  ) : (
                    <LCARSPillButton
                      onClick={() => selectAvatar(avatar.id)}
                      color="teal"
                      className="h-6 px-2 text-[9px]"
                    >
                      SEL
                    </LCARSPillButton>
                  )}
                  <LCARSPillButton
                    onClick={() => deleteAvatar(avatar.id, avatar.name)}
                    color="red"
                    className="h-6 w-6 p-0 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </LCARSPillButton>
                </div>
              </div>
            ))}
            {avatars.length > 4 && (
              <div className="text-center text-xs text-lcars-light-gray/60 font-lcars-mono pt-2">
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
