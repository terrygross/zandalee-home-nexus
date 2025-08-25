import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useZandaleeAPI } from '@/hooks/useZandaleeAPI';
import { useGateway } from '@/hooks/useGateway';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastEnterTime, setLastEnterTime] = useState<number>(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { speak } = useZandaleeAPI();
  const { askAndSpeak, askLLM } = useGateway();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Small delay to ensure the DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const handleSpeak = async (message: Message) => {
    if (!ttsEnabled) return;
    
    if (speakingMessageId === message.id) {
      // If already speaking this message, stop it (we can't actually stop but we'll clear the state)
      setSpeakingMessageId(null);
      return;
    }

    try {
      setSpeakingMessageId(message.id);
      await speak(message.content);
    } catch (error) {
      toast({
        title: 'Speech Error',
        description: 'Failed to speak message',
        variant: 'destructive',
      });
    } finally {
      setSpeakingMessageId(null);
    }
  };

  // Auto-speak new assistant messages if TTS is enabled
  useEffect(() => {
    if (ttsEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'assistant' && !speakingMessageId) {
        handleSpeak(lastMessage);
      }
    }
  }, [messages, ttsEnabled]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let assistantText: string;
      
      if (ttsEnabled) {
        // Use chat+tts endpoint
        const { text } = await askAndSpeak(messageText);
        assistantText = text;
      } else {
        // Use LLM-only endpoint when TTS is disabled
        const { text } = await askLLM(messageText);
        assistantText = text;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry — chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Chat Error',
        description: 'Failed to get response from assistant',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const currentTime = Date.now();
      
      // If Enter was pressed within 500ms of the last Enter, send the message
      if (currentTime - lastEnterTime < 500) {
        e.preventDefault();
        handleSend();
        setLastEnterTime(0);
      } else {
        // First Enter - just record the time and allow new line
        setLastEnterTime(currentTime);
      }
    } else {
      // Reset the timer if any other key is pressed
      setLastEnterTime(0);
    }
  };

  return (
    <div className="h-full flex flex-col lcars-card border-2 border-accent/30 bg-card p-4 relative z-10">
      {/* Chat Header */}
      <div className="flex-shrink-0 pb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">CHAT</h2>
        
        {/* TTS Toggle */}
        <div className="flex items-center gap-2 bg-accent/20 border border-accent/50 rounded-full px-4 py-2">
          <span className="text-sm font-medium text-primary">TTS</span>
          <span className={`text-xs font-bold ${ttsEnabled ? 'text-lcars-green' : 'text-lcars-red'}`}>
            {ttsEnabled ? 'ON' : 'OFF'}
          </span>
          <Switch
            checked={ttsEnabled}
            onCheckedChange={setTtsEnabled}
            className="data-[state=checked]:bg-lcars-green data-[state=unchecked]:bg-lcars-red"
          />
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 pr-4 scrollbar-hide" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Start a conversation...</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.sender === 'assistant' && (
                      <Button
                        onClick={() => handleSpeak(message)}
                        size="sm"
                        variant="ghost"
                        className="p-1 h-6 w-6 hover:bg-background/20 flex-shrink-0"
                        disabled={speakingMessageId !== null}
                      >
                        {speakingMessageId === message.id ? (
                          <VolumeX className="w-3 h-3" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          )}
          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 pt-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message... Hit enter once for a new line, hit enter twice to send"
            disabled={isLoading}
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="px-3 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
