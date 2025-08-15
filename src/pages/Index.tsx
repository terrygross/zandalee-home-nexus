
import { useState, useEffect } from "react";
import ZandaleeHeader from "@/components/ZandaleeHeader";
import ChatInterface from "@/components/ChatInterface";
import VoiceMetrics from "@/components/VoiceMetrics";
import MicSettings from "@/components/MicSettings";
import ProjectSidebar from "@/components/ProjectSidebar";
import CommandPalette from "@/components/CommandPalette";
import StatusBar from "@/components/StatusBar";
import MemoryManager from "@/components/MemoryManager";
import SelfTestRunner from "@/components/SelfTestRunner";
import SettingsDrawer from "@/components/SettingsDrawer";
import CameraSettings from "@/components/CameraSettings";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open command palette with Ctrl+Shift+P or Cmd+Shift+P
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // Open command palette with colon key
      if (event.key === ':' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement;
        // Only trigger if not in an input field
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          setCommandPaletteOpen(true);
        }
      }
      
      // Close command palette with Escape
      if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="container mx-auto p-3 flex flex-col flex-1 min-h-0 max-w-full">
        <div className="flex-shrink-0 mb-3">
          <ZandaleeHeader />
        </div>
        
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left Sidebar - Projects & Memory */}
          <div className="col-span-3 flex flex-col space-y-3 min-h-0">
            <div className="flex-shrink-0">
              <ProjectSidebar />
            </div>
            <div className="flex-1 min-h-0">
              <MemoryManager />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="col-span-6 flex flex-col space-y-3 min-h-0">
            {/* Avatar Area - Compact design */}
            <div className="h-32 glass-panel flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden">
              <div className="text-center space-y-2 p-4 w-full h-full flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-energy-cyan/30 to-energy-blue/30 border-2 border-energy-cyan/40 flex items-center justify-center shadow-lg shadow-energy-blue/20">
                  <div className="text-energy-cyan text-2xl font-bold tracking-wider">Z</div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-text-primary">Zandalee</h3>
                  <p className="text-xs text-text-muted">Avatar System Reserved</p>
                  <p className="text-xs text-text-secondary">Sandboxed & disabled by default</p>
                </div>
              </div>
            </div>
            
            {/* Chat Interface - Takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatInterface />
            </div>
          </div>
          
          {/* Right Sidebar - Voice Metrics & Controls */}
          <div className="col-span-3 flex flex-col space-y-3 min-h-0">
            <div className="flex-shrink-0">
              <VoiceMetrics />
            </div>
            <div className="flex-shrink-0">
              <MicSettings />
            </div>
            <div className="flex-shrink-0">
              <CameraSettings />
            </div>
            <div className="flex-shrink-0">
              <SelfTestRunner />
            </div>
            
            {/* Quick Actions */}
            <div className="glass-panel p-2 flex-shrink-0">
              <h4 className="text-xs font-semibold text-text-primary mb-2">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-1.5 bg-energy-cyan/10 hover:bg-energy-cyan/20 rounded text-xs text-energy-cyan border border-energy-cyan/30 transition-all duration-200"
                >
                  Commands
                </button>
                <button className="p-1.5 bg-energy-blue/10 hover:bg-energy-blue/20 rounded text-xs text-energy-blue border border-energy-blue/30 transition-all duration-200">
                  Screenshot
                </button>
                <button className="p-1.5 bg-energy-pulse/10 hover:bg-energy-pulse/20 rounded text-xs text-energy-pulse border border-energy-pulse/30 transition-all duration-200">
                  New Project
                </button>
                <SettingsDrawer>
                  <Button className="w-full p-1.5 bg-status-warning/10 hover:bg-status-warning/20 text-xs text-status-warning border border-status-warning/30 h-auto">
                    <Settings className="w-3 h-3 mr-1" />
                    Settings
                  </Button>
                </SettingsDrawer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Bar - Fixed at bottom */}
      <div className="flex-shrink-0">
        <StatusBar />
      </div>

      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-energy-cyan/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-energy-blue/5 rounded-full blur-3xl animate-pulse delay-300" />
          <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-energy-pulse/5 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
      </div>
    </div>
  );
};

export default Index;
