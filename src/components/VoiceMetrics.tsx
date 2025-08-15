
import { Mic, Volume2, Clock, Zap } from "lucide-react";
import { useState, useEffect } from "react";

const VoiceMetrics = () => {
  const [vuLevel, setVuLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [metrics, setMetrics] = useState({
    stt: 45,
    llm: 120,
    tts: 80,
    total: 245
  });

  // Simulate voice activity
  useEffect(() => {
    const interval = setInterval(() => {
      if (isListening) {
        setVuLevel(Math.random() * 100);
      } else {
        setVuLevel(Math.max(0, vuLevel - 5));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isListening, vuLevel]);

  const VUMeter = ({ level }: { level: number }) => (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 20 }, (_, i) => {
        const segmentLevel = (i + 1) * 5;
        const isActive = level >= segmentLevel;
        const isHot = segmentLevel > 80;
        
        return (
          <div
            key={i}
            className={`w-1 h-6 rounded-sm transition-all duration-75 ${
              isActive
                ? isHot
                  ? 'bg-status-error shadow-sm'
                  : segmentLevel > 60
                  ? 'bg-status-warning shadow-sm'
                  : 'bg-energy-cyan shadow-sm'
                : 'bg-space-mid/30'
            }`}
          />
        );
      })}
    </div>
  );

  const MetricBar = ({ label, value, unit, icon: Icon, color }: {
    label: string;
    value: number;
    unit: string;
    icon: any;
    color: string;
  }) => (
    <div className="flex items-center space-x-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-text-secondary">{label}</span>
          <span className="text-xs text-text-primary">{value}{unit}</span>
        </div>
        <div className="w-full bg-space-mid/30 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              color.includes('cyan') ? 'bg-energy-cyan' :
              color.includes('blue') ? 'bg-energy-blue' :
              color.includes('pulse') ? 'bg-energy-pulse' : 'bg-energy-glow'
            }`}
            style={{ width: `${Math.min(100, (value / 200) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Voice Metrics</h3>
        <button
          onClick={() => setIsListening(!isListening)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isListening
              ? 'bg-energy-cyan/20 text-energy-cyan voice-active'
              : 'bg-space-mid/50 text-text-secondary hover:bg-space-mid'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Input Level</span>
          <span className="text-xs text-text-primary">{Math.round(vuLevel)}%</span>
        </div>
        <VUMeter level={vuLevel} />
      </div>

      <div className="space-y-3 pt-2 border-t border-border/30">
        <MetricBar
          label="STT"
          value={metrics.stt}
          unit="ms"
          icon={Mic}
          color="text-energy-cyan"
        />
        <MetricBar
          label="LLM"
          value={metrics.llm}
          unit="ms"
          icon={Zap}
          color="text-energy-blue"
        />
        <MetricBar
          label="TTS"
          value={metrics.tts}
          unit="ms"
          icon={Volume2}
          color="text-energy-pulse"
        />
        <MetricBar
          label="Total"
          value={metrics.total}
          unit="ms"
          icon={Clock}
          color="text-energy-glow"
        />
      </div>
    </div>
  );
};

export default VoiceMetrics;
