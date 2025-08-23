import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Plus, Brain, BookOpen, Upload, Image, Heart } from "lucide-react";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useToast } from "@/hooks/use-toast";

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

const MemoryManager = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
  
  const { searchMemories, learnMemory } = useZandaleeAPI();
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:8759';

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
      toast({
        title: "Error",
        description: "Failed to load memories",
        variant: "destructive"
      });
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
      toast({
        title: "Error",
        description: "Failed to load diary entries",
        variant: "destructive"
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/memory/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      const result = await response.json();
      if (result.ok) {
        setMemories(result.items || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: "Could not search memories",
        variant: "destructive"
      });
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
      toast({
        title: "Search Failed",
        description: "Could not search diary entries",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, isForDiary: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('for_diary', isForDiary.toString());

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
      
      const response = await fetch(`${API_BASE}/memory/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newMemory.text,
          kind: newMemory.kind,
          tags: tags,
          importance: newMemory.importance,
          relevance: newMemory.relevance,
          image: newMemory.image || null,
          emotion: newMemory.emotion === "none" ? null : newMemory.emotion
        })
      });

      const result = await response.json();
      if (result.ok) {
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
      } else {
        throw new Error(result.error || 'Failed to add memory');
      }
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
      
      const formData = new FormData();
      formData.append('text', newDiary.text);
      if (newDiary.photo_url) {
        formData.append('photo_url', newDiary.photo_url);
      }
      if (newDiary.emotion_tag && newDiary.emotion_tag !== "none") {
        formData.append('emotion_tag', newDiary.emotion_tag);
      }
      
      const response = await fetch(`${API_BASE}/diary/append`, {
        method: 'POST',
        body: formData
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

  return (
    <TooltipProvider>
      <Card className="glass-panel h-full flex flex-col">
      <CardHeader className="pb-2 px-3 pt-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-text-primary text-xs">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-energy-cyan" />
            <span>Memory & Diary</span>
          </div>
          <span className="text-[10px] text-text-muted">{memories.length} memories, {diaryEntries.length} entries</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 pt-1 min-h-0 pb-2">
        <Tabs defaultValue="memories" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-2 flex-shrink-0">
            <TabsTrigger value="memories" className="text-xs">Memories</TabsTrigger>
            <TabsTrigger value="diary" className="text-xs">Diary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="memories" className="flex-1 flex flex-col min-h-0 mt-0 space-y-2">
            {/* Search */}
            <div className="flex gap-1 flex-shrink-0">
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-8 text-xs bg-space-surface/60 border-energy-cyan/30"
              />
              <Button
                onClick={handleSearch}
                size="sm"
                className="h-8 w-8 p-0 bg-energy-cyan/20 hover:bg-energy-cyan/30"
                disabled={isLoading}
              >
                <Search className="w-3 h-3" />
              </Button>
            </div>

            {/* Memory List - Constrained height with scrolling */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2 pb-2">
                  {memories.length === 0 ? (
                    <div className="text-center text-text-muted text-xs py-4">
                      {isLoading ? "Loading..." : "No memories found"}
                    </div>
                  ) : (
                    memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="bg-space-surface/40 border border-energy-cyan/20 rounded-md p-2"
                      >
                        <div className="text-xs text-text-primary mb-1 line-clamp-2">
                          {memory.text}
                        </div>
                        {memory.image_path && (
                          <div className="mb-1">
                            <div className="flex items-center gap-1 text-[10px] text-energy-blue">
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
                                className="text-[10px] h-4 px-1 border-energy-blue/30"
                              >
                                {tag.trim()}
                              </Badge>
                            ))}
                            {memory.emotion && memory.emotion !== "none" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1 border-energy-purple/30"
                              >
                                <Heart className="w-2 h-2 mr-1" />
                                {getEmotionEmoji(memory.emotion)}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {memory.kind}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Add Memory Form - Fixed at bottom with proper spacing */}
            <div className="bg-space-surface/20 border border-energy-cyan/30 rounded-md p-2 flex-shrink-0">
              <div className="text-xs text-energy-cyan mb-2 font-medium">Add Memory</div>
              
              <Textarea
                placeholder="What should I remember?"
                value={newMemory.text}
                onChange={(e) => setNewMemory({ ...newMemory, text: e.target.value })}
                className="h-12 text-xs mb-2 bg-space-surface/60 border-energy-cyan/30 resize-none"
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
                    className="flex items-center gap-1 text-xs cursor-pointer text-energy-blue hover:text-energy-cyan"
                  >
                    <Upload className="w-3 h-3" />
                    {uploadingMemory ? "Uploading..." : "Add Photo"}
                  </label>
                  {newMemory.image && (
                    <div className="flex items-center gap-1 text-[10px] text-energy-green">
                      <Image className="w-3 h-3" />
                      <span>Photo attached</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-[10px] text-text-muted mb-1 cursor-help">Kind</div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      <div className="space-y-2">
                        <div><strong>Semantic:</strong> Long-term memory of general knowledge, facts, and concepts - your "encyclopedia" of the world.</div>
                        <div><strong>Episodic:</strong> Personal experiences with details of what, where, and when something happened.</div>
                        <div><strong>Procedural:</strong> How to do things - skills like riding a bike or typing (implicit memory).</div>
                        <div><strong>Working:</strong> Temporary mental scratchpad for immediate use, like remembering a phone number while dialing.</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <Select
                    value={newMemory.kind}
                    onValueChange={(value) => setNewMemory({ ...newMemory, kind: value })}
                  >
                    <SelectTrigger className="h-6 text-xs bg-space-surface/60">
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
                  <div className="text-[10px] text-text-muted mb-1">Emotion</div>
                  <Select
                    value={newMemory.emotion}
                    onValueChange={(value) => setNewMemory({ ...newMemory, emotion: value })}
                  >
                    <SelectTrigger className="h-6 text-xs bg-space-surface/60">
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
                <div className="text-[10px] text-text-muted mb-1">Tags</div>
                <Input
                  placeholder="tag1, tag2"
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                  className="h-6 text-xs bg-space-surface/60 border-energy-cyan/30"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-[10px] text-text-muted mb-1">
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
                  <div className="text-[10px] text-text-muted mb-1">
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
                className="w-full h-6 text-xs bg-energy-blue/20 hover:bg-energy-blue/30"
                disabled={isLoading || uploadingMemory}
              >
                <Plus className="w-3 h-3 mr-1" />
                Save Memory
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="diary" className="flex-1 flex flex-col min-h-0 mt-0 space-y-2">
            {/* Search */}
            <div className="flex gap-1 flex-shrink-0">
              <Input
                placeholder="Search diary entries..."
                value={diarySearchQuery}
                onChange={(e) => setDiarySearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiarySearch()}
                className="h-8 text-xs bg-space-surface/60 border-energy-cyan/30"
              />
              <Button
                onClick={handleDiarySearch}
                size="sm"
                className="h-8 w-8 p-0 bg-energy-cyan/20 hover:bg-energy-cyan/30"
                disabled={isLoading}
              >
                <Search className="w-3 h-3" />
              </Button>
            </div>

            {/* Diary List - Constrained height with scrolling */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2 pb-2">
                  {diaryEntries.length === 0 ? (
                    <div className="text-center text-text-muted text-xs py-4">
                      {isLoading ? "Loading..." : "No diary entries found"}
                    </div>
                  ) : (
                    diaryEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-space-surface/40 border border-energy-cyan/20 rounded-md p-2"
                      >
                        <div className="text-xs text-text-primary mb-1">
                          {entry.text}
                        </div>
                        {entry.photo_url && (
                          <div className="mb-1">
                            <div className="flex items-center gap-1 text-[10px] text-energy-blue">
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
                                className="text-[10px] h-4 px-1 border-energy-purple/30"
                              >
                                <Heart className="w-2 h-2 mr-1" />
                                {getEmotionEmoji(entry.emotion_tag)}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Add Diary Form - Fixed at bottom with proper spacing */}
            <div className="bg-space-surface/20 border border-energy-cyan/30 rounded-md p-2 flex-shrink-0">
              <div className="text-xs text-energy-cyan mb-2 font-medium">Add Diary Entry</div>
              
              <Textarea
                placeholder="What happened today?"
                value={newDiary.text}
                onChange={(e) => setNewDiary({ ...newDiary, text: e.target.value })}
                className="h-12 text-xs mb-2 bg-space-surface/60 border-energy-cyan/30 resize-none"
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
                    className="flex items-center gap-1 text-xs cursor-pointer text-energy-blue hover:text-energy-cyan"
                  >
                    <Upload className="w-3 h-3" />
                    {uploadingDiary ? "Uploading..." : "Add Photo"}
                  </label>
                  {newDiary.photo_url && (
                    <div className="flex items-center gap-1 text-[10px] text-energy-green">
                      <Image className="w-3 h-3" />
                      <span>Photo attached</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-[10px] text-text-muted mb-1">Emotion</div>
                <Select
                  value={newDiary.emotion_tag}
                  onValueChange={(value) => setNewDiary({ ...newDiary, emotion_tag: value })}
                >
                  <SelectTrigger className="h-6 text-xs bg-space-surface/60">
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
                className="w-full h-6 text-xs bg-energy-blue/20 hover:bg-energy-blue/30"
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
    </TooltipProvider>
  );
};

export default MemoryManager;
