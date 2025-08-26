import { useState, useEffect } from "react";
import { Search, Plus, Brain, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { api, Memory } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function MemoryTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const { toast } = useToast();

  // New memory form state
  const [newMemory, setNewMemory] = useState({
    text: "",
    kind: "note",
    tags: "",
    importance: [5],
    relevance: [5]
  });

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadMemories = async () => {
    try {
      const response = await api.mem_snapshot();
      if (response.ok && response.data) {
        setMemories(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load memories",
        variant: "destructive"
      });
    }
  };

  const performSearch = async () => {
    try {
      const response = await api.mem_search(searchQuery, 20);
      if (response.ok && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Search failed",
        variant: "destructive"
      });
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.text.trim()) return;

    try {
      const tags = newMemory.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const response = await api.mem_learn(
        newMemory.text,
        newMemory.kind,
        tags,
        newMemory.importance[0],
        newMemory.relevance[0]
      );

      if (response.ok) {
        toast({
          title: "Memory Added",
          description: "New memory has been learned successfully"
        });
        setNewMemory({
          text: "",
          kind: "note",
          tags: "",
          importance: [5],
          relevance: [5]
        });
        setIsAddingMemory(false);
        loadMemories();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add memory",
        variant: "destructive"
      });
    }
  };

  const handleRollup = async () => {
    const ym = new Date().toISOString().slice(0, 7); // YYYY-MM format
    try {
      const response = await api.mem_rollup(ym);
      if (response.ok) {
        toast({
          title: "Memory Rollup",
          description: "Memory consolidation initiated"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Rollup failed",
        variant: "destructive"
      });
    }
  };

  const memoriesToShow = searchQuery.trim() ? searchResults : memories.slice(0, 10);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Memory System</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50 border-border"
        />
      </div>

      {/* Add Memory Toggle */}
      <Button
        onClick={() => setIsAddingMemory(!isAddingMemory)}
        variant="outline"
        className="w-full border-primary/30 text-primary hover:bg-primary/10"
      >
        <Plus className="w-4 h-4 mr-2" />
        {isAddingMemory ? "Cancel" : "Add Memory"}
      </Button>

      {/* Add Memory Form */}
      {isAddingMemory && (
        <Card className="border-primary/20 bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="memory-text" className="text-xs">Text</Label>
              <Textarea
                id="memory-text"
                placeholder="What should I remember?"
                value={newMemory.text}
                onChange={(e) => setNewMemory({...newMemory, text: e.target.value})}
                className="mt-1 min-h-[80px] bg-background/50"
              />
            </div>
            
            <div>
              <Label htmlFor="memory-kind" className="text-xs">Kind</Label>
              <Select value={newMemory.kind} onValueChange={(value) => setNewMemory({...newMemory, kind: value})}>
                <SelectTrigger className="mt-1 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="preference">Preference</SelectItem>
                  <SelectItem value="context">Context</SelectItem>
                  <SelectItem value="fact">Fact</SelectItem>
                  <SelectItem value="instruction">Instruction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="memory-tags" className="text-xs">Tags (comma-separated)</Label>
              <Input
                id="memory-tags"
                placeholder="tag1, tag2, tag3"
                value={newMemory.tags}
                onChange={(e) => setNewMemory({...newMemory, tags: e.target.value})}
                className="mt-1 bg-background/50"
              />
            </div>
            
            <div>
              <Label className="text-xs">Importance: {newMemory.importance[0]}</Label>
              <Slider
                value={newMemory.importance}
                onValueChange={(value) => setNewMemory({...newMemory, importance: value})}
                max={10}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="text-xs">Relevance: {newMemory.relevance[0]}</Label>
              <Slider
                value={newMemory.relevance}
                onValueChange={(value) => setNewMemory({...newMemory, relevance: value})}
                max={10}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
            
            <Button
              onClick={handleAddMemory}
              disabled={!newMemory.text.trim()}
              className="w-full bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              Learn Memory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={loadMemories}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          Refresh
        </Button>
        <Button
          onClick={handleRollup}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          Rollup
        </Button>
      </div>

      {/* Memory List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {memoriesToShow.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No memories found</p>
          </div>
        ) : (
          memoriesToShow.map((memory) => (
            <Card key={memory.id} className="border-border/50 bg-background/30 hover:border-primary/20 transition-all">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {memory.kind}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning" />
                      <span className="text-xs text-muted-foreground">{memory.importance}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {memory.created.toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm text-foreground mb-2 line-clamp-3">
                  {memory.text}
                </p>
                
                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}