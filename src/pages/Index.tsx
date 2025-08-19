
import { useState, useEffect } from "react";
import ZandaleeHeader from "@/components/ZandaleeHeader";
import AvatarPanel from "@/components/AvatarPanel";  
import MemoryManager from "@/components/MemoryManager";
import ChatInterface from "@/components/ChatInterface";
import VoiceInput from "@/components/VoiceInput";
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
    <div className="min-h-screen bg-space-deep text-text-primary flex flex-col">
      {/* Header */}
      <ZandaleeHeader />
      
      {/* Main Content Area - constrained to remaining viewport height */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Left Sidebar - Split 50/50 between Avatar and Memory */}
        <div className="w-80 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col">
          {/* Avatar Panel - Top half */}
          <div className="h-1/2 p-2">
            <AvatarPanel />
          </div>
          
          {/* Memory Manager - Bottom half */}
          <div className="h-1/2 p-2 pt-0">
            <MemoryManager />
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatInterface />
          </div>
          
          {/* Voice Input */}
          <div className="flex-shrink-0">
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>
        </div>

        {/* Right Sidebar - Compact */}
        <div className="w-72 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col overflow-hidden">
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
          
          {/* Screen Share Panel */}
          <div className="flex-shrink-0 p-2 pt-0" style={{ height: '160px' }}>
            <ScreenSharePanel />
          </div>
          
          {/* Voice Metrics */}
          <div className="flex-1 min-h-0 p-2 pt-0">
            <VoiceMetrics />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
};

export default Index;
