
import { Wifi, Database, Mic, Settings, Shield } from "lucide-react";

const StatusBar = () => {
  return (
    <div className="glass-panel p-2 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-energy-cyan">
          <Mic className="w-3 h-3" />
          <span>STDIO</span>
        </div>
        
        <div className="flex items-center space-x-1 text-status-success">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
        
        <div className="flex items-center space-x-1 text-energy-blue">
          <Database className="w-3 h-3" />
          <span>42 memories</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-text-muted">
          <span>Project: Personal Assistant</span>
        </div>
        
        <div className="flex items-center space-x-1 text-status-warning">
          <Shield className="w-3 h-3" />
          <span>Laws Active</span>
        </div>
        
        <button className="flex items-center space-x-1 text-text-muted hover:text-text-primary transition-colors">
          <Settings className="w-3 h-3" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
