
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
import LCARSLayout from "@/components/lcars/LCARSLayout";
import LCARSPanel from "@/components/lcars/LCARSPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useDirectLLM } from "@/hooks/useDirectLLM";

const Index = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [uiStyle, setUIStyle] = useState<string>("lcars");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [directLLMMode, setDirectLLMMode] = useState(false);
  const [speakBackEnabled, setSpeakBackEnabled] = useState(true);

  const { isConnected, isSpeaking } = useZandaleeAPI();
  const { activeProvider, isConfigured } = useDirectLLM();

  useEffect(() => {
    setIsMounted(true);
    // Force LCARS theme
    const root = document.documentElement;
    root.classList.remove('theme-zandalee', 'theme-lcars');
    root.classList.add('theme-lcars');
  }, []);

  const handleVoiceTranscript = (transcript: string) => {
    console.log('Voice transcript:', transcript);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  // LCARS Layout
  if (uiStyle === "lcars") {
    return (
      <>
        <LCARSLayout 
          onSettingsClick={handleSettingsClick}
          directLLMMode={directLLMMode}
          onDirectLLMChange={setDirectLLMMode}
          speakBackEnabled={speakBackEnabled}
          onSpeakBackChange={setSpeakBackEnabled}
          isConnected={isConnected}
          isSpeaking={isSpeaking}
          activeProvider={activeProvider}
          isConfigured={isConfigured()}
        >
          <div className="h-full flex space-x-4 overflow-hidden">
            {/* Main Chat Interface - Aligned with sidebar content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <LCARSPanel title="COMMUNICATION INTERFACE" color="orange" className="h-full">
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatInterface 
                      directLLMMode={directLLMMode}
                      speakBackEnabled={speakBackEnabled}
                    />
                  </div>
                </div>
              </LCARSPanel>
            </div>
            
            {/* Memory Core Panel - Aligned with sidebar content */}
            <div className="w-80 flex-shrink-0 hidden lg:block overflow-hidden">
              <LCARSPanel color="teal" className="h-full">
                <div className="h-full overflow-hidden">
                  <MemoryManager />
                </div>
              </LCARSPanel>
            </div>
          </div>
        </LCARSLayout>
        
        <SettingsDrawer 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </>
    );
  }

  // Original Zandalee Layout (fallback)
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
