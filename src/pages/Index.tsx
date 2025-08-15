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

const Index = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-space-deep text-text-primary flex flex-col">
      {/* Header */}
      <ZandaleeHeader />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col overflow-hidden">
          {/* Avatar Panel */}
          <div className="flex-shrink-0">
            <AvatarPanel />
          </div>
          
          {/* Memory Manager */}
          <div className="flex-1 min-h-0">
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
            <VoiceInput />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col overflow-hidden">
          {/* Audio Controls */}
          <div className="flex-shrink-0 p-3">
            <AudioControls />
          </div>
          
          {/* Camera Settings */}
          <div className="flex-shrink-0 p-3">
            <CameraSettings />
          </div>
          
          {/* Mic Settings */}
          <div className="flex-shrink-0 p-3">
            <MicSettings />
          </div>
          
          {/* Voice Metrics */}
          <div className="flex-1 min-h-0 p-3">
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
