
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
      <div className="flex flex-col flex-1 min-h-0 max-w-full p-1 gap-1">
        {/* Compact Header */}
        <div className="flex-shrink-0">
          <div className="glass-panel p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-energy-cyan to-energy-blue rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Z</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-text-primary">Zandalee</h1>
                  <p className="text-xs text-text-secondary">Family Desktop AI</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-energy-cyan">Voice Active</span>
                <span className="text-energy-blue">Processing</span>
                <span className="text-text-muted">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Grid - More responsive */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-1">
          {/* Left Sidebar - Hidden on small screens, collapsible on medium */}
          <div className="hidden lg:flex lg:col-span-2 flex-col gap-1">
            <div className="glass-panel p-2 text-xs">
              <h4 className="font-semibold text-text-primary mb-1">Projects</h4>
              <div className="space-y-1">
                <div className="p-1 bg-energy-cyan/10 rounded text-energy-cyan">Personal Assistant</div>
                <div className="p-1 hover:bg-space-surface rounded text-text-secondary cursor-pointer">+ New Project</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 glass-panel p-2">
              <h4 className="text-xs font-semibold text-text-primary mb-1">Memory</h4>
              <div className="text-xs text-text-muted">42 memories loaded</div>
            </div>
          </div>
          
          {/* Main Chat Area */}
          <div className="col-span-1 lg:col-span-8 flex flex-col min-h-0">
            <ChatInterface />
          </div>
          
          {/* Right Sidebar - Collapsible on smaller screens */}
          <div className="hidden md:flex md:col-span-1 lg:col-span-2 flex-col gap-1">
            {/* Voice Metrics - Compact */}
            <div className="glass-panel p-2">
              <h4 className="text-xs font-semibold text-text-primary mb-1">Voice</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="text-center">
                  <div className="text-energy-cyan font-mono">85%</div>
                  <div className="text-text-muted">Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-energy-blue font-mono">-12dB</div>
                  <div className="text-text-muted">Level</div>
                </div>
              </div>
            </div>
            
            {/* Mic Settings - Ultra Compact */}
            <div className="glass-panel p-2">
              <h4 className="text-xs font-semibold text-text-primary mb-1">Audio</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Mic</span>
                  <div className="w-2 h-2 bg-status-success rounded-full"></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Speaker</span>
                  <div className="w-2 h-2 bg-status-success rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* Camera - Ultra Compact */}
            <div className="glass-panel p-2">
              <h4 className="text-xs font-semibold text-text-primary mb-1">Camera</h4>
              <div className="text-xs text-text-muted">Disabled</div>
            </div>
            
            {/* Quick Actions - Minimal */}
            <div className="glass-panel p-2">
              <h4 className="text-xs font-semibold text-text-primary mb-1">Actions</h4>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-1 bg-energy-cyan/10 hover:bg-energy-cyan/20 rounded text-xs text-energy-cyan border border-energy-cyan/30 transition-all duration-200"
                >
                  Commands
                </button>
                <SettingsDrawer>
                  <Button className="w-full p-1 bg-status-warning/10 hover:bg-status-warning/20 text-xs text-status-warning border border-status-warning/30 h-auto">
                    <Settings className="w-3 h-3 mr-1" />
                    Settings
                  </Button>
                </SettingsDrawer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Minimal Status Bar */}
      <div className="flex-shrink-0 glass-panel p-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-energy-cyan">
              <div className="w-1 h-1 bg-energy-cyan rounded-full"></div>
              <span>STDIO</span>
            </div>
            <div className="flex items-center space-x-1 text-status-success">
              <div className="w-1 h-1 bg-status-success rounded-full"></div>
              <span>Connected</span>
            </div>
          </div>
          <div className="text-text-muted">Personal Assistant • Laws Active</div>
        </div>
      </div>

      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
      
      {/* Subtle background effects */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-energy-cyan/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-energy-blue/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
    </div>
  );
};

export default Index;
