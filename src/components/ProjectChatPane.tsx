
import { useState, useEffect } from 'react';
import { Brain, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';

interface ProjectChatPaneProps {
  selectedProject: any;
}

export const ProjectChatPane = ({ selectedProject }: ProjectChatPaneProps) => {
  const { user } = useSession();
  const { toast } = useToast();
  const { memorySearch, diaryRollup } = useGateway();
  
  // Mock data for memories and diary - these would come from real hooks in a complete implementation
  const [memories, setMemories] = useState<any[]>([]);
  const [diary, setDiary] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [loadingDiary, setLoadingDiary] = useState(false);

  const loadMemories = async () => {
    setLoadingMemories(true);
    try {
      // This would search for memories related to the project
      const result = await memorySearch(selectedProject?.name || 'general', 5);
      setMemories(result.results || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load memories",
        variant: "destructive",
      });
    } finally {
      setLoadingMemories(false);
    }
  };

  const loadDiary = async () => {
    setLoadingDiary(true);
    try {
      // This would load recent diary entries
      const result = await diaryRollup('daily');
      // Convert the rollup result to diary entries format
      if (result.text) {
        setDiary([{
          content: result.text,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load diary",
        variant: "destructive",
      });
    } finally {
      setLoadingDiary(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Memory & Diary Section - Fixed at top */}
      <div className="flex-shrink-0 border-b border-border/50">
        <div className="p-4 space-y-4">
          {/* Memory Section */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Memories ({memories.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMemories}
                disabled={loadingMemories}
              >
                {loadingMemories ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-32">
              <div className="space-y-2 pr-4">
                {memories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No memories loaded</p>
                ) : (
                  memories.slice(0, 5).map((memory, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/50 rounded border-l-2 border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">{memory.created_at}</p>
                      <p>{memory.text || memory.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Diary Section */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Diary ({diary.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDiary}
                disabled={loadingDiary}
              >
                {loadingDiary ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-32">
              <div className="space-y-2 pr-4">
                {diary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diary entries loaded</p>
                ) : (
                  diary.slice(0, 5).map((entry, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/50 rounded border-l-2 border-secondary/20">
                      <p className="text-xs text-muted-foreground mb-1">{entry.created_at}</p>
                      <p>{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Chat Section - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
};
