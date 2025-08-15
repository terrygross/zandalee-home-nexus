
import { useState, useEffect } from "react";
import { Cpu, HardDrive, Wifi, Shield, Clock, Activity } from "lucide-react";

const StatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState({
    transport: "STDIO",
    project: "Personal Assistant",
    memories: 156,
    uptime: "2h 34m",
    status: "Ready"
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const StatusIndicator = ({ icon: Icon, label, value, color = "text-energy-cyan" }: {
    icon: any;
    label: string;
    value: string;
    color?: string;
  }) => (
    <div className="flex items-center space-x-2 px-3 py-1 bg-space-mid/30 rounded-lg">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="text-xs">
        <span className="text-text-muted">{label}:</span>
        <span className="text-text-primary ml-1">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <StatusIndicator
            icon={Activity}
            label="Transport"
            value={systemStats.transport}
            color="text-energy-cyan"
          />
          
          <StatusIndicator
            icon={HardDrive}
            label="Project"
            value={systemStats.project}
            color="text-energy-blue"
          />
          
          <StatusIndicator
            icon={Cpu}
            label="Memories"
            value={systemStats.memories.toString()}
            color="text-energy-pulse"
          />
          
          <StatusIndicator
            icon={Shield}
            label="Security"
            value="Active"
            color="text-status-success"
          />
        </div>

        <div className="flex items-center space-x-4">
          <StatusIndicator
            icon={Clock}
            label="Uptime"
            value={systemStats.uptime}
            color="text-text-secondary"
          />
          
          <div className="flex items-center space-x-2 px-3 py-1 bg-energy-cyan/10 rounded-lg border border-energy-cyan/30">
            <div className="w-2 h-2 bg-energy-cyan rounded-full animate-pulse" />
            <span className="text-xs text-energy-cyan font-medium">{systemStats.status}</span>
          </div>
          
          <div className="text-xs text-text-muted">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <div className="h-px bg-gradient-to-r from-transparent via-energy-cyan/30 to-transparent w-full" />
      </div>
    </div>
  );
};

export default StatusBar;
