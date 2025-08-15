
import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Terminal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useToast } from "@/hooks/use-toast";
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
  const [speakBackEnabled, setSpeakBackEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { 
    isConnected, 
    isSpeaking,
    sendMessage, 
    speak,
    learnMemory
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
        description: "Connected to Zandalee daemon successfully",
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
      // Send message to daemon
      const response = await sendMessage(currentInput);
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.timestamp)
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Trigger TTS if speak back is enabled
      if (speakBackEnabled) {
        await speak(response.content);
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

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
  };

  const handleSaveAsMemory = async (messageContent: string) => {
    try {
      await learnMemory(
        messageContent,
        'semantic',
        ['chat', 'important'],
        0.7,
        0.8
      );
      
      toast({
        title: "Memory Saved",
        description: "Message has been saved to memory",
      });
    } catch (error) {
      toast({
        title: "Memory Error",
        description: error instanceof Error ? error.message : 'Failed to save memory',
        variant: "destructive"
      });
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isAssistant = message.role === 'assistant';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUser ? 'bg-energy-cyan/20 text-energy-cyan' :
            isSystem ? 'bg-status-info/20 text-status-info' :
            `bg-energy-blue/20 text-energy-blue ${isSpeaking && isAssistant ? 'animate-voice-pulse shadow-lg shadow-energy-blue/30' : ''}`
          }`}>
            {isUser ? <User className="w-4 h-4" /> :
             isSystem ? <Terminal className="w-4 h-4" /> :
             <Bot className={`w-4 h-4 ${isSpeaking && isAssistant ? 'text-energy-glow' : ''}`} />}
          </div>
          
          <div className={`glass-panel p-3 ${
            isUser ? 'bg-energy-cyan/10' :
            isSystem ? 'bg-status-info/10' :
            'bg-card'
          }`}>
            <p className="text-sm text-text-primary leading-relaxed">{message.content}</p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">
                {message.timestamp.toLocaleTimeString()}
              </span>
              
              {/* Save to Memory button for assistant messages */}
              {isAssistant && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveAsMemory(message.content)}
                  className="h-auto p-1 text-xs hover:bg-energy-cyan/20 hover:text-energy-cyan"
                  title="Save as Memory"
                >
                  <Star className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-4 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Chat Interface</h3>
            <p className="text-xs text-text-secondary">Communicate with Zandalee via text or voice</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-text-secondary">Speak Back</label>
              <input
                type="checkbox"
                checked={speakBackEnabled}
                onChange={(e) => setSpeakBackEnabled(e.target.checked)}
                className="rounded"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'} animate-pulse`} />
              <span className="text-xs text-text-muted">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isSpeaking && (
                <div className="flex items-center space-x-1 text-energy-glow">
                  <Bot className="w-3 h-3 animate-pulse" />
                  <span className="text-xs">Speaking</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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

      {/* Fixed Input Area */}
      <div className="p-4 border-t border-border/30 flex-shrink-0">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message or command..."
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
          <span>Click ⭐ to save responses as memories • Click mic for voice input</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
