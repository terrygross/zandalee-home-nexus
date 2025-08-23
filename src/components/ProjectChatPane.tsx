import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, User, Bot, MessageSquarePlus, Search, Download, Check, Paperclip } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useProjectChat } from '@/contexts/ProjectChatContext';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/types/projects';

export const ProjectChatPane = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speakBackEnabled, setSpeakBackEnabled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { chat, projects, getThreadMessages, addMessage, saveDraft, getDraft, clearDraft, createThread, setActiveThread } = useProjectChat();
  const { chat: gatewayChat, speak, isHealthy, getConfig } = useGateway();
  const { toast } = useToast();

  const activeProject = projects.list.find(p => p.id === projects.activeProjectId);
  const currentMessages = chat.activeThreadId ? getThreadMessages(chat.activeThreadId) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const MAX_ROWS = 8;
  
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    const padding = parseFloat(getComputedStyle(el).paddingTop || '0') + parseFloat(getComputedStyle(el).paddingBottom || '0');
    const border = parseFloat(getComputedStyle(el).borderTopWidth || '0') + parseFloat(getComputedStyle(el).borderBottomWidth || '0');
    const maxHeight = lineHeight * MAX_ROWS + padding + border;
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    
    el.style.height = newHeight + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const lastEnterTime = useRef<number>(0);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const currentTime = Date.now();
      const timeSinceLastEnter = currentTime - lastEnterTime.current;
      
      if (timeSinceLastEnter < 600 && lastEnterTime.current > 0) {
        // Double enter - send message
        e.preventDefault();
        handleSend();
        lastEnterTime.current = 0;
      } else {
        // Single enter - new line (let default behavior happen)
        lastEnterTime.current = currentTime;
      }
    }
  };

  // Load draft when thread changes
  useEffect(() => {
    if (chat.activeThreadId) {
      const draft = getDraft(chat.activeThreadId);
      setInput(draft);
    } else {
      setInput('');
    }
  }, [chat.activeThreadId, getDraft]);

  // Auto-save draft
  useEffect(() => {
    if (chat.activeThreadId && input !== getDraft(chat.activeThreadId)) {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      
      draftTimeoutRef.current = setTimeout(() => {
        saveDraft(chat.activeThreadId!, input);
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 1000);
      }, 2000);
    }
    
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [input, chat.activeThreadId, saveDraft, getDraft]);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  useEffect(() => {
    autoResize();
  }, [input]);

  const handleNewChat = async () => {
    try {
      const newThread = await createThread();
      setActiveThread(newThread.id);
      toast({
        title: "New Chat",
        description: "New conversation started"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    if (!chat.activeThreadId) return;
    
    const exportData = {
      threadId: chat.activeThreadId,
      projectName: activeProject?.name,
      messages: currentMessages,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat.activeThreadId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Chat Exported",
      description: "Chat history downloaded as JSON"
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !isHealthy) return;

    // Create thread if none exists
    let threadId = chat.activeThreadId;
    if (!threadId) {
      try {
        const newThread = await createThread();
        threadId = newThread.id;
        setActiveThread(threadId);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create chat thread",
          variant: "destructive"
        });
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      ts: new Date().toISOString()
    };

    addMessage(threadId, userMessage);
    const currentInput = input;
    setInput('');
    clearDraft(threadId);
    setIsProcessing(true);

    try {
      const config = await getConfig();
      const chatMessages = currentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      chatMessages.push({ role: 'user', content: currentInput });

      const response = await gatewayChat({
        model: config.model,
        messages: chatMessages,
        stream: false,
        max_tokens: 512,
        options: {
          temperature: 0.2,
          num_ctx: 8192
        }
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        ts: new Date().toISOString()
      };

      addMessage(threadId, assistantMessage);

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

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 2}`,
        role: 'system',
        content: `Error: ${error.message || 'Unknown error occurred'}`,
        ts: new Date().toISOString()
      };
      addMessage(threadId, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMessages = currentMessages.filter(msg => 
    !searchQuery || msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              Chat — {activeProject?.name || 'No Project'}
            </h2>
            {activeProject && (
              <Badge variant="secondary" className="text-xs">
                {activeProject.name}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="lcars-button bg-lcars-green"
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className={showSearch ? 'bg-accent' : ''}
            >
              <Search className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!chat.activeThreadId}
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="speak-back"
                checked={speakBackEnabled}
                onCheckedChange={setSpeakBackEnabled}
              />
              <Label htmlFor="speak-back" className="text-sm">TTS</Label>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {!chat.activeThreadId ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No conversation selected</p>
                <p className="text-sm">Start a new chat or select one from the history</p>
                <Button onClick={handleNewChat} className="mt-4 lcars-button bg-lcars-blue">
                  Start New Chat
                </Button>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No messages match your search' : 'No messages yet'}
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : message.role === 'system'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-accent text-accent-foreground'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : message.role === 'system' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-muted text-muted-foreground text-sm italic'
                        : 'bg-muted text-foreground'
                    }`}>
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 opacity-70 ${
                        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.ts).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        {chat.activeThreadId && (
          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message.. ( Hit enter once for new line or twice to send )"
                  className="min-h-[80px] resize-none pr-20"
                  disabled={isProcessing || !isHealthy}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {draftSaved && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Check className="w-3 h-3 mr-1" />
                      Saved
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0"
                    disabled
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing || !isHealthy}
                className="lcars-button bg-lcars-orange"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};