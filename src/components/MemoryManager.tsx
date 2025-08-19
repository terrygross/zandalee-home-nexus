
import { useState, useEffect } from "react";
import { Brain, FileText, Calendar, Search, Plus, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LCARSButton from "@/components/lcars/LCARSButton";
import LCARSPillButton from "@/components/lcars/LCARSPillButton";

interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  type: 'memory' | 'diary' | 'note';
  created_at: string;
  tags?: string[];
}

const MemoryManager = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'memory' | 'diary' | 'note'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockMemories: MemoryEntry[] = [
      {
        id: '1',
        title: 'First Contact Protocol',
        content: 'Established communication parameters with user. Voice recognition active.',
        type: 'memory',
        created_at: '2024-01-15T10:30:00Z',
        tags: ['protocol', 'communication']
      },
      {
        id: '2',
        title: 'Daily Log Entry',
        content: 'System diagnostics completed. All systems nominal.',
        type: 'diary',
        created_at: '2024-01-15T14:20:00Z',
        tags: ['diagnostics', 'systems']
      },
      {
        id: '3',
        title: 'User Preferences',
        content: 'User prefers LCARS interface. Voice feedback enabled.',
        type: 'note',
        created_at: '2024-01-15T16:45:00Z',
        tags: ['preferences', 'ui']
      }
    ];
    setMemories(mockMemories);
  }, []);

  const filteredMemories = memories.filter(memory => {
    const matchesTab = selectedTab === 'all' || memory.type === selectedTab;
    const matchesSearch = searchQuery === '' || 
      memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'memory': return Brain;
      case 'diary': return Calendar;
      case 'note': return FileText;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string): "orange" | "blue" | "teal" | "amber" => {
    switch (type) {
      case 'memory': return 'orange';
      case 'diary': return 'blue';
      case 'note': return 'teal';
      default: return 'amber';
    }
  };

  return (
    <div className="h-full bg-lcars-black rounded-lg border-2 border-lcars-teal flex flex-col overflow-hidden">
      {/* LCARS Header - Pure black background */}
      <div className="px-4 py-2 border-b-2 border-lcars-teal font-bold uppercase tracking-wider text-sm text-black bg-lcars-teal rounded-t-lg overflow-hidden flex items-center justify-between flex-shrink-0">
        <span>MEMORY CORE</span>
        <div className="flex items-center gap-2">
          <LCARSPillButton
            color="amber"
            className="h-6 px-2 text-[9px]"
            onClick={() => {/* TODO: Add new memory */}}
          >
            <Plus className="w-3 h-3" />
          </LCARSPillButton>
        </div>
      </div>

      {/* Main Content - Pure black background, no nested containers */}
      <div className="flex-1 flex flex-col p-4 min-h-0 bg-lcars-black">
        {/* Search Bar */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-lcars-teal/60" />
            <input
              type="text"
              placeholder="SEARCH MEMORY BANKS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-10 pr-3 text-xs bg-lcars-black border border-lcars-teal/50 text-white placeholder:text-lcars-light-gray/60 font-lcars-mono uppercase rounded focus:border-lcars-teal focus:outline-none"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 flex-shrink-0">
          {[
            { key: 'all', label: 'ALL', color: 'teal' as const },
            { key: 'memory', label: 'MEM', color: 'orange' as const },
            { key: 'diary', label: 'LOG', color: 'blue' as const },
            { key: 'note', label: 'NOTE', color: 'amber' as const }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-3 py-1 text-[10px] font-lcars-mono font-bold uppercase tracking-wider rounded border transition-colors ${
                selectedTab === tab.key
                  ? `bg-lcars-${tab.color} text-black border-lcars-${tab.color}`
                  : `bg-lcars-black text-lcars-${tab.color} border-lcars-${tab.color}/30 hover:border-lcars-${tab.color}/50`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Memory List - Pure black background */}
        <div className="flex-1 min-h-0 bg-lcars-black">
          <div className="h-full space-y-2 overflow-y-auto">
            {filteredMemories.map((memory) => {
              const IconComponent = getTypeIcon(memory.type);
              const typeColor = getTypeColor(memory.type);
              
              return (
                <div
                  key={memory.id}
                  className={`p-3 rounded border transition-colors bg-lcars-black border-lcars-${typeColor}/30 hover:border-lcars-${typeColor}/50`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <IconComponent className={`w-4 h-4 text-lcars-${typeColor} flex-shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-lcars-mono font-bold text-white truncate uppercase">
                          {memory.title}
                        </div>
                        <div className="text-[10px] text-lcars-light-gray/60 font-lcars-mono">
                          {new Date(memory.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <LCARSPillButton
                        color={typeColor}
                        className="h-5 w-5 p-0"
                        onClick={() => {/* TODO: View memory */}}
                      >
                        <Eye className="w-3 h-3" />
                      </LCARSPillButton>
                      <LCARSPillButton
                        color="red"
                        className="h-5 w-5 p-0 ml-1"
                        onClick={() => {/* TODO: Delete memory */}}
                      >
                        <Trash2 className="w-3 h-3" />
                      </LCARSPillButton>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-lcars-light-gray/80 font-lcars-mono leading-relaxed line-clamp-2">
                    {memory.content}
                  </div>
                  
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {memory.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 text-[8px] font-lcars-mono font-bold uppercase rounded bg-lcars-${typeColor}/20 text-lcars-${typeColor} border border-lcars-${typeColor}/30`}
                        >
                          {tag}
                        </span>
                      ))}
                      {memory.tags.length > 3 && (
                        <span className="text-[8px] text-lcars-light-gray/60 font-lcars-mono">
                          +{memory.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredMemories.length === 0 && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-lcars-teal/40 mx-auto mb-2" />
                <div className="text-xs text-lcars-light-gray/60 font-lcars-mono uppercase">
                  NO MEMORY ENTRIES FOUND
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryManager;
