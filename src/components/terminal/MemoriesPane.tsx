
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

export const MemoriesPane = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { memorySearch } = useGateway();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await memorySearch(searchQuery, 20);
      setMemories(results);
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
      handleSearch();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle>Memory Search</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
        <div className="flex space-x-2 flex-shrink-0">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search memories..."
          />
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Searching...
              </div>
            ) : memories.length > 0 ? (
              memories.map((memory, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm">{memory.text || memory.content || 'No content'}</p>
                  <div className="flex flex-wrap gap-1">
                    {memory.tags?.map((tag: string, tagIndex: number) => (
                      <span
                        key={tagIndex}
                        className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {memory.kind && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {memory.kind}
                      </span>
                    )}
                  </div>
                  {memory.source && (
                    <p className="text-xs text-muted-foreground">
                      Source: {memory.source}
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
