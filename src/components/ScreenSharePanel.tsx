
import { useState, useRef, useEffect } from 'react';
import { Monitor, MonitorStop, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const ScreenSharePanel = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Handle stream end
      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      setIsSharing(true);
      toast({
        title: "Screen Share Started",
        description: "Your screen is now being shared with Zandalee",
      });
    } catch (error) {
      toast({
        title: "Screen Share Failed",
        description: "Unable to start screen sharing. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
    toast({
      title: "Screen Share Stopped",
      description: "Screen sharing has been disabled",
    });
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="glass-panel p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-energy-cyan" />
          <span className="text-sm font-medium text-text-primary">Screen Share</span>
        </div>
        {isSharing && (
          <div className="flex items-center space-x-1 text-status-success">
            <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
            <span className="text-xs">Active</span>
          </div>
        )}
      </div>

      {!isSharing ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-status-warning opacity-50" />
          <p className="text-xs text-text-muted text-center">
            Share your screen with Zandalee for visual assistance
          </p>
          <Button
            onClick={startScreenShare}
            size="sm"
            className="bg-energy-cyan/20 hover:bg-energy-cyan/30 text-energy-cyan border border-energy-cyan/30 text-xs"
          >
            <Monitor className="w-3 h-3 mr-1" />
            Start Sharing
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex-1 bg-space-surface/30 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-contain"
            />
          </div>
          <Button
            onClick={stopScreenShare}
            size="sm"
            variant="destructive"
            className="text-xs"
          >
            <MonitorStop className="w-3 h-3 mr-1" />
            Stop Sharing
          </Button>
        </div>
      )}

      <p className="text-xs text-text-muted mt-2 opacity-75">
        View-only mode. No control access.
      </p>
    </div>
  );
};

export default ScreenSharePanel;
