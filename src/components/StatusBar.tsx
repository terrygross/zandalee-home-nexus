
import { Wifi, HardDrive, Cpu, MemoryStick } from "lucide-react";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

const StatusBar = () => {
  const { isConnected } = useZandaleeAPI();

  return (
    <div className="h-full bg-space-surface/30 border-t border-energy-cyan/30 px-4 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Wifi className={`w-3 h-3 ${isConnected ? 'text-status-success' : 'text-status-error'}`} />
          <span className="text-text-muted">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center space-x-1 text-text-muted">
          <Cpu className="w-3 h-3" />
          <span>CPU: 45%</span>
        </div>
        
        <div className="flex items-center space-x-1 text-text-muted">
          <MemoryStick className="w-3 h-3" />
          <span>RAM: 2.1GB</span>
        </div>
        
        <div className="flex items-center space-x-1 text-text-muted">
          <HardDrive className="w-3 h-3" />
          <span>Disk: 156GB</span>
        </div>
      </div>
      
      <div className="text-text-muted">
        Ready • {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default StatusBar;
