
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Send, Volume2, Star, Search, Plus, Upload, Calendar } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Memory {
  id?: string;
  text: string;
  kind: 'semantic' | 'episodic' | 'procedural' | 'working';
  tags?: string[];
  importance?: number;
  relevance?: number;
  emotion?: string;
  photo_path?: string;
  created_at?: string;
  source?: string;
}

interface DiaryEntry {
  id?: string;
  text: string;
  emotion?: string;
  photo_path?: string;
  created_at?: string;
  day?: string;
}

const emotions = [
  { value: '', label: 'None' },
  { value: 'happy', label: '😊 Happy' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'scared', label: '😨 Scared' },
  { value: 'excited', label: '🎉 Excited' }
];

export const ChatPane = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Memory & Diary state
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [rollupText, setRollupText] = useState('');

  // Memory form state
  const [memoryText, setMemoryText] = useState('');
  const [memoryKind, setMemoryKind] = useState<'semantic' | 'episodic' | 'procedural' | 'working'>('semantic');
  const [memoryEmotion, setMemoryEmotion] = useState('');
  const [memoryTags, setMemoryTags] = useState('');
  const [memoryImportance, setMemoryImportance] = useState([0.5]);
  const [memoryRelevance, setMemoryRelevance] = useState([0.5]);
  const [memoryPhoto, setMemoryPhoto] = useState<string | null>(null);

  // Diary form state
  const [diaryText, setDiaryText] = useState('');
  const [diaryEmotion, setDiaryEmotion] = useState('');
  const [diaryPhoto, setDiaryPhoto] = useState<string | null>(null);

  const { chat, speak, memoryLearn, memorySearch, diaryAppend, diaryRollup, upload, availableModels } = useGateway();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chat({
        model: availableModels[0] || 'qwen2.5-coder:32b',
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage.content }
        ],
        max_tokens: 2000,
        options: {
          temperature: 0.7,
          num_ctx: 4096
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response if enabled
      if (speakEnabled && response) {
        try {
          await speak({ text: response });
        } catch (error) {
          console.warn('Speech failed:', error);
        }
      }

    } catch (error: any) {
      toast({
        title: 'Chat Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAsMemory = async (message: Message) => {
    try {
      await memoryLearn({
        text: message.content,
        kind: 'semantic',
        importance: 0.5,
        relevance: 0.8,
        tags: ['chat'],
        source: 'chat'
      });

      toast({
        title: 'Memory saved',
        description: 'Message saved to memory',
      });
    } catch (error: any) {
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save to memory',
        variant: 'destructive'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Memory functions
  const handleMemorySearch = async () => {
    if (!searchQuery.trim()) return;
    
    setMemoryLoading(true);
    try {
      const results = await memorySearch(searchQuery, 20);
      if (Array.isArray(results)) {
        setMemories(results);
      } else if (results && typeof results === 'object' && 'results' in results) {
        setMemories((results as any).results || []);
      } else {
        setMemories([]);
      }
    } catch (error: any) {
      toast({
        title: 'Search Error',
        description: error.message || 'Failed to search memories',
        variant: 'destructive'
      });
      setMemories([]);
    } finally {
      setMemoryLoading(false);
    }
  };

  const handlePhotoUpload = async (files: FileList, target: 'memory' | 'diary') => {
    if (!files.length) return;
    
    try {
      const result = await upload(Array.from(files));
      const photoPath = result.files[0]?.path;
      
      if (target === 'memory') {
        setMemoryPhoto(photoPath);
      } else {
        setDiaryPhoto(photoPath);
      }
      
      toast({
        title: 'Photo uploaded',
        description: `Photo saved to ${photoPath}`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive'
      });
    }
  };

  const saveMemory = async () => {
    if (!memoryText.trim()) return;
    
    setMemoryLoading(true);
    try {
      const memory: Memory = {
        text: memoryText,
        kind: memoryKind,
        importance: memoryImportance[0],
        relevance: memoryRelevance[0],
        tags: memoryTags.split(',').map(tag => tag.trim()).filter(Boolean),
        emotion: memoryEmotion || undefined,
        photo_path: memoryPhoto || undefined,
        source: 'manual'
      };

      await memoryLearn(memory);
      
      toast({
        title: 'Memory saved',
        description: 'Memory has been successfully saved',
      });

      // Clear form
      setMemoryText('');
      setMemoryKind('semantic');
      setMemoryEmotion('');
      setMemoryTags('');
      setMemoryImportance([0.5]);
      setMemoryRelevance([0.5]);
      setMemoryPhoto(null);

      // Refresh search if there's a query
      if (searchQuery) {
        handleMemorySearch();
      }
    } catch (error: any) {
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save memory',
        variant: 'destructive'
      });
    } finally {
      setMemoryLoading(false);
    }
  };

  const saveDiaryEntry = async () => {
    if (!diaryText.trim()) return;
    
    setMemoryLoading(true);
    try {
      const entry = {
        text: diaryText,
        emotion: diaryEmotion || undefined,
        photo_path: diaryPhoto || undefined
      };

      const result = await diaryAppend(entry);
      
      toast({
        title: 'Diary entry saved',
        description: `Entry saved for ${result.day}`,
      });

      // Add to local list
      setDiaryEntries(prev => [{
        ...entry,
        id: result.id,
        day: result.day,
        created_at: new Date().toISOString()
      }, ...prev]);

      // Clear form
      setDiaryText('');
      setDiaryEmotion('');
      setDiaryPhoto(null);
    } catch (error: any) {
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save diary entry',
        variant: 'destructive'
      });
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleRollup = async (period: 'daily' | 'weekly' | 'monthly') => {
    setMemoryLoading(true);
    try {
      const result = await diaryRollup(period);
      setRollupText(result.text);
      
      toast({
        title: 'Rollup generated',
        description: `${period} summary created`,
      });
    } catch (error: any) {
      toast({
        title: 'Rollup Error',
        description: error.message || 'Failed to generate rollup',
        variant: 'destructive'
      });
    } finally {
      setMemoryLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] gap-4">
      {/* Chat Panel */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Chat</CardTitle>
            <div className="flex items-center space-x-2">
              <label htmlFor="speak-toggle" className="text-sm">
                Speak responses
              </label>
              <Switch
                id="speak-toggle"
                checked={speakEnabled}
                onCheckedChange={setSpeakEnabled}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Start a conversation with Zandalee
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveAsMemory(message)}
                              className="h-6 w-6 p-0"
                              title="Save as memory"
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                            {speakEnabled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => speak({ text: message.content })}
                                className="h-6 w-6 p-0"
                                title="Speak again"
                              >
                                <Volume2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 pt-4">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory & Diary Side Panel */}
      <Card className="w-96 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Memory & Diary</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <Tabs defaultValue="memories" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="memories">Memories</TabsTrigger>
              <TabsTrigger value="diary">Diary</TabsTrigger>
            </TabsList>

            <TabsContent value="memories" className="flex-1 space-y-4 overflow-hidden">
              {/* Memory Search */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleMemorySearch()}
                    placeholder="Search memories..."
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleMemorySearch} 
                    disabled={memoryLoading || !searchQuery.trim()}
                  >
                    <Search className="w-3 h-3" />
                  </Button>
                </div>

                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {memoryLoading ? (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : memories.length > 0 ? (
                      memories.map((memory, index) => (
                        <div key={memory.id || index} className="border rounded p-2 space-y-1">
                          <p className="text-xs">{memory.text}</p>
                          <div className="flex flex-wrap gap-1">
                            {memory.tags?.map((tag: string, tagIndex: number) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {memory.kind && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {memory.kind}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : searchQuery ? (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        No memories found
                      </div>
                    ) : (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        Search to find memories
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Add Memory Form */}
              <div className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-semibold">Add Memory</h4>
                
                <Textarea
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                  placeholder="What should I remember?"
                  className="text-sm min-h-[60px]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select value={memoryKind} onValueChange={(value: any) => setMemoryKind(value)}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semantic">Semantic</SelectItem>
                      <SelectItem value="episodic">Episodic</SelectItem>
                      <SelectItem value="procedural">Procedural</SelectItem>
                      <SelectItem value="working">Working</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={memoryEmotion} onValueChange={setMemoryEmotion}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder="Emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {emotions.map((emotion) => (
                        <SelectItem key={emotion.value || 'none'} value={emotion.value}>
                          {emotion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  value={memoryTags}
                  onChange={(e) => setMemoryTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="text-sm h-8"
                />

                <Button 
                  size="sm" 
                  onClick={saveMemory} 
                  disabled={!memoryText.trim() || memoryLoading}
                  className="w-full"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save Memory
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="diary" className="flex-1 space-y-4 overflow-hidden">
              {/* Add Diary Entry */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Add Diary Entry</h4>
                
                <Textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder="What happened today?"
                  className="text-sm min-h-[80px]"
                />

                <Select value={diaryEmotion} onValueChange={setDiaryEmotion}>
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="How are you feeling?" />
                  </SelectTrigger>
                  <SelectContent>
                    {emotions.map((emotion) => (
                      <SelectItem key={emotion.value || 'none'} value={emotion.value}>
                        {emotion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  size="sm" 
                  onClick={saveDiaryEntry} 
                  disabled={!diaryText.trim() || memoryLoading}
                  className="w-full"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save Entry
                </Button>
              </div>

              {/* Recent Entries */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-semibold">Recent Entries</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {diaryEntries.length > 0 ? (
                      diaryEntries.map((entry, index) => (
                        <div key={entry.id || index} className="border rounded p-2 space-y-1">
                          <p className="text-xs">{entry.text}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {entry.day && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-2 h-2" />
                                {entry.day}
                              </div>
                            )}
                            {entry.emotion && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {emotions.find(e => e.value === entry.emotion)?.label || entry.emotion}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        No diary entries yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Rollups */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-semibold">Rollups</h4>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollup('daily')}
                    disabled={memoryLoading}
                    className="text-xs flex-1"
                  >
                    Daily
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollup('weekly')}
                    disabled={memoryLoading}
                    className="text-xs flex-1"
                  >
                    Weekly
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollup('monthly')}
                    disabled={memoryLoading}
                    className="text-xs flex-1"
                  >
                    Monthly
                  </Button>
                </div>

                {rollupText && (
                  <ScrollArea className="h-20">
                    <div className="border rounded p-2 bg-muted/50">
                      <pre className="whitespace-pre-wrap text-xs">{rollupText}</pre>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
