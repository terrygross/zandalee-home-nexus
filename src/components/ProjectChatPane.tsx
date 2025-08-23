import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Send, User, Bot, MessageSquarePlus, Search, Download, Check, Paperclip, Star, Plus, Brain, BookOpen, Upload, Image, Heart, HelpCircle, MoreHorizontal, Pin, Archive, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useGateway } from '@/hooks/useGateway';
import { useProjectChat } from '@/contexts/ProjectChatContext';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/types/projects';

interface MemoryItem {
  id: string;
  text: string;
  kind: string;
  tags: string;
  importance: number;
  relevance: number;
  image_path?: string;
  emotion?: string;
  created_at: string;
  source: string;
  trust: string;
}

interface DiaryEntryItem {
  id: string;
  text: string;
  photo_url?: string;
  emotion_tag?: string;
  created_at: string;
}

const EMOTION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "happy", label: "😊 Happy" },
  { value: "proud", label: "🌟 Proud" },
  { value: "excited", label: "🎉 Excited" },
  { value: "calm", label: "😌 Calm" },
  { value: "sad", label: "😢 Sad" },
  { value: "worried", label: "😟 Worried" },
  { value: "angry", label: "😠 Angry" },
  { value: "relief", label: "😮‍💨 Relief" }
];

export const ProjectChatPane = () => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speakBackEnabled, setSpeakBackEnabled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Memory & Diary state
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryItem[]>([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [diarySearchQuery, setDiarySearchQuery] = useState("");
  const [newMemory, setNewMemory] = useState({
    text: "",
    kind: "semantic",
    tags: "",
    importance: 0.5,
    relevance: 0.5,
    image: "",
    emotion: "none"
  });
  const [newDiary, setNewDiary] = useState({
    text: "",
    photo_url: "",
    emotion_tag: "none"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingMemory, setUploadingMemory] = useState(false);
  const [uploadingDiary, setUploadingDiary] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { chat, projects, getThreadMessages, addMessage, saveDraft, getDraft, clearDraft, createThread, setActiveThread, pinThread, archiveThread, deleteThread } = useProjectChat();
  const { chat: gatewayChat, speak, memoryLearn, memorySearch, isHealthy, getConfig } = useGateway();
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

  const activeProject = projects.list.find(p => p.id === projects.activeProjectId);
  const activeThread = chat.threads.find(t => t.id === chat.activeThreadId);
  const currentMessages = chat.activeThreadId ? getThreadMessages(chat.activeThreadId) : [];

  const scrollToBottom = () => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      messagesContainer.scrollTo({ 
        top: messagesContainer.scrollHeight, 
        behavior: 'smooth' 
      });
    }
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

  useEffect(() => {
    loadMemories();
    loadDiary();
  }, []);

  const loadMemories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/memory/search?limit=20`);
      const result = await response.json();
      if (result.ok) {
        setMemories(result.items || []);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiary = async () => {
    try {
      const response = await fetch(`${API_BASE}/diary/list?limit=20`);
      const result = await response.json();
      if (result.ok) {
        setDiaryEntries(result.items || []);
      }
    } catch (error) {
      console.error('Failed to load diary:', error);
    }
  };

  const handleMemorySearch = async () => {
    if (!memorySearchQuery.trim()) {
      loadMemories();
      return;
    }

    try {
      setIsLoading(true);
      const results = await memorySearch(memorySearchQuery, 20);
      setMemories(results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiarySearch = async () => {
    if (!diarySearchQuery.trim()) {
      loadDiary();
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/diary/search?q=${encodeURIComponent(diarySearchQuery)}&limit=20`);
      const result = await response.json();
      if (result.ok) {
        setDiaryEntries(result.items || []);
      }
    } catch (error) {
      console.error('Diary search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, isForDiary: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);

    if (isForDiary) {
      setUploadingDiary(true);
    } else {
      setUploadingMemory(true);
    }

    try {
      const response = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.ok) {
        if (isForDiary) {
          setNewDiary({ ...newDiary, photo_url: result.url });
        } else {
          setNewMemory({ ...newMemory, image: result.path });
        }
        toast({
          title: "Image Uploaded",
          description: "Photo attached successfully",
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload image",
        variant: "destructive"
      });
    } finally {
      if (isForDiary) {
        setUploadingDiary(false);
      } else {
        setUploadingMemory(false);
      }
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.text.trim()) {
      toast({
        title: "Invalid Memory",
        description: "Memory text cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const tags = newMemory.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      await memoryLearn({
        text: newMemory.text,
        kind: newMemory.kind as 'semantic' | 'episodic' | 'procedural' | 'working',
        tags: tags,
        importance: newMemory.importance,
        relevance: newMemory.relevance,
        source: 'chat'
      });

      // Reset form
      setNewMemory({
        text: "",
        kind: "semantic",
        tags: "",
        importance: 0.5,
        relevance: 0.5,
        image: "",
        emotion: "none"
      });

      // Reload memories
      await loadMemories();

      toast({
        title: "Memory Added",
        description: "New memory has been stored",
      });
    } catch (error) {
      console.error('Failed to add memory:', error);
      toast({
        title: "Error",
        description: "Failed to add memory",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDiary = async () => {
    if (!newDiary.text.trim()) {
      toast({
        title: "Invalid Entry",
        description: "Diary text cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE}/diary/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newDiary.text,
          photo_url: newDiary.photo_url || null,
          emotion_tag: newDiary.emotion_tag === "none" ? null : newDiary.emotion_tag
        })
      });

      const result = await response.json();
      if (result.ok) {
        // Reset form
        setNewDiary({
          text: "",
          photo_url: "",
          emotion_tag: "none"
        });

        // Reload diary
        await loadDiary();

        toast({
          title: "Diary Entry Added",
          description: "New diary entry has been saved",
        });
      } else {
        throw new Error(result.error || 'Failed to add diary entry');
      }
    } catch (error) {
      console.error('Failed to add diary entry:', error);
      toast({
        title: "Error",
        description: "Failed to add diary entry",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    const found = EMOTION_OPTIONS.find(opt => opt.value === emotion);
    return found ? found.label : emotion;
  };

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
      
      // Refresh memories list
      await loadMemories();
    } catch (error: any) {
      toast({
        title: 'Memory Error',
        description: error.message || 'Failed to save memory',
        variant: 'destructive'
      });
    }
  };

  const filteredMessages = currentMessages.filter(msg => 
    !searchQuery || msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* Chat Section */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              Chat — {activeProject?.name || 'No Project'}
              {activeProject && (
                <Badge variant="secondary" className="text-xs">
                  {activeProject.name}
                </Badge>
              )}
              {activeThread && (
                <Badge variant="outline" className="text-xs">
                  {activeThread.title || 'Untitled Chat'}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Current Thread Actions */}
              {activeThread && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => pinThread(activeThread.id, !activeThread.pinned)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {activeThread.pinned ? 'Unpin' : 'Pin'} Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archiveThread(activeThread.id, !activeThread.archived)}>
                      <Archive className="w-4 h-4 mr-2" />
                      {activeThread.archived ? 'Unarchive' : 'Archive'} Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Chat
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this conversation? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteThread(activeThread.id);
                              setActiveThread(null);
                            }}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
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
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 p-6">
          {/* Search Bar */}
          {showSearch && (
            <div className="mb-4">
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

          {/* Messages area with proper flex and overflow */}
          <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 mb-4 min-h-0 no-anchor">
            {!chat.activeThreadId ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No conversation selected</p>
                <p className="text-sm">Start a new chat or select one from the history</p>
                <Button onClick={handleNewChat} className="mt-4 lcars-button bg-lcars-blue">
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            ) : (
              <>
                {filteredMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : message.role === 'system'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'Assistant'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-8' 
                          : message.role === 'system'
                          ? 'bg-destructive/10 text-destructive ml-8'
                          : 'bg-secondary text-secondary-foreground ml-8'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        {message.role === 'assistant' && (
                          <div className="flex gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleSaveAsMemory(message.content)}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Save as Memory
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-muted-foreground">Assistant</span>
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
          
          {/* Input area - fixed at bottom with proper spacing */}
          {chat.activeThreadId && (
            <div className="flex-shrink-0 flex space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message.. ( Hit enter once for new line or twice to send )"
                  rows={4}
                  className="flex-1 text-sm resize-none overflow-y-hidden pr-20"
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
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory & Diary Side Panel - STICKY on desktop */}
      <Card className="w-full lg:w-80 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] flex flex-col min-h-[400px]">
        <CardHeader className="pb-3 px-6 pt-6 flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span>Memory & Diary</span>
            </div>
            <span className="text-xs text-muted-foreground">{memories.length} memories, {diaryEntries.length} entries</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-6 pt-0 pb-6 min-h-0">
          <Tabs defaultValue="memories" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 h-8 mb-2 flex-shrink-0 bg-muted/50">
              <TabsTrigger value="memories" className="text-xs bg-lcars-blue text-black data-[state=active]:bg-lcars-orange">Memories</TabsTrigger>
              <TabsTrigger value="diary" className="text-xs">Diary</TabsTrigger>
            </TabsList>
            
            <TabsContent value="memories" className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Search */}
              <div className="flex gap-1 mb-2 flex-shrink-0">
                <Input
                  placeholder="Search memories..."
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMemorySearch()}
                  className="h-8 text-xs"
                />
                <Button
                  onClick={handleMemorySearch}
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isLoading}
                >
                  <Search className="w-3 h-3" />
                </Button>
              </div>

              {/* Memory List with fixed height */}
              <div className="flex-1 min-h-0 mb-2 flex flex-col">
                <ScrollArea className="flex-1 h-64">
                  <div className="space-y-2 pr-2">
                    {memories.length === 0 ? (
                      <div className="text-center text-muted-foreground text-xs py-4">
                        {isLoading ? "Loading..." : "No memories found"}
                      </div>
                    ) : (
                      memories.map((memory) => (
                        <div
                          key={memory.id}
                          className="border rounded-md p-2"
                        >
                          <div className="text-xs mb-1 line-clamp-2">
                            {memory.text}
                          </div>
                          {memory.image_path && (
                            <div className="mb-1">
                              <div className="flex items-center gap-1 text-[10px] text-primary">
                                <Image className="w-3 h-3" />
                                <span>Photo attached</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 items-center">
                              {memory.tags && memory.tags.split(',').slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {tag.trim()}
                                </Badge>
                              ))}
                              {memory.emotion && memory.emotion !== "none" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  <Heart className="w-2 h-2 mr-1" />
                                  {getEmotionEmoji(memory.emotion)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {memory.kind}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Add Memory Form - fixed at bottom with guaranteed space */}
              <div className="border rounded-md p-2 flex-shrink-0 bg-background">
                <div className="text-xs font-medium mb-2">Add Memory</div>
                
                <Textarea
                  placeholder="What should I remember?"
                  value={newMemory.text}
                  onChange={(e) => setNewMemory({ ...newMemory, text: e.target.value })}
                  className="h-16 text-xs mb-2 resize-none"
                />
                
                {/* Image Upload */}
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      className="hidden"
                      id="memory-image-upload"
                    />
                    <label
                      htmlFor="memory-image-upload"
                      className="flex items-center gap-1 text-xs cursor-pointer text-primary hover:text-primary/80"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingMemory ? "Uploading..." : "Add Photo"}
                    </label>
                    {newMemory.image && (
                      <div className="flex items-center gap-1 text-[10px] text-green-600">
                        <Image className="w-3 h-3" />
                        <span>Photo attached</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-muted-foreground">Kind</span>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-muted-foreground hover:text-primary cursor-help"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-xs z-[100]" side="left" align="start">
                          <div className="space-y-2">
                            <div><strong>Semantic:</strong> Long-term memory store of general knowledge, facts, concepts, and meanings. It's essentially our "encyclopedia" of the world, holding information that's not tied to specific personal experiences.</div>
                            <div><strong>Episodic:</strong> The ability to recall personal experiences, including details of what happened, where it happened, and when it happened. It's a type of explicit or declarative memory, meaning that these memories are consciously retrieved and include contextual information like emotions associated with the event.</div>
                            <div><strong>Procedural:</strong> A type of long-term memory that stores information about how to do things, like riding a bike or typing. It's considered implicit memory, meaning it doesn't require conscious effort to access and use these skills.</div>
                            <div><strong>Working:</strong> A cognitive system that allows you to temporarily hold and manipulate information in your mind for immediate use, like remembering a phone number while dialing or following instructions while performing a task. It's often described as a mental scratchpad where you process and use information actively.</div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <Select
                      value={newMemory.kind}
                      onValueChange={(value) => setNewMemory({ ...newMemory, kind: value })}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semantic">Semantic</SelectItem>
                        <SelectItem value="episodic">Episodic</SelectItem>
                        <SelectItem value="procedural">Procedural</SelectItem>
                        <SelectItem value="working">Working</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Emotion</div>
                    <Select
                      value={newMemory.emotion}
                      onValueChange={(value) => setNewMemory({ ...newMemory, emotion: value })}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMOTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Tags</div>
                  <Input
                    placeholder="tag1, tag2"
                    value={newMemory.tags}
                    onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                    className="h-6 text-xs"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">
                      Importance: {newMemory.importance.toFixed(1)}
                    </div>
                    <Slider
                      value={[newMemory.importance]}
                      onValueChange={([value]) => setNewMemory({ ...newMemory, importance: value })}
                      max={1}
                      min={0}
                      step={0.1}
                      className="h-4"
                    />
                  </div>
                  
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">
                      Relevance: {newMemory.relevance.toFixed(1)}
                    </div>
                    <Slider
                      value={[newMemory.relevance]}
                      onValueChange={([value]) => setNewMemory({ ...newMemory, relevance: value })}
                      max={1}
                      min={0}
                      step={0.1}
                      className="h-4"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={handleAddMemory}
                  className="w-full h-6 text-xs"
                  disabled={isLoading || uploadingMemory}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save Memory
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="diary" className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Search */}
              <div className="flex gap-1 mb-2 flex-shrink-0">
                <Input
                  placeholder="Search diary entries..."
                  value={diarySearchQuery}
                  onChange={(e) => setDiarySearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDiarySearch()}
                  className="h-8 text-xs"
                />
                <Button
                  onClick={handleDiarySearch}
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isLoading}
                >
                  <Search className="w-3 h-3" />
                </Button>
              </div>

              {/* Diary List with fixed height */}
              <div className="flex-1 min-h-0 mb-2 flex flex-col">
                <ScrollArea className="flex-1 h-64">
                  <div className="space-y-2 pr-2">
                    {diaryEntries.length === 0 ? (
                      <div className="text-center text-muted-foreground text-xs py-4">
                        {isLoading ? "Loading..." : "No diary entries found"}
                      </div>
                    ) : (
                      diaryEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="border rounded-md p-2"
                        >
                          <div className="text-xs mb-1">
                            {entry.text}
                          </div>
                          {entry.photo_url && (
                            <div className="mb-1">
                              <div className="flex items-center gap-1 text-[10px] text-primary">
                                <Image className="w-3 h-3" />
                                <span>Photo attached</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 items-center">
                              {entry.emotion_tag && entry.emotion_tag !== "none" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  <Heart className="w-2 h-2 mr-1" />
                                  {getEmotionEmoji(entry.emotion_tag)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Add Diary Form - fixed at bottom with guaranteed space */}
              <div className="border rounded-md p-2 flex-shrink-0 bg-background">
                <div className="text-xs font-medium mb-2">Add Diary Entry</div>
                
                <Textarea
                  placeholder="What happened today?"
                  value={newDiary.text}
                  onChange={(e) => setNewDiary({ ...newDiary, text: e.target.value })}
                  className="h-16 text-xs mb-2 resize-none"
                />
                
                {/* Image Upload */}
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                      className="hidden"
                      id="diary-image-upload"
                    />
                    <label
                      htmlFor="diary-image-upload"
                      className="flex items-center gap-1 text-xs cursor-pointer text-primary hover:text-primary/80"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingDiary ? "Uploading..." : "Add Photo"}
                    </label>
                    {newDiary.photo_url && (
                      <div className="flex items-center gap-1 text-[10px] text-green-600">
                        <Image className="w-3 h-3" />
                        <span>Photo attached</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Emotion</div>
                  <Select
                    value={newDiary.emotion_tag}
                    onValueChange={(value) => setNewDiary({ ...newDiary, emotion_tag: value })}
                  >
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleAddDiary}
                  className="w-full h-6 text-xs"
                  disabled={isLoading || uploadingDiary}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Save Entry
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};