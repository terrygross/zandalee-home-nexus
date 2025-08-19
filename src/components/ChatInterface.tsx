import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Terminal, Star, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [directLLMMode, setDirectLLMMode] = useState(false);
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

  useEffect(() => {
    if (isConnected && !directLLMMode) {
      toast({
        title: "Connected",
        description: "Connected to Zandalee daemon successfully",
      });
    }
  }, [isConnected, directLLMMode, toast]);

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

        const chatMessages = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
        
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
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`flex items-start space-x-2 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs ${
            isUser ? 'bg-energy-cyan/20 text-energy-cyan' :
            isSystem ? 'bg-status-info/20 text-status-info' :
            `bg-energy-blue/20 text-energy-blue ${isSpeaking && isAssistant ? 'animate-pulse shadow-lg shadow-energy-blue/30' : ''}`
          }`}>
            {isUser ? <User className="w-3 h-3" /> :
             isSystem ? <Terminal className="w-3 h-3" /> :
             <Bot className={`w-3 h-3 ${isSpeaking && isAssistant ? 'text-energy-glow animate-pulse' : ''}`} />}
          </div>
          
          <div className={`glass-panel p-2 rounded text-xs ${
            isUser ? 'bg-energy-cyan/10 border-energy-cyan/20' :
            isSystem ? 'bg-status-info/10 border-status-info/20' :
            'bg-card border-border/30'
          }`}>
            <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{message.content}</p>
            
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/20">
              <span className="text-[9px] text-text-muted">
                {message.timestamp.toLocaleTimeString()}
              </span>
              
              {isAssistant && !directLLMMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveAsMemory(message.content)}
                  className="h-4 px-1 text-[9px] hover:bg-energy-cyan/20 hover:text-energy-cyan border border-transparent hover:border-energy-cyan/30 transition-all duration-200"
                  title="Save this response as a memory"
                >
                  <Star className="w-2 h-2 mr-0.5" />
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
    <div className="h-full flex flex-col bg-card/50 overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 p-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Chat Interface</h3>
            <p className="text-[10px] text-text-secondary">Communicate with Zandalee</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Switch
                id="direct-llm"
                checked={directLLMMode}
                onCheckedChange={setDirectLLMMode}
                className="scale-75"
              />
              <Label htmlFor="direct-llm" className="text-[9px] flex items-center space-x-0.5">
                <Zap className="w-2 h-2" />
                <span>Direct</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-1">
              <Switch
                id="speak-back"
                checked={speakBackEnabled}
                onCheckedChange={setSpeakBackEnabled}
                disabled={directLLMMode}
                className="scale-75"
              />
              <Label htmlFor="speak-back" className="text-[9px]">Speak</Label>
            </div>
            
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                directLLMMode 
                  ? (isConfigured() ? 'bg-energy-cyan' : 'bg-status-warning')
                  : (isConnected ? 'bg-status-success' : 'bg-status-error')
              }`} />
              <span className="text-[9px] text-text-muted">
                {directLLMMode 
                  ? (isConfigured() ? `${activeProvider.toUpperCase()}` : 'Config')
                  : (isConnected ? 'Connected' : 'Disconnected')
                }
              </span>
              {isSpeaking && !directLLMMode && (
                <div className="flex items-center space-x-1 text-energy-glow">
                  <Bot className="w-2 h-2 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable, takes remaining space */}
      <div className="flex-1 overflow-y-auto p-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex justify-start mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                directLLMMode ? 'bg-energy-cyan/20 text-energy-cyan' : 'bg-energy-blue/20 text-energy-blue'
              }`}>
                {directLLMMode ? <Zap className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>
              <div className="glass-panel p-2 bg-card">
                <div className="flex space-x-0.5">
                  <div className="w-1 h-1 bg-energy-cyan rounded-full animate-pulse" />
                  <div className="w-1 h-1 bg-energy-blue rounded-full animate-pulse delay-150" />
                  <div className="w-1 h-1 bg-energy-pulse rounded-full animate-pulse delay-300" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 p-2 border-t border-border/30">
        <div className="flex space-x-1 mb-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-space-surface border-glass-border text-text-primary placeholder-text-muted h-7 text-xs"
            disabled={isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
          />
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || (!isConnected && !directLLMMode) || (directLLMMode && !isConfigured())}
            className="bg-energy-cyan/20 hover:bg-energy-cyan/30 text-energy-cyan border border-energy-cyan/30 neon-border h-7 px-2"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="text-[9px] text-text-muted">
          {directLLMMode 
            ? `Direct mode: ${activeProvider.toUpperCase()}`
            : `Backend mode • Click ⭐ to save responses • Press Enter to send`
          }
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
