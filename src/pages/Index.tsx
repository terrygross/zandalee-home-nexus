
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
    <div className="h-screen bg-space-deep text-text-primary flex flex-col">
      {/* Header - Compact fixed height */}
      <div className="flex-shrink-0 h-16">
        <ZandaleeHeader />
      </div>
      
      {/* Main Content - Flexible height */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Fixed width */}
        <div className="w-64 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col">
          {/* Avatar Panel - 60% */}
          <div className="h-3/5 border-b border-energy-cyan/20">
            <AvatarPanel />
          </div>
          
          {/* Memory Manager - 40% */}
          <div className="h-2/5">
            <MemoryManager />
          </div>
        </div>

        {/* Center Content - Chat takes remaining space */}
        <div className="flex-1 min-w-0">
          <ChatInterface />
        </div>

        {/* Right Sidebar - Compact fixed width */}
        <div className="w-56 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col">
          {/* Audio Controls */}
          <div className="flex-shrink-0 h-16 p-2">
            <AudioControls />
          </div>
          
          {/* Camera Settings */}
          <div className="flex-shrink-0 h-20 p-2">
            <CameraSettings />
          </div>
          
          {/* Mic Settings */}
          <div className="flex-shrink-0 h-20 p-2">
            <MicSettings />
          </div>
          
          {/* Screen Share Panel */}
          <div className="flex-shrink-0 h-24 p-2">
            <ScreenSharePanel />
          </div>
          
          {/* Voice Metrics - Takes remaining space */}
          <div className="flex-1 min-h-0 p-2">
            <VoiceMetrics />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Compact fixed height */}
      <div className="flex-shrink-0 h-8">
        <StatusBar />
      </div>
    </div>
  );
};

export default Index;
