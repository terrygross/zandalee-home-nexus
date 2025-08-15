
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Brain, BookOpen, Trash2 } from "lucide-react";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";
import { useToast } from "@/hooks/use-toast";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemory, setNewMemory] = useState({
    text: "",
    kind: "semantic",
    tags: "",
    importance: 0.5,
    relevance: 0.5
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { searchMemories, learnMemory } = useZandaleeAPI();
  const { toast } = useToast();

  // Load initial memories
  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      setIsLoading(true);
      const results = await searchMemories("", [], 20);
      setMemories(results);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }

    try {
      setIsLoading(true);
      const results = await searchMemories(searchQuery, [], 20);
      setMemories(results);
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
      
      await learnMemory(
        newMemory.text,
        newMemory.kind,
        tags,
        newMemory.importance,
        newMemory.relevance
      );

      // Reset form
      setNewMemory({
        text: "",
        kind: "semantic",
        tags: "",
        importance: 0.5,
        relevance: 0.5
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
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {memory.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-energy-blue/30"
                          >
                            {tag}
                          </Badge>
                        ))}
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
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <div className="text-[10px] text-text-muted mb-1">Tags</div>
                  <Input
                    placeholder="tag1, tag2"
                    value={newMemory.tags}
                    onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                    className="h-6 text-xs bg-space-surface/60 border-energy-cyan/30"
                  />
                </div>
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
                disabled={isLoading}
              >
                <Plus className="w-3 h-3 mr-1" />
                Save Memory
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="diary" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
              <div className="text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>Diary functionality coming soon</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MemoryManager;
