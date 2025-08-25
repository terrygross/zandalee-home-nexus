
import { Brain, Cpu, Activity, Settings, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import { useState } from "react";
import { useTheme } from "next-themes";

const ZandaleeHeader = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

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
            title="Toggle Theme"
            onClick={cycleTheme}
          >
            {getThemeIcon()}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-energy-cyan/20 hover:text-energy-cyan border border-transparent hover:border-energy-cyan/30 transition-all duration-200"
            title="Open Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
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
