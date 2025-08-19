
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LCARSTickerProps {
  className?: string;
  directLLMMode?: boolean;
  onDirectLLMChange?: (enabled: boolean) => void;
  speakBackEnabled?: boolean;
  onSpeakBackChange?: (enabled: boolean) => void;
  isConnected?: boolean;
  isSpeaking?: boolean;
  activeProvider?: string;
  isConfigured?: boolean;
}

const LCARSTicker: React.FC<LCARSTickerProps> = ({ 
  className,
  directLLMMode = false,
  onDirectLLMChange,
  speakBackEnabled = true,
  onSpeakBackChange,
  isConnected = false,
  isSpeaking = false,
  activeProvider = 'openai',
  isConfigured = false
}) => {
  const currentTime = new Date();
  const stardate = `${currentTime.getFullYear()}.${String(currentTime.getMonth() + 1).padStart(2, '0')}.${String(currentTime.getDate()).padStart(2, '0')}`;

  return (
    <div className={cn("h-14 bg-lcars-orange flex items-center px-6 border-b-2 border-lcars-orange/80", className)}>
      {/* Left - LCARS Status */}
      <div className="flex items-center space-x-4 flex-shrink-0">
        <div className="w-8 h-8 bg-lcars-black rounded-full flex items-center justify-center border-2 border-lcars-black">
          <div className="w-4 h-4 bg-lcars-orange rounded-full" />
        </div>
        <span className="font-lcars-sans font-bold text-contrast-dark text-sm uppercase tracking-wider">
          LCARS READY
        </span>
      </div>
      
      {/* Center - Communication Interface Controls */}
      <div className="flex-1 flex items-center justify-center space-x-8">
        <div>
          <h3 className="font-lcars-sans font-bold text-contrast-dark text-sm uppercase tracking-wider">Communication Interface</h3>
          <p className="text-xs text-contrast-dark/80">Text and voice communication with Zandalee</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="direct-llm"
              checked={directLLMMode}
              onCheckedChange={onDirectLLMChange}
              className="data-[state=checked]:bg-lcars-blue"
            />
            <Label htmlFor="direct-llm" className="text-xs text-contrast-dark font-lcars-mono flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Direct LLM</span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="speak-back"
              checked={speakBackEnabled}
              onCheckedChange={onSpeakBackChange}
              disabled={directLLMMode}
              className="data-[state=checked]:bg-lcars-blue"
            />
            <Label htmlFor="speak-back" className="text-xs text-contrast-dark font-lcars-mono">Speak Back</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              directLLMMode 
                ? (isConfigured ? 'bg-lcars-blue' : 'bg-lcars-orange')
                : (isConnected ? 'bg-lcars-teal' : 'bg-lcars-red')
            }`} />
            <span className="text-xs text-contrast-dark font-lcars-mono">
              {directLLMMode 
                ? (isConfigured ? `${activeProvider.toUpperCase()} Ready` : 'Not Configured')
                : (isConnected ? 'Backend Connected' : 'Backend Disconnected')
              }
            </span>
            {isSpeaking && !directLLMMode && (
              <span className="text-xs text-lcars-blue font-lcars-mono animate-pulse">Speaking</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Right - Time and Date */}
      <div className="flex items-center space-x-6 text-contrast-dark font-lcars-mono text-sm font-bold flex-shrink-0">
        <span>STARDATE {stardate}</span>
        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

export default LCARSTicker;
