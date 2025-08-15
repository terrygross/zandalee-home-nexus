
import { Brain, Cpu, Zap } from "lucide-react";

const ZandaleeHeader = () => {
  return (
    <header className="glass-panel p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-energy-cyan to-energy-blue p-3 energy-glow">
              <Brain className="w-full h-full text-space-void" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-energy-pulse rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">Zandalee</h1>
            <p className="text-text-secondary text-sm">Family Desktop AI Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-space-mid/50">
            <div className="status-indicator status-online" />
            <span className="text-xs text-text-secondary">Online</span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-space-mid/50">
            <Cpu className="w-4 h-4 text-energy-cyan" />
            <span className="text-xs text-text-secondary">STDIO</span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-space-mid/50">
            <Zap className="w-4 h-4 text-energy-pulse" />
            <span className="text-xs text-text-secondary">Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ZandaleeHeader;
