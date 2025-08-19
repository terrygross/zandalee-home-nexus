
import { Brain, Cpu, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import { useState } from "react";

const ZandaleeHeader = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-full bg-space-surface/30 border-b border-energy-cyan/30 px-4 py-2">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-energy-cyan to-energy-blue rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-status-success rounded-full animate-pulse" />
          </div>
          
          <div>
            <h1 className="text-lg font-bold text-text-primary">Zandalee</h1>
            <p className="text-xs text-text-secondary">Family Desktop AI</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-energy-cyan text-xs">
            <Activity className="w-3 h-3" />
            <span>Voice</span>
          </div>
          
          <div className="flex items-center space-x-1 text-energy-blue text-xs">
            <Cpu className="w-3 h-3" />
            <span>Ready</span>
          </div>
          
          <div className="text-text-muted text-xs">v1.0.0</div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-energy-cyan/20"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-3 h-3" />
          </Button>

          <SettingsDrawer 
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default ZandaleeHeader;
