
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
    <div className="h-screen w-screen bg-space-deep text-text-primary flex flex-col overflow-hidden">
      {/* Header - Fixed 60px */}
      <header className="h-15 flex-shrink-0">
        <ZandaleeHeader />
      </header>
      
      {/* Main Content - Takes remaining height */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Fixed 240px width */}
        <aside className="w-60 flex-shrink-0 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col h-full">
            {/* Avatar Panel - 60% of sidebar height */}
            <div className="flex-[3] border-b border-energy-cyan/20 overflow-hidden">
              <AvatarPanel />
            </div>
            
            {/* Memory Manager - 40% of sidebar height */}
            <div className="flex-[2] overflow-hidden">
              <MemoryManager />
            </div>
          </div>
        </aside>

        {/* Center Content - Chat takes remaining width */}
        <section className="flex-1 overflow-hidden">
          <ChatInterface />
        </section>

        {/* Right Sidebar - Fixed 200px width */}
        <aside className="w-50 flex-shrink-0 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Audio Controls - Fixed height */}
            <div className="h-12 flex-shrink-0 p-1">
              <AudioControls />
            </div>
            
            {/* Camera Settings - Fixed height */}
            <div className="h-16 flex-shrink-0 p-1">
              <CameraSettings />
            </div>
            
            {/* Mic Settings - Fixed height */}
            <div className="h-16 flex-shrink-0 p-1">
              <MicSettings />
            </div>
            
            {/* Screen Share Panel - Fixed height */}
            <div className="h-20 flex-shrink-0 p-1">
              <ScreenSharePanel />
            </div>
            
            {/* Voice Metrics - Takes remaining space */}
            <div className="flex-1 p-1 overflow-hidden">
              <VoiceMetrics />
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar - Fixed 28px */}
      <footer className="h-7 flex-shrink-0">
        <StatusBar />
      </footer>
    </div>
  );
};

export default Index;
