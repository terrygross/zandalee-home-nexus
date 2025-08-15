
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, BookOpen, Star, Search, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

interface MemoryItem {
  id: string;
  text: string;
  kind: string;
  tags: string[];
  importance: number;
  relevance: number;
  created_at: string;
  source: string;
  trust: string;
}

const MemoryManager = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemory, setNewMemory] = useState({
    text: '',
    kind: 'semantic',
    tags: '',
    importance: 0.5,
    relevance: 0.5
  });
  const [diaryText, setDiaryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { 
    learnMemory, 
    searchMemories, 
    updateMemory, 
    appendDiary, 
    rollupDiary 
  } = useZandaleeAPI();

  const loadMemories = async (query: string = '') => {
    setIsLoading(true);
    try {
      const results = await searchMemories(query, [], 50);
      setMemories(results);
    } catch (error) {
      toast({
        title: "Memory Load Error",
        description: error instanceof Error ? error.message : 'Failed to load memories',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSearch = async () => {
    await loadMemories(searchQuery);
  };

  const handleSaveMemory = async () => {
    if (!newMemory.text.trim()) {
      toast({
        title: "Validation Error",
        description: "Memory text is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const tags = newMemory.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await learnMemory(
        newMemory.text,
        newMemory.kind,
        tags,
        newMemory.importance,
        newMemory.relevance
      );
      
      setNewMemory({
        text: '',
        kind: 'semantic',
        tags: '',
        importance: 0.5,
        relevance: 0.5
      });

      toast({
        title: "Memory Saved",
        description: "New memory has been learned successfully",
      });

      await loadMemories(searchQuery);
    } catch (error) {
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : 'Failed to save memory',
        variant: "destructive"
      });
    }
  };

  const handleSaveDiary = async () => {
    if (!diaryText.trim()) {
      toast({
        title: "Validation Error",
        description: "Diary text is required",
        variant: "destructive"
      });
      return;
    }

    try {
      await appendDiary(diaryText);
      setDiaryText('');
      
      toast({
        title: "Diary Updated",
        description: "Entry has been added to your diary",
      });
    } catch (error) {
      toast({
        title: "Diary Error",
        description: error instanceof Error ? error.message : 'Failed to save diary entry',
        variant: "destructive"
      });
    }
  };

  const handleRollupDiary = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      const result = await rollupDiary(period);
      toast({
        title: "Diary Rollup Complete",
        description: `${period} summary created at: ${result.path}`,
      });
    } catch (error) {
      toast({
        title: "Rollup Error",
        description: error instanceof Error ? error.message : 'Failed to create diary rollup',
        variant: "destructive"
      });
    }
  };

  const handleUpdateMemoryImportance = async (id: string, importance: number) => {
    try {
      await updateMemory(id, { importance });
      await loadMemories(searchQuery);
      toast({
        title: "Memory Updated",
        description: "Memory importance has been updated",
      });
    } catch (error) {
      toast({
        title: "Update Error",
        description: error instanceof Error ? error.message : 'Failed to update memory',
        variant: "destructive"
      });
    }
  };

  const getTrustColor = (trust: string) => {
    switch (trust) {
      case 'observed': return 'bg-status-success/20 text-status-success';
      case 'told': return 'bg-status-warning/20 text-status-warning';
      case 'inferred': return 'bg-status-info/20 text-status-info';
      default: return 'bg-text-muted/20 text-text-muted';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'wizard': return 'bg-energy-cyan/20 text-energy-cyan';
      case 'diary': return 'bg-energy-blue/20 text-energy-blue';
      case 'chat': return 'bg-energy-pulse/20 text-energy-pulse';
      default: return 'bg-text-muted/20 text-text-muted';
    }
  };

  return (
    <Card className="glass-panel h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-text-primary text-sm">
          <Brain className="w-4 h-4 text-energy-cyan" />
          <span>Memory & Diary</span>
        </CardTitle>
        <CardDescription className="text-text-secondary text-xs">
          Manage memories and diary entries
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <Tabs defaultValue="memories" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="memories" className="text-xs">Memories</TabsTrigger>
            <TabsTrigger value="diary" className="text-xs">Diary</TabsTrigger>
          </TabsList>

          <TabsContent value="memories" className="space-y-4 h-full">
            {/* Search */}
            <div className="flex space-x-2">
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="text-xs"
              />
              <Button onClick={handleSearch} size="sm" className="text-xs">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Add Memory */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Add Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="What should I remember?"
                  value={newMemory.text}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, text: e.target.value }))}
                  className="text-xs min-h-[60px]"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Kind</label>
                    <Select 
                      value={newMemory.kind} 
                      onValueChange={(value) => setNewMemory(prev => ({ ...prev, kind: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semantic">Semantic</SelectItem>
                        <SelectItem value="episodic">Episodic</SelectItem>
                        <SelectItem value="procedural">Procedural</SelectItem>
                        <SelectItem value="preference">Preference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Tags</label>
                    <Input
                      placeholder="tag1, tag2, tag3"
                      value={newMemory.tags}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, tags: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Importance: {newMemory.importance.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newMemory.importance}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, importance: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Relevance: {newMemory.relevance.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newMemory.relevance}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, relevance: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveMemory} className="w-full text-xs">
                  <Save className="w-4 h-4 mr-2" />
                  Save Memory
                </Button>
              </CardContent>
            </Card>

            {/* Memory List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="text-center text-text-muted text-xs py-4">Loading memories...</div>
              ) : memories.length === 0 ? (
                <div className="text-center text-text-muted text-xs py-4">No memories found</div>
              ) : (
                memories.map((memory) => (
                  <Card key={memory.id} className="glass-panel">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <p className="text-xs text-text-primary">{memory.text}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={`text-xs ${getTrustColor(memory.trust)}`}>
                            {memory.trust}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${getSourceColor(memory.source)}`}>
                            {memory.source}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {memory.kind}
                          </Badge>
                          {memory.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="w-3 h-3 text-status-warning" />
                            <span className="text-xs text-text-secondary">
                              {memory.importance.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            {[0.1, 0.5, 0.9].map(importance => (
                              <Button
                                key={importance}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateMemoryImportance(memory.id, importance)}
                                className={`text-xs p-1 h-auto ${
                                  Math.abs(memory.importance - importance) < 0.1 
                                    ? 'bg-energy-cyan/20 text-energy-cyan' 
                                    : ''
                                }`}
                              >
                                {importance}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="text-xs text-text-muted">
                          {new Date(memory.created_at).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="diary" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-xs">
                  <BookOpen className="w-4 h-4 text-energy-blue" />
                  <span>Diary Entry</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="What happened today? What did you learn? Any insights or observations..."
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  className="text-xs min-h-[120px]"
                />
                
                <Button onClick={handleSaveDiary} className="w-full text-xs">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Diary
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Diary Rollups</CardTitle>
                <CardDescription className="text-xs">
                  Create summaries from your diary entries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={() => handleRollupDiary('daily')}
                    variant="outline"
                    className="text-xs"
                  >
                    Daily
                  </Button>
                  <Button 
                    onClick={() => handleRollupDiary('weekly')}
                    variant="outline"
                    className="text-xs"
                  >
                    Weekly
                  </Button>
                  <Button 
                    onClick={() => handleRollupDiary('monthly')}
                    variant="outline"
                    className="text-xs"
                  >
                    Monthly
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemoryManager;
