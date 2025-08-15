
import { useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTranscript, disabled }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';

  const handleVoiceInput = async () => {
    if (isListening || isProcessing || disabled) return;

    setIsListening(true);
    setIsProcessing(true);

    try {
      // Call the daemon's voice/listen endpoint
      const response = await fetch(`${API_BASE}/voice/listen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Voice input failed');
      
      const result = await response.json();
      
      if (result.status === 'success' && result.transcript) {
        onTranscript(result.transcript);
        toast({
          title: "Voice Input",
          description: `Transcribed: "${result.transcript}"`,
        });
      } else {
        throw new Error(result.message || 'Voice input failed');
      }
      
    } catch (error) {
      toast({
        title: "Voice Input Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleVoiceInput}
      disabled={disabled || isListening || isProcessing}
      variant="ghost"
      size="sm"
      className={`${
        isListening || isProcessing
          ? 'text-energy-cyan bg-energy-cyan/20 voice-active animate-pulse'
          : 'text-text-muted bg-space-mid/50 hover:bg-space-mid hover:text-energy-cyan'
      } transition-all duration-200`}
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isListening ? (
        <Mic className="w-4 h-4" />
      ) : (
        <MicOff className="w-4 h-4" />
      )}
    </Button>
  );
};

export default VoiceInput;
