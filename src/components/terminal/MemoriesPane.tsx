
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

interface Memory {
  text: string;
  kind: 'semantic' | 'episodic' | 'procedural' | 'working';
  importance?: number;
  relevance?: number;
  tags?: string[];
  emotion?: string | null;
  photo_path?: string | null;
  source?: string;
}

export const MemoriesPane = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMemory, setNewMemory] = useState({
    text: '',
    kind: 'semantic' as const,
    importance: 5,
    tags: '',
    emotion: '',
    source: ''
  });

  const { memorySearch, memoryLearn } = useGateway();
  const { toast } = useToast();

  const searchMemories = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await memorySearch(searchQuery);
      setMemories(results || []);
    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addMemory = async () => {
    if (!newMemory.text.trim()) {
      toast({
        title: 'Error',
        description: 'Memory text is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await memoryLearn({
        text: newMemory.text,
        kind: newMemory.kind,
        importance: newMemory.importance,
        tags: newMemory.tags ? newMemory.tags.split(',').map(t => t.trim()) : [],
        emotion: newMemory.emotion || null,
        source: newMemory.source || undefined
      });

      toast({
        title: 'Memory Added',
        description: 'Memory has been stored successfully'
      });

      // Reset form
      setNewMemory({
        text: '',
        kind: 'semantic',
        importance: 5,
        tags: '',
        emotion: '',
        source: ''
      });
    } catch (error: any) {
      toast({
        title: 'Add Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Memories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchMemories()}
              />
            </div>
            <Button onClick={searchMemories} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {memories.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {memories.map((memory, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">{memory.text}</p>
                      <div className="flex space-x-2 mt-2">
                        <Badge variant="outline">{memory.kind}</Badge>
                        {memory.importance && (
                          <Badge variant="secondary">
                            Importance: {memory.importance}
                          </Badge>
                        )}
                        {memory.emotion && (
                          <Badge variant="default">{memory.emotion}</Badge>
                        )}
                      </div>
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {memory.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memory-text">Memory Text</Label>
            <textarea
              id="memory-text"
              className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background"
              placeholder="Enter memory text..."
              value={newMemory.text}
              onChange={(e) => setNewMemory({ ...newMemory, text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory-kind">Memory Type</Label>
            <Input
              id="memory-kind"
              value={newMemory.kind}
              onChange={(e) => setNewMemory({ ...newMemory, kind: e.target.value as any })}
              placeholder="semantic, episodic, procedural, working"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memory-importance">Importance (1-10)</Label>
              <Input
                id="memory-importance"
                type="number"
                min="1"
                max="10"
                value={newMemory.importance}
                onChange={(e) => setNewMemory({ ...newMemory, importance: parseInt(e.target.value) || 5 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memory-emotion">Emotion</Label>
              <Input
                id="memory-emotion"
                value={newMemory.emotion}
                onChange={(e) => setNewMemory({ ...newMemory, emotion: e.target.value })}
                placeholder="happy, sad, excited..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory-tags">Tags (comma-separated)</Label>
            <Input
              id="memory-tags"
              value={newMemory.tags}
              onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
              placeholder="work, personal, important..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory-source">Source</Label>
            <Input
              id="memory-source"
              value={newMemory.source}
              onChange={(e) => setNewMemory({ ...newMemory, source: e.target.value })}
              placeholder="conversation, document, observation..."
            />
          </div>

          <Button onClick={addMemory}>
            <Plus className="w-4 h-4 mr-2" />
            Add Memory
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
