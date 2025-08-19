
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

  return (
    <div className="h-dvh bg-space-deep text-text-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <ZandaleeHeader />
      </div>
      
      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar - Avatar and Memory split */}
        <div className="bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col min-h-0 w-80 xl:w-80 lg:w-72 md:w-64 sm:w-56">
          {/* Avatar Panel - Top half */}
          <div className="basis-1/2 flex-1 min-h-0 p-2">
            <AvatarPanel />
          </div>
          
          {/* Memory Manager - Bottom half */}
          <div className="basis-1/2 flex-1 min-h-0 p-2 pt-0">
            <MemoryManager />
          </div>
        </div>

        {/* Center Content - Chat Interface only */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ChatInterface />
          </div>
        </div>

        {/* Right Sidebar - Compact controls */}
        <div className="bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col min-h-0 w-72 xl:w-72 lg:w-64 md:w-60 sm:w-56">
          {/* Audio Controls */}
          <div className="flex-shrink-0 p-2">
            <AudioControls />
          </div>
          
          {/* Camera Settings */}
          <div className="flex-shrink-0 p-2 pt-0">
            <CameraSettings />
          </div>
          
          {/* Mic Settings */}
          <div className="flex-shrink-0 p-2 pt-0">
            <MicSettings />
          </div>
          
          {/* Screen Share Panel - Fixed height container */}
          <div className="flex-shrink-0 p-2 pt-0 h-40">
            <ScreenSharePanel />
          </div>
          
          {/* Voice Metrics - Takes remaining space with scroll */}
          <div className="flex-1 min-h-0 p-2 pt-0 overflow-y-auto">
            <VoiceMetrics />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex-shrink-0">
        <StatusBar />
      </div>
    </div>
  );
};

export default Index;
