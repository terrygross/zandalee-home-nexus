
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, BookOpen, Calendar, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import LCARSButton from "@/components/lcars/LCARSButton";
import LCARSPillButton from "@/components/lcars/LCARSPillButton";

interface DiaryEntry {
  id: string;
  content: string;
  timestamp: string;
  created_at: string;
}

const MemoryManager = () => {
  const [memories, setMemories] = useState<DiaryEntry[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8759/diary/entries');
      const data = await response.json();
      
      if (data.ok) {
        setMemories(data.entries);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch('http://127.0.0.1:8759/diary/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemory.trim() })
      });

      const data = await response.json();

      if (data.ok) {
        setNewMemory('');
        await loadMemories();
        toast({
          title: "Memory Added",
          description: "New diary entry has been saved",
        });
      } else {
        throw new Error(data.error || 'Failed to add memory');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add memory",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8759/diary/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.ok) {
        await loadMemories();
        toast({
          title: "Memory Deleted",
          description: "Diary entry has been removed",
        });
      } else {
        throw new Error(data.error || 'Failed to delete memory');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete memory",
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filteredMemories = memories.filter(memory =>
    memory.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-lcars-black">
      {/* LCARS Header */}
      <div 
        className="px-4 py-2 border-b-2 border-lcars-orange font-bold uppercase tracking-wider text-sm text-white rounded-t-lg overflow-hidden flex items-center justify-between flex-shrink-0 bg-lcars-black"
        style={{
          background: `linear-gradient(90deg, 
            hsl(var(--lcars-orange)) 0%, 
            hsl(var(--lcars-orange) / 0.8) 30%, 
            hsl(var(--lcars-black)) 30%
          )`
        }}
      >
        <span className="text-black flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          MEMORY CORE
        </span>
        <div className="text-xs text-black font-lcars-mono">
          {memories.length} ENTRIES
        </div>
      </div>
      
      {/* Main Content - Pure black background, no nested containers */}
      <div className="flex-1 flex flex-col p-4 min-h-0 bg-lcars-black" style={{ height: 'calc(100% - 3rem)' }}>
        {/* Search Bar */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-lcars-orange/60" />
            <Input
              placeholder="SEARCH MEMORIES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-xs bg-lcars-black border-lcars-orange/50 text-lcars-light-gray placeholder:text-lcars-light-gray/60 font-lcars-mono uppercase rounded focus:border-lcars-orange focus:ring-1 focus:ring-lcars-orange"
            />
          </div>
        </div>

        {/* Add Memory Section */}
        <div className="mb-4 flex-shrink-0 space-y-3">
          <Textarea
            placeholder="ADD NEW MEMORY..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            className="h-20 text-xs bg-lcars-black border-lcars-orange/50 text-lcars-light-gray placeholder:text-lcars-light-gray/60 font-lcars-mono resize-none focus:border-lcars-orange focus:ring-1 focus:ring-lcars-orange"
            disabled={isAdding}
          />
          
          <LCARSButton
            onClick={addMemory}
            disabled={isAdding || !newMemory.trim()}
            color="orange"
            className="w-full h-10 text-xs font-lcars-sans"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAdding ? 'ADDING...' : 'ADD MEMORY'}
          </LCARSButton>
        </div>

        {/* Memory List - Pure black background */}
        <div className="flex-1 min-h-0 bg-lcars-black">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-lcars-orange font-lcars-mono text-xs uppercase">
                LOADING MEMORIES...
              </div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-lcars-light-gray">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div className="text-xs font-lcars-mono uppercase">
                  {memories.length === 0 ? 'NO MEMORIES STORED' : 'NO MATCHING MEMORIES'}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full space-y-3 overflow-y-auto bg-lcars-black">
              {filteredMemories.slice(0, 6).map((memory) => (
                <div
                  key={memory.id}
                  className="p-3 rounded border border-lcars-orange/30 hover:border-lcars-orange/50 transition-colors bg-lcars-black"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center text-xs text-lcars-orange font-lcars-mono uppercase">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatTimestamp(memory.timestamp)}
                    </div>
                    <LCARSPillButton
                      onClick={() => deleteMemory(memory.id)}
                      color="red"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </LCARSPillButton>
                  </div>
                  <div className="text-xs text-lcars-light-gray font-lcars-mono leading-relaxed">
                    {memory.content}
                  </div>
                </div>
              ))}
              {filteredMemories.length > 6 && (
                <div className="text-center text-xs text-lcars-light-gray/60 font-lcars-mono pt-2 uppercase">
                  +{filteredMemories.length - 6} MORE ENTRIES
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryManager;
