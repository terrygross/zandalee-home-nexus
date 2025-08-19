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
          <div className="h-full flex space-x-4 overflow-hidden bg-lcars-black">
            {/* Main Chat Interface - Pure black background */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-lcars-black rounded-lg border-2 border-lcars-orange overflow-hidden">
                <div className="px-4 py-2 border-b-2 border-lcars-orange font-bold uppercase tracking-wider text-sm text-black bg-lcars-orange rounded-t-lg overflow-hidden">
                  COMMUNICATION INTERFACE
                </div>
                <div className="h-full flex flex-col overflow-hidden bg-lcars-black p-4" style={{ height: 'calc(100% - 3rem)' }}>
                  <div className="flex-1 min-h-0 overflow-hidden bg-lcars-black">
                    <ChatInterface 
                      directLLMMode={directLLMMode}
                      speakBackEnabled={speakBackEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Memory Core Panel - Pure black background */}
            <div className="w-80 flex-shrink-0 hidden lg:block overflow-hidden">
              <MemoryManager />
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

  return (
    <div className="min-h-screen bg-space-deep text-text-primary flex flex-col">
      <ZandaleeHeader />
      
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="w-80 bg-space-surface/20 border-r border-energy-cyan/30 flex flex-col">
          <div className="h-1/2 p-2">
            <AvatarPanel />
          </div>
          
          <div className="h-1/2 p-2 pt-0">
            <MemoryManager />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ChatInterface />
          </div>
          
          <div className="flex-shrink-0">
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>
        </div>

        <div className="w-72 bg-space-surface/20 border-l border-energy-cyan/30 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-2">
            <AudioControls />
          </div>
          
          <div className="flex-shrink-0 p-2 pt-0">
            <CameraSettings />
          </div>
          
          <div className="flex-shrink-0 p-2 pt-0">
            <MicSettings />
          </div>
          
          <div className="flex-shrink-0 p-2 pt-0" style={{ height: '160px' }}>
            <ScreenSharePanel />
          </div>
          
          <div className="flex-1 min-h-0 p-2 pt-0">
            <VoiceMetrics />
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
};

export default Index;
