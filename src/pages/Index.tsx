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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-6 flex flex-col flex-1">
        <ZandaleeHeader />
        
        <div className="grid grid-cols-12 gap-6 flex-1 mt-6">
          {/* Left Sidebar - Projects & Memory */}
          <div className="col-span-3 space-y-6">
            <ProjectSidebar />
            <MemoryManager />
          </div>
          
          {/* Main Content Area */}
          <div className="col-span-6 flex flex-col space-y-4">
            {/* Avatar Area - Square design for full avatar */}
            <div className="aspect-square max-h-64 glass-panel flex items-center justify-center flex-shrink-0 rounded-2xl overflow-hidden">
              <div className="text-center space-y-4 p-8 w-full">
                <div className="w-full aspect-square max-w-32 mx-auto rounded-2xl bg-gradient-to-br from-energy-cyan/30 to-energy-blue/30 border-2 border-energy-cyan/40 flex items-center justify-center shadow-lg shadow-energy-blue/20">
                  <div className="text-energy-cyan text-6xl font-bold tracking-wider">Z</div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-text-primary">Zandalee</h3>
                  <p className="text-sm text-text-muted">Avatar System Reserved</p>
                  <p className="text-xs text-text-secondary">Sandboxed & disabled by default</p>
                </div>
              </div>
            </div>
            
            {/* Chat Interface - Takes remaining space */}
            <div className="flex-1 min-h-0">
              <ChatInterface />
            </div>
          </div>
          
          {/* Right Sidebar - Voice Metrics & Controls */}
          <div className="col-span-3 space-y-6">
            <VoiceMetrics />
            <MicSettings />
            <SelfTestRunner />
            
            {/* Quick Actions */}
            <div className="glass-panel p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-2 bg-energy-cyan/10 hover:bg-energy-cyan/20 rounded-lg text-xs text-energy-cyan border border-energy-cyan/30 transition-all duration-200"
                >
                  Commands
                </button>
                <button className="p-2 bg-energy-blue/10 hover:bg-energy-blue/20 rounded-lg text-xs text-energy-blue border border-energy-blue/30 transition-all duration-200">
                  Screenshot
                </button>
                <button className="p-2 bg-energy-pulse/10 hover:bg-energy-pulse/20 rounded-lg text-xs text-energy-pulse border border-energy-pulse/30 transition-all duration-200">
                  New Project
                </button>
                <SettingsDrawer>
                  <Button className="w-full p-2 bg-status-warning/10 hover:bg-status-warning/20 text-xs text-status-warning border border-status-warning/30 h-auto">
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                </SettingsDrawer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Bar - Fixed at bottom */}
      <StatusBar />

      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
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
