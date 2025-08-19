
import { useState, useEffect } from "react";
import ZandaleeHeader from "@/components/ZandaleeHeader";
import AvatarPanel from "@/components/AvatarPanel";
import MemoryManager from "@/components/MemoryManager";
import ChatInterface from "@/components/ChatInterface";
import CameraSettings from "@/components/CameraSettings";
import MicSettings from "@/components/MicSettings";
import VoiceMetrics from "@/components/VoiceMetrics";
import StatusBar from "@/components/StatusBar";
import AudioControls from "@/components/AudioControls";
import ScreenSharePanel from "@/components/ScreenSharePanel";

const Index = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleVoiceTranscript = (transcript: string) => {
    console.log('Voice transcript:', transcript);
  };

  return (
    <div className="h-screen bg-space-deep text-text-primary flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0">
        <ZandaleeHeader />
      </div>
      
      {/* Main Content Area - Uses remaining space */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Fixed width, split vertically */}
        <div className="w-80 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col">
          {/* Avatar Panel - Takes 55% of left sidebar */}
          <div className="flex-grow" style={{ flex: '0 0 55%' }}>
            <AvatarPanel />
          </div>
          
          {/* Memory Manager - Takes 45% of left sidebar */}
          <div className="flex-grow" style={{ flex: '0 0 45%' }}>
            <MemoryManager />
          </div>
        </div>

        {/* Center Content - Chat takes all available space */}
        <div className="flex-1 min-w-0">
          <ChatInterface />
        </div>

        {/* Right Sidebar - Compact, scrollable if needed */}
        <div className="w-72 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col overflow-hidden">
          {/* Audio Controls - Compact */}
          <div className="flex-shrink-0 p-2 pb-1">
            <AudioControls />
          </div>
          
          {/* Camera Settings - Compact */}
          <div className="flex-shrink-0 p-2 py-1">
            <CameraSettings />
          </div>
          
          {/* Mic Settings - Compact */}
          <div className="flex-shrink-0 p-2 py-1">
            <MicSettings />
          </div>
          
          {/* Screen Share Panel - Fixed compact height */}
          <div className="flex-shrink-0 p-2 py-1">
            <div className="h-32">
              <ScreenSharePanel />
            </div>
          </div>
          
          {/* Voice Metrics - Takes remaining space, scrollable if needed */}
          <div className="flex-1 min-h-0 p-2 pt-1">
            <VoiceMetrics />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Fixed height */}
      <div className="flex-shrink-0">
        <StatusBar />
      </div>
    </div>
  );
};

export default Index;
