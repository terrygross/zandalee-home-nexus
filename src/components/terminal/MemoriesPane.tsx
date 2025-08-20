import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Upload, Star, Calendar } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

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
  { value: 'happy', label: '😊 Happy' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'scared', label: '😨 Scared' },
  { value: 'excited', label: '🎉 Excited' }
];

const memoryKinds = [
  { value: 'semantic', label: 'Semantic' },
  { value: 'episodic', label: 'Episodic' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'working', label: 'Working' }
];

export const MemoriesPane = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
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

  const { memorySearch, memoryLearn, diaryAppend, diaryRollup, upload } = useGateway();
  const { toast } = useToast();

  const handleMemorySearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await memorySearch(searchQuery, 20);
      // Handle both array and object responses properly
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
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMemorySearch();
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
    
    setLoading(true);
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
      setLoading(false);
    }
  };

  const saveDiaryEntry = async () => {
    if (!diaryText.trim()) return;
    
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleRollup = async (period: 'daily' | 'weekly' | 'monthly') => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memories & Diary</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="memories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="memories">Memories</TabsTrigger>
            <TabsTrigger value="diary">Diary</TabsTrigger>
          </TabsList>

          <TabsContent value="memories" className="space-y-6">
            {/* Memory Search */}
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search memories..."
                />
                <Button onClick={handleMemorySearch} disabled={loading || !searchQuery.trim()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Searching...
                  </div>
                ) : memories.length > 0 ? (
                  memories.map((memory, index) => (
                    <div key={memory.id || index} className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm">{memory.text}</p>
                      <div className="flex flex-wrap gap-1">
                        {memory.tags?.map((tag: string, tagIndex: number) => (
                          <Badge key={tagIndex} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {memory.kind && (
                          <Badge variant="outline" className="text-xs">
                            {memory.kind}
                          </Badge>
                        )}
                        {memory.emotion && (
                          <Badge variant="outline" className="text-xs">
                            {emotions.find(e => e.value === memory.emotion)?.label || memory.emotion}
                          </Badge>
                        )}
                      </div>
                      {memory.source && (
                        <p className="text-xs text-muted-foreground">
                          Source: {memory.source}
                        </p>
                      )}
                      {memory.photo_path && (
                        <p className="text-xs text-muted-foreground">
                          📷 Photo attached
                        </p>
                      )}
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No memories found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Enter a search query to find memories
                  </div>
                )}
              </div>
            </div>

            {/* Add Memory */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Add Memory</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">What should I remember?</label>
                  <Textarea
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    placeholder="Enter the memory text..."
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Kind</label>
                    <Select value={memoryKind} onValueChange={(value: any) => setMemoryKind(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {memoryKinds.map((kind) => (
                          <SelectItem key={kind.value} value={kind.value}>
                            {kind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Emotion</label>
                    <Select value={memoryEmotion || undefined} onValueChange={setMemoryEmotion}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select emotion" />
                      </SelectTrigger>
                      <SelectContent>
                        {emotions.map((emotion) => (
                          <SelectItem key={emotion.value} value={emotion.value}>
                            {emotion.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={memoryTags}
                    onChange={(e) => setMemoryTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Importance: {memoryImportance[0]}</label>
                    <Slider
                      value={memoryImportance}
                      onValueChange={setMemoryImportance}
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Relevance: {memoryRelevance[0]}</label>
                    <Slider
                      value={memoryRelevance}
                      onValueChange={setMemoryRelevance}
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Add Photo</label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handlePhotoUpload(e.target.files, 'memory')}
                      className="hidden"
                      id="memory-photo"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('memory-photo')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    {memoryPhoto && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Photo: {memoryPhoto}
                      </p>
                    )}
                  </div>
                </div>

                <Button onClick={saveMemory} disabled={!memoryText.trim() || loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Memory
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="diary" className="space-y-6">
            {/* Add Diary Entry */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add Diary Entry</h3>
              
              <div>
                <Textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder="What happened today?"
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Emotion</label>
                  <Select value={diaryEmotion || undefined} onValueChange={setDiaryEmotion}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="How are you feeling?" />
                    </SelectTrigger>
                    <SelectContent>
                      {emotions.map((emotion) => (
                        <SelectItem key={emotion.value} value={emotion.value}>
                          {emotion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Add Photo</label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handlePhotoUpload(e.target.files, 'diary')}
                      className="hidden"
                      id="diary-photo"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('diary-photo')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    {diaryPhoto && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Photo: {diaryPhoto}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={saveDiaryEntry} disabled={!diaryText.trim() || loading}>
                <Plus className="w-4 h-4 mr-2" />
                Save Entry
              </Button>
            </div>

            {/* Diary Entries */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {diaryEntries.length > 0 ? (
                  diaryEntries.map((entry, index) => (
                    <div key={entry.id || index} className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm">{entry.text}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {entry.day && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {entry.day}
                          </div>
                        )}
                        {entry.emotion && (
                          <Badge variant="outline" className="text-xs">
                            {emotions.find(e => e.value === entry.emotion)?.label || entry.emotion}
                          </Badge>
                        )}
                        {entry.photo_path && (
                          <span>📷 Photo attached</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No diary entries yet
                  </div>
                )}
              </div>
            </div>

            {/* Rollups */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Rollups</h3>
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => handleRollup('daily')}
                  disabled={loading}
                >
                  Daily
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRollup('weekly')}
                  disabled={loading}
                >
                  Weekly
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRollup('monthly')}
                  disabled={loading}
                >
                  Monthly
                </Button>
              </div>

              {rollupText && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <pre className="whitespace-pre-wrap text-sm">{rollupText}</pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
