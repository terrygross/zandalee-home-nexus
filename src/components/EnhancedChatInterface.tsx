import { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Terminal, Star, Zap, Settings, Plus, Search, Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useGateway } from "@/hooks/useGateway";
import { useDirectLLM } from "@/hooks/useDirectLLM";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { ProjectsSidebar } from "./ProjectsSidebar";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import VoiceInput from "./VoiceInput";
import { ChatMessage as ProjectChatMessage } from "@/types/projects";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const EnhancedChatInterface = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speakBackEnabled, setSpeakBackEnabled] = useState(true);
  const [useDirectLLMMode, setUseDirectLLMMode] = useState(false);
  const [showProjectsSidebar, setShowProjectsSidebar] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastEnterTime = useRef<number>(0);
  const autosaveTimer = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();

  const { 
    isHealthy,
    chat: gatewayChat,
    speak,
    memoryLearn
  } = useGateway();

  const { sendMessage: sendDirectMessage, activeProvider, isConfigured } = useDirectLLM();
  
  const {
    projects,
    activeProjectId,
    activeThreadId,
    messages,
    createThread,
    listMessages,
    sendMessage,
    saveDraft,
    loadDraft,
    clearDraft,
    setActiveThreadId
  } = useProjects();

  // Get current thread messages
  const currentMessages = activeThreadId ? messages[activeThreadId] || [] : [];
  
  // Convert to display format
  const displayMessages: Message[] = currentMessages.map(msg => ({
    id: msg.id,
    role: msg.role === 'system' ? 'system' : msg.role,
    content: msg.content,
    timestamp: new Date(msg.ts)
  }));

  const activeProject = projects.find(p => p.id === activeProjectId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  // Load draft when thread changes
  useEffect(() => {
    if (activeThreadId) {
      const draft = loadDraft(activeThreadId);
      setInput(draft);
      
      // Load messages for active thread
      if (activeProjectId && activeThreadId) {
        listMessages(activeProjectId, activeThreadId);
      }
    }
  }, [activeThreadId, activeProjectId]);

  // Create first thread if none exists
  useEffect(() => {
    if (activeProjectId && !activeThreadId) {
      createThread(activeProjectId, "General Conversation");
    }
  }, [activeProjectId, activeThreadId]);

  // Autosave draft
  const autosaveDraft = useCallback(() => {
    if (activeThreadId && input.trim()) {
      saveDraft(activeThreadId, input);
      setLastSaveTime(Date.now());
    }
  }, [activeThreadId, input, saveDraft]);

  // Setup autosave timer
  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    if (input.trim() && activeThreadId) {
      autosaveTimer.current = setTimeout(autosaveDraft, 2000);
    }

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [input, autosaveDraft]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !activeProjectId || !activeThreadId) return;

    const userContent = input.trim();
    setInput('');
    setIsProcessing(true);

    // Clear draft since message is being sent
    clearDraft(activeThreadId);

    try {
      // Send user message to project
      await sendMessage(activeProjectId, activeThreadId, 'user', userContent);

      let responseContent: string;

      if (useDirectLLMMode) {
        if (!isConfigured) {
          throw new Error(`No API key configured for ${activeProvider}. Please configure in settings.`);
        }

        const chatMessages = currentMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
        
        chatMessages.push({ role: 'user', content: userContent });
        responseContent = await sendDirectMessage(chatMessages);
      } else {
        // Use gateway chat
        if (!isHealthy) {
          throw new Error('Gateway not healthy. Check connection at http://127.0.0.1:11500');
        }

        const chatMessages = currentMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          }));
        
        chatMessages.push({ role: 'user', content: userContent });
        
        responseContent = await gatewayChat({
          messages: chatMessages,
          stream: false,
          max_tokens: 512,
          options: {
            temperature: 0.2,
            num_ctx: 8192
          }
        });
      }

      // Send assistant response to project
      await sendMessage(activeProjectId, activeThreadId, 'assistant', responseContent);
      
      // Trigger TTS if enabled and using gateway
      if (speakBackEnabled && !useDirectLLMMode) {
        try {
          await speak({ text: responseContent });
        } catch (error) {
          console.warn('TTS failed:', error);
        }
      }
    } catch (error) {
      // Log error (system messages not supported in sendMessage API)
      console.error('Chat error:', error);
      
      // Create a system message for display only
      const errorMessage: ProjectChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        ts: new Date().toISOString(),
        authorFamilyName: 'system'
      };
      
      toast({
        title: "Chat Error",
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
    if (useDirectLLMMode) {
      toast({
        title: "Memory Save Unavailable",
        description: "Memory saving is only available in Gateway mode",
        variant: "destructive"
      });
      return;
    }

    try {
      await memoryLearn({
        text: messageContent,
        kind: 'semantic',
        importance: 0.5,
        relevance: 0.8,
        tags: ['chat'],
        source: 'chat'
      });
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

  const handleNewChat = async () => {
    if (!activeProjectId) return;
    
    try {
      await createThread(activeProjectId, "New Conversation");
      toast({
        title: "New Chat",
        description: "Started a new conversation",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    if (!activeThreadId || !activeProjectId) return;

    try {
      // Mock export - create JSON blob
      const exportData = {
        project: activeProject?.name,
        thread: activeThreadId,
        messages: currentMessages,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${activeThreadId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Chat history has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export chat history",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            'bg-energy-blue/20 text-energy-blue'
          }`}>
            {isUser ? <User className="w-4 h-4" /> :
             isSystem ? <Terminal className="w-4 h-4" /> :
             <Bot className="w-4 h-4" />}
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
              
              {isAssistant && !useDirectLLMMode && (
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
      <div className="p-4 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary">
                  Chat
                </h3>
                {activeProject && (
                  <Badge variant="secondary" className="text-xs">
                    {activeProject.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary">
                Enhanced chat with projects and history
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <ProjectsSidebar 
                isOpen={showProjectsSidebar}
                onOpenChange={setShowProjectsSidebar}
              />
              
              <ChatHistoryPanel
                isOpen={showHistoryPanel}
                onOpenChange={setShowHistoryPanel}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearchBox(!showSearchBox)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Find
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="gap-2"
                disabled={!activeThreadId}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="direct-llm"
                checked={useDirectLLMMode}
                onCheckedChange={setUseDirectLLMMode}
              />
              <Label htmlFor="direct-llm" className="text-xs flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Direct LLM</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="speak-back"
                checked={speakBackEnabled}
                onCheckedChange={setSpeakBackEnabled}
                disabled={useDirectLLMMode}
              />
              <Label htmlFor="speak-back" className="text-xs">Speak Back</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                useDirectLLMMode 
                  ? (isConfigured ? 'bg-energy-cyan animate-pulse' : 'bg-status-warning')
                  : (isHealthy ? 'bg-status-success animate-pulse' : 'bg-status-error')
              }`} />
              <span className="text-xs text-text-muted">
                {useDirectLLMMode 
                  ? (isConfigured ? `${activeProvider.toUpperCase()} Ready` : 'Not Configured')
                  : (isHealthy ? 'Gateway Connected' : 'Gateway Offline')
                }
              </span>
            </div>
          </div>
        </div>
        
        {showSearchBox && (
          <div className="mt-3">
            <Input
              placeholder="Search in current thread..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {displayMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                useDirectLLMMode ? 'bg-energy-cyan/20 text-energy-cyan' : 'bg-energy-blue/20 text-energy-blue'
              }`}>
                {useDirectLLMMode ? <Zap className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
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

      <div className="p-4 border-t border-border/30 flex-shrink-0">
        <div className="flex space-x-2 items-start">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message.. ( Hit enter once for new line or twice to send )"
            className="flex-1 bg-space-surface border-glass-border text-text-primary placeholder-text-muted resize-none !h-[100px] !min-h-[100px] !max-h-[100px]"
            disabled={isProcessing || (!isHealthy && !useDirectLLMMode) || (useDirectLLMMode && !isConfigured) || !activeThreadId}
          />
          <div className="flex flex-col space-y-2 justify-end h-[100px]">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              disabled={isProcessing}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={isProcessing || (!isHealthy && !useDirectLLMMode) || (useDirectLLMMode && !isConfigured) || !activeThreadId}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing || (!isHealthy && !useDirectLLMMode) || (useDirectLLMMode && !isConfigured) || !activeThreadId}
              className="bg-energy-cyan/20 hover:bg-energy-cyan/30 text-energy-cyan border border-energy-cyan/30 neon-border"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-text-muted">
          <span>
            {useDirectLLMMode 
              ? `Direct mode: ${activeProvider.toUpperCase()} • Configure API key in settings ⚙️`
              : `Gateway mode • Gateway health: ${isHealthy ? '✅' : '❌'} • Click ⭐ to save responses`
            }
          </span>
          <div className="flex items-center gap-2">
            {lastSaveTime > 0 && Date.now() - lastSaveTime < 3000 && (
              <span className="text-green-500">✓ Saved</span>
            )}
            <span>Press Enter twice to send • Single Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatInterface;