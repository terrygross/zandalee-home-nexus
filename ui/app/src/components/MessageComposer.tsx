import { useState, KeyboardEvent } from "react";
import { Send, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  onSpeak: (text: string) => void;
  onToggleMic: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  disabled?: boolean;
}

export function MessageComposer({
  onSendMessage,
  onSpeak,
  onToggleMic,
  isListening,
  isSpeaking,
  disabled = false
}: MessageComposerProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleSpeak = () => {
    if (message.trim() && !disabled) {
      onSpeak(message.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-gradient-card p-4 backdrop-blur-sm">
      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to Zandalee... (Shift+Enter for new line, Enter to send)"
            className={cn(
              "min-h-[60px] max-h-[200px] resize-none",
              "bg-background/50 border-border focus:border-primary/50",
              "transition-all duration-300"
            )}
            disabled={disabled}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={cn(
              "bg-primary hover:bg-primary-glow text-primary-foreground",
              "shadow-glow-primary hover:shadow-glow-accent transition-all",
              "disabled:opacity-50 disabled:shadow-none"
            )}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleSpeak}
            disabled={!message.trim() || disabled || isSpeaking}
            variant="outline"
            className={cn(
              "border-border hover:border-accent/50 hover:bg-accent/10",
              "transition-all duration-300",
              isSpeaking && "animate-pulse-glow"
            )}
            size="sm"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onToggleMic}
            disabled={disabled}
            variant="outline"
            className={cn(
              "border-border transition-all duration-300",
              isListening 
                ? "border-primary bg-primary/20 text-primary shadow-glow-primary animate-pulse-glow" 
                : "hover:border-accent/50 hover:bg-accent/10"
            )}
            size="sm"
          >
            {isListening ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>Shift+Enter for new line • Enter to send</span>
        <span>{message.length} characters</span>
      </div>
    </div>
  );
}