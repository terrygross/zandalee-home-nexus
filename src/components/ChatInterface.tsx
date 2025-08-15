import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useToast } from "@/components/ui/use-toast";
import VoiceInput from "./VoiceInput";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Zandalee AI Assistant initialized. Core laws loaded. Ready to assist.',
      timestamp: new Date()
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hello! I\'m Zandalee, your family desktop AI. I can help with projects, manage memories, take screenshots, and much more. Try saying "Zandalee, help me get started" or use commands like :help',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { 
    isConnected, 
    sendMessage, 
    executeCommand, 
    speak 
  } = useZandaleeAPI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show connection status
  useEffect(() => {
    if (isConnected) {
      toast({
        title: "Connected",
        description: "Connected to Zandalee backend successfully",
      });
    }
  }, [isConnected, toast]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      if (currentInput.startsWith(':')) {
        // Handle command
        const result = await executeCommand(currentInput);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.success ? result.message || 'Command executed successfully' : `Error: ${result.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle regular chat
        const response = await sendMessage(currentInput);
        const assistantMessage: Message = {
          id: response.id,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(response.timestamp)
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = async () => {
    setVoiceEnabled(!voiceEnabled);
    toast({
      title: voiceEnabled ? "Voice Disabled" : "Voice Enabled",
      description: voiceEnabled ? "Voice output disabled" : "Voice output enabled",
    });
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
    // Optionally auto-send the transcribed message
    // handleSend(); // Uncomment this if you want voice input to auto-send
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUser ? 'bg-energy-cyan/20 text-energy-cyan' :
            isSystem ? 'bg-status-info/20 text-status-info' :
            'bg-energy-blue/20 text-energy-blue'
          }`}>
            {isUser ? <User className="w-4 h-4" /> :
             isSystem ? <Terminal className="w-4 h-4" /> :
             <Bot className="w-4 h-4" />}
          </div>
          
          <div className={`glass-panel p-3 ${
            isUser ? 'bg-energy-cyan/10' :
            isSystem ? 'bg-status-info/10' :
            'bg-card'
          }`}>
            <p className="text-sm text-text-primary leading-relaxed">{message.content}</p>
            <span className="text-xs text-text-muted mt-2 block">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Chat Interface</h3>
            <p className="text-xs text-text-secondary">Communicate with Zandalee via text or voice</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'} animate-pulse`} />
            <span className="text-xs text-text-muted">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-energy-blue/20 text-energy-blue flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass-panel p-3 bg-card">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-energy-cyan rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-energy-blue rounded-full animate-pulse delay-150" />
                  <div className="w-2 h-2 bg-energy-pulse rounded-full animate-pulse delay-300" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border/30">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message or command (e.g., :help)..."
            className="flex-1 bg-space-surface border-glass-border text-text-primary placeholder-text-muted"
            disabled={isProcessing || !isConnected}
          />
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={isProcessing || !isConnected}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !isConnected}
            className="bg-energy-cyan/20 hover:bg-energy-cyan/30 text-energy-cyan border border-energy-cyan/30 neon-border"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-text-muted">
          <span>Commands start with ":" • Click mic to use voice input</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
