
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, User, Bot, Star } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatPane = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speakBackEnabled, setSpeakBackEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chat, speak, memoryLearn, isHealthy, getConfig } = useGateway();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !isHealthy) return;

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
      const config = await getConfig();
      const chatMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      chatMessages.push({ role: 'user', content: currentInput });

      const response = await chat({
        model: config.model,
        messages: chatMessages,
        stream: false,
        max_tokens: 512,
        options: {
          temperature: 0.2,
          num_ctx: 8192
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak back if enabled
      if (speakBackEnabled) {
        try {
          const selectedVoice = localStorage.getItem('selected_voice');
          await speak({
            text: response,
            voice: selectedVoice || undefined,
            rate: 0,
            volume: 100
          });
        } catch (error) {
          console.warn('TTS failed:', error);
        }
      }

    } catch (error: any) {
      toast({
        title: 'Chat Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error.message || 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAsMemory = async (content: string) => {
    try {
      await memoryLearn({
        text: content,
        kind: 'semantic',
        importance: 0.5,
        relevance: 0.8,
        tags: ['chat'],
        source: 'chat'
      });
      
      toast({
        title: 'Memory Saved',
        description: 'Message saved to memory successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Memory Error',
        description: error.message || 'Failed to save memory',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chat</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              id="speak-back"
              checked={speakBackEnabled}
              onCheckedChange={setSpeakBackEnabled}
            />
            <Label htmlFor="speak-back">Speak Back</Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`rounded-lg p-3 ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    
                    {message.role === 'assistant' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveAsMemory(message.content)}
                        className="h-6 px-2"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-150" />
                    <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={isProcessing || !isHealthy}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !isHealthy}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
