
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface DiaryEntry {
  id: string;
  date: string;
  ts: string;
  text: string;
  image_path?: string;
  emotion?: string;
  tags: string;
}

const EMOTION_OPTIONS = [
  { value: "", label: "None" },
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
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemory, setNewMemory] = useState({
    text: "",
    kind: "semantic",
    tags: "",
    importance: 0.5,
    relevance: 0.5,
    image: "",
    emotion: ""
  });
  const [newDiary, setNewDiary] = useState({
    text: "",
    image: "",
    emotion: "",
    tags: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingMemory, setUploadingMemory] = useState(false);
  const [uploadingDiary, setUploadingDiary] = useState(false);
  
  const { searchMemories, learnMemory } = useZandaleeAPI();
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:3001';

  // Load initial memories and diary
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
          setNewDiary({ ...newDiary, image: result.path });
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
          emotion: newMemory.emotion || null
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
          emotion: ""
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
      const tags = newDiary.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      const response = await fetch(`${API_BASE}/diary/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newDiary.text,
          image: newDiary.image || null,
          emotion: newDiary.emotion || null,
          tags: tags
        })
      });

      const result = await response.json();
      if (result.ok) {
        // Reset form
        setNewDiary({
          text: "",
          image: "",
          emotion: "",
          tags: ""
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
    <Card className="glass-panel h-full flex flex-col">
      <CardHeader className="pb-1 px-3 pt-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-text-primary text-xs">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-energy-cyan" />
            <span>Memory & Diary</span>
          </div>
          <span className="text-[10px] text-text-muted">{memories.length} memories</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 pt-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="memories" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-2 flex-shrink-0">
            <TabsTrigger value="memories" className="text-xs">Memories</TabsTrigger>
            <TabsTrigger value="diary" className="text-xs">Diary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="memories" className="flex-1 flex flex-col min-h-0 mt-0">
            {/* Search */}
            <div className="flex gap-1 mb-2 flex-shrink-0">
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

            {/* Memory List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-2">
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
                        {memory.emotion && (
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

            {/* Add Memory Form */}
            <div className="bg-space-surface/20 border border-energy-cyan/30 rounded-md p-2 flex-shrink-0">
              <div className="text-xs text-energy-cyan mb-2 font-medium">Add Memory</div>
              
              <Textarea
                placeholder="What should I remember?"
                value={newMemory.text}
                onChange={(e) => setNewMemory({ ...newMemory, text: e.target.value })}
                className="h-16 text-xs mb-2 bg-space-surface/60 border-energy-cyan/30 resize-none"
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
                  <div className="text-[10px] text-text-muted mb-1">Kind</div>
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
                      <SelectItem value="event">Event</SelectItem>
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
          
          <TabsContent value="diary" className="flex-1 flex flex-col min-h-0 mt-0">
            {/* Diary List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-2">
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
                    {entry.image_path && (
                      <div className="mb-1">
                        <div className="flex items-center gap-1 text-[10px] text-energy-blue">
                          <Image className="w-3 h-3" />
                          <span>Photo attached</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 items-center">
                        {entry.tags && entry.tags.split(',').slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-energy-blue/30"
                          >
                            {tag.trim()}
                          </Badge>
                        ))}
                        {entry.emotion && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-energy-purple/30"
                          >
                            <Heart className="w-2 h-2 mr-1" />
                            {getEmotionEmoji(entry.emotion)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {new Date(entry.ts).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Diary Form */}
            <div className="bg-space-surface/20 border border-energy-cyan/30 rounded-md p-2 flex-shrink-0">
              <div className="text-xs text-energy-cyan mb-2 font-medium">Add Diary Entry</div>
              
              <Textarea
                placeholder="What happened today?"
                value={newDiary.text}
                onChange={(e) => setNewDiary({ ...newDiary, text: e.target.value })}
                className="h-16 text-xs mb-2 bg-space-surface/60 border-energy-cyan/30 resize-none"
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
                  {newDiary.image && (
                    <div className="flex items-center gap-1 text-[10px] text-energy-green">
                      <Image className="w-3 h-3" />
                      <span>Photo attached</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-[10px] text-text-muted mb-1">Emotion</div>
                  <Select
                    value={newDiary.emotion}
                    onValueChange={(value) => setNewDiary({ ...newDiary, emotion: value })}
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
                
                <div>
                  <div className="text-[10px] text-text-muted mb-1">Tags</div>
                  <Input
                    placeholder="tag1, tag2"
                    value={newDiary.tags}
                    onChange={(e) => setNewDiary({ ...newDiary, tags: e.target.value })}
                    className="h-6 text-xs bg-space-surface/60 border-energy-cyan/30"
                  />
                </div>
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
  );
};

export default MemoryManager;
