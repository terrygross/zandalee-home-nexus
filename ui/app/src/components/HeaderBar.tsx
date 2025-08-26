import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "./StatusChip";
import { Status } from "@/types/api";

interface HeaderBarProps {
  status: Status;
  onSettingsClick: () => void;
}

export function HeaderBar({ status, onSettingsClick }: HeaderBarProps) {
  return (
    <header className="border-b border-border bg-gradient-card p-4 flex items-center justify-between backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-primary shadow-glow-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">Z</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Zandalee AI</h1>
        </div>
        
        <div className="w-px h-6 bg-border" />
        
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip 
            label="Online" 
            status={status.online ? 'online' : 'offline'} 
          />
          
          {status.listening && (
            <StatusChip 
              label="Mic" 
              status="listening" 
              value={status.vu_level}
            />
          )}
          
          {status.speaking && (
            <StatusChip 
              label="Speaking" 
              status="speaking" 
            />
          )}
          
          {status.hotword && (
            <StatusChip 
              label="Hotword" 
              status="active" 
            />
          )}
          
          <StatusChip 
            label="Voice" 
            status="inactive" 
            value={status.voice}
          />
          
          <StatusChip 
            label="Project" 
            status="inactive" 
            value={status.project}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground font-mono hidden sm:flex gap-4">
          <span>STT: {status.lat_stt}ms</span>
          <span>LLM: {status.lat_llm}ms</span>
          <span>TTS: {status.lat_tts}ms</span>
          <span className="text-primary">Total: {status.lat_total}ms</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="border-border hover:bg-muted/50 hover:border-primary/30 transition-all"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}