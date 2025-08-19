
import { useState, useEffect } from "react";
import { Brain, Cpu, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import LCARSHeader from "./lcars/LCARSHeader";

const ZandaleeHeader = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uiStyle, setUIStyle] = useState<string>("zandalee");

  // Load UI style from API or local storage
  useEffect(() => {
    const loadUIStyle = async () => {
      try {
        const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';
        const response = await fetch(`${API_BASE}/config/ui`);
        if (response.ok) {
          const data = await response.json();
          const style = data.config?.ui_style || "zandalee";
          setUIStyle(style);
          
          // Apply theme class to document
          const root = document.documentElement;
          root.classList.remove('theme-zandalee', 'theme-lcars');
          if (style === 'lcars') {
            root.classList.add('theme-lcars');
          } else {
            root.classList.add('theme-zandalee');
          }
        }
      } catch (error) {
        console.log('Could not load UI style, using default');
        // Apply default theme
        document.documentElement.classList.add('theme-zandalee');
      }
    };

    loadUIStyle();
  }, []);

  // If LCARS theme is active, render LCARS variant
  if (uiStyle === 'lcars') {
    return (
      <>
        <LCARSHeader onSettingsClick={() => setIsSettingsOpen(true)} />
        <SettingsDrawer 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </>
    );
  }

  // Default Zandalee header
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-energy-cyan to-energy-blue rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-status-success rounded-full animate-pulse" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Zandalee</h1>
            <p className="text-text-secondary">Family Desktop AI • Ready to assist</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-energy-cyan">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Voice Active</span>
          </div>
          
          <div className="flex items-center space-x-2 text-energy-blue">
            <Cpu className="w-4 h-4" />
            <span className="text-sm">Processing</span>
          </div>
          
          <div className="text-text-muted text-sm">
            v1.0.0
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-energy-cyan/20 hover:text-energy-cyan border border-transparent hover:border-energy-cyan/30 transition-all duration-200"
            title="Open Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default ZandaleeHeader;
