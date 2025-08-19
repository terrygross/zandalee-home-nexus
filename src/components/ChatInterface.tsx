
import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Terminal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useDirectLLM } from "@/hooks/useDirectLLM";
import { useToast } from "@/hooks/use-toast";
import VoiceInput from "./VoiceInput";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  directLLMMode?: boolean;
  speakBackEnabled?: boolean;
}

const ChatInterface = ({ directLLMMode = false, speakBackEnabled = true }: ChatInterfaceProps) => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { 
    isConnected, 
    isSpeaking,
    sendMessage: sendBackendMessage, 
    speak,
    learnMemory
  } = useZandaleeAPI();

  const { sendMessage: sendDirectMessage, activeProvider, isConfigured } = useDirectLLM();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      let responseContent: string;

      if (directLLMMode) {
        if (!isConfigured()) {
          throw new Error(`No API key configured for ${activeProvider}. Please configure in settings.`);
        }

        // Convert messages to chat format for direct LLM
        const chatMessages = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
        
        // Add current user message
        chatMessages.push({ role: 'user', content: currentInput });

        responseContent = await sendDirectMessage(chatMessages);
      } else {
        if (!isConnected) {
          throw new Error('Not connected to Zandalee daemon. Please check connection or use Direct LLM mode.');
        }

        const response = await sendBackendMessage(currentInput);
        responseContent = response.content;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Trigger TTS if speak back is enabled and not in direct mode
      if (speakBackEnabled && !directLLMMode) {
        await speak(responseContent);
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
    if (directLLMMode) {
      toast({
        title: "Memory Save Unavailable",
        description: "Memory saving is only available in Backend mode",
        variant: "destructive"
      });
      return;
    }

    try {
      await learnMemory(
        messageContent,
        'semantic',
        ['chat', 'important', 'saved'],
        0.8,
        0.9
      );
      
      toast({
        title: "Memory Saved",
        description: "Message has been saved to your memory bank",
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
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-energy-cyan/20 text-energy-cyan' :
            isSystem ? 'bg-status-info/20 text-status-info' :
            `bg-energy-blue/20 text-energy-blue ${isSpeaking && isAssistant ? 'animate-pulse shadow-lg shadow-energy-blue/30' : ''}`
          }`}>
            {isUser ? <User className="w-4 h-4" /> :
             isSystem ? <Terminal className="w-4 h-4" /> :
             <Bot className={`w-4 h-4 ${isSpeaking && isAssistant ? 'text-energy-glow animate-pulse' : ''}`} />}
          </div>
          
          <div className={`glass-panel p-3 rounded-lg ${
            isUser ? 'bg-energy-cyan/10 border-energy-cyan/20' :
            isSystem ? 'bg-status-info/10 border-status-info/20' :
            'bg-card border-border/30'
          }`}>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{message.content}</p>
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
              <span className="text-xs text-text-muted">
                {message.timestamp.toLocaleTimeString()}
              </span>
              
              {/* Save to Memory button for assistant messages in backend mode */}
              {isAssistant && !directLLMMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveAsMemory(message.content)}
                  className="h-6 px-2 text-xs hover:bg-energy-cyan/20 hover:text-energy-cyan border border-transparent hover:border-energy-cyan/30 transition-all duration-200"
                  title="Save this response as a memory"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Save
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
      {/* Input Area at top */}
      <div className="p-4 border-b border-border/30 flex-shrink-0">
        <div className="flex space-x-2 mb-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message or command..."
            className="flex-1 bg-space-surface border-glass-border text-text-primary placeholder-text-muted"
            disabled={isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
          />
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
            className="bg-energy-cyan/20 hover:bg-energy-cyan/30 text-energy-cyan border border-energy-cyan/30 neon-border"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center text-xs text-text-muted">
          <span>
            {directLLMMode 
              ? `Direct mode: ${activeProvider.toUpperCase()} • Configure API key in settings ⚙️`
              : `Backend mode • Click ⭐ Save to save responses as memories • Click mic for voice input`
            }
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>

      {/* Scrollable Messages Area - Now has more space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-energy-blue/20 text-energy-blue">
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
    </div>
  );
};

export default ChatInterface;
