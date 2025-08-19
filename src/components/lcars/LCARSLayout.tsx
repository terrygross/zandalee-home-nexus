
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import LCARSTicker from "./LCARSTicker";
import LCARSSidebar from "./LCARSSidebar";
import LCARSFooterBar from "./LCARSFooterBar";
import LCARSSettingsSidebar from "./LCARSSettingsSidebar";

interface LCARSLayoutProps {
  children: React.ReactNode;
  className?: string;
  onSettingsClick?: () => void;
  directLLMMode?: boolean;
  onDirectLLMChange?: (enabled: boolean) => void;
  speakBackEnabled?: boolean;
  onSpeakBackChange?: (enabled: boolean) => void;
  isConnected?: boolean;
  isSpeaking?: boolean;
  activeProvider?: string;
  isConfigured?: boolean;
}

const LCARSLayout: React.FC<LCARSLayoutProps> = ({ 
  children, 
  className, 
  onSettingsClick,
  directLLMMode,
  onDirectLLMChange,
  speakBackEnabled,
  onSpeakBackChange,
  isConnected,
  isSpeaking,
  activeProvider,
  isConfigured
}) => {
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);

  const handleSettingsClick = () => {
    setIsSettingsSidebarOpen(true);
  };

  return (
    <div className={cn("h-screen bg-lcars-black font-lcars-sans text-white flex flex-col overflow-hidden relative", className)}>
      {/* Top Ticker - Fixed Height */}
      <div className="flex-shrink-0 z-20 h-14">
        <LCARSTicker 
          directLLMMode={directLLMMode}
          onDirectLLMChange={onDirectLLMChange}
          speakBackEnabled={speakBackEnabled}
          onSpeakBackChange={onSpeakBackChange}
          isConnected={isConnected}
          isSpeaking={isSpeaking}
          activeProvider={activeProvider}
          isConfigured={isConfigured}
          onSettingsClick={handleSettingsClick}
        />
      </div>
      
      {/* Main Content Grid - Calculated Height */}
      <div className="flex-1 flex min-h-0" style={{ height: 'calc(100vh - 7.5rem)' }}>
        {/* Left Sidebar - Now with System Status */}
        <div className="flex-shrink-0 z-10 w-72 md:w-80">
          <LCARSSidebar />
        </div>
        
        {/* Central Viewport - Now takes full remaining width */}
        <main className="flex-1 p-4 md:p-6 min-w-0 relative overflow-hidden">
          <div className="h-full bg-lcars-dark-gray/30 rounded-lg border border-lcars-orange/40 p-4 md:p-6 overflow-hidden">
            <div className="h-full overflow-hidden">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Bottom Status Bar - Fixed Height */}
      <div className="flex-shrink-0 z-20 h-16">
        <LCARSFooterBar />
      </div>

      {/* Settings Sidebar - Overlay */}
      <LCARSSettingsSidebar
        isOpen={isSettingsSidebarOpen}
        onClose={() => setIsSettingsSidebarOpen(false)}
        onSettingsClick={() => {
          setIsSettingsSidebarOpen(false);
          onSettingsClick?.();
        }}
      />
    </div>
  );
};

export default LCARSLayout;
