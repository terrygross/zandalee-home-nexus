import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useIsMobile } from '@/hooks/use-mobile';
import { Thread } from '@/types/projects';
import { 
  History, 
  MessageSquare, 
  Star, 
  Archive, 
  Trash2, 
  MoreVertical,
  Search,
  Clock,
  Pin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatHistoryPanel = ({ isOpen, onOpenChange }: ChatHistoryPanelProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    messages,
    listThreads,
    activeProjectId
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'archived'>('all');

  // Filter and search threads
  const filteredThreads = useMemo(() => {
    let filtered = threads;

    // Apply filter
    switch (filter) {
      case 'pinned':
        filtered = threads.filter(t => t.pinned);
        break;
      case 'archived':
        filtered = threads.filter(t => t.archived);
        break;
      default:
        filtered = threads.filter(t => !t.archived);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread => {
        // Search in thread title
        if (thread.title?.toLowerCase().includes(query)) return true;
        
        // Search in thread messages
        const threadMessages = messages[thread.id] || [];
        return threadMessages.some(msg => 
          msg.content.toLowerCase().includes(query)
        );
      });
    }

    return filtered.sort((a, b) => {
      // Sort by pinned first, then by updated date
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [threads, filter, searchQuery, messages]);

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    onOpenChange(false);
  };

  const handlePinThread = async (thread: Thread) => {
    // Mock pin functionality - would call API in real implementation
    toast({
      title: thread.pinned ? "Thread Unpinned" : "Thread Pinned", 
      description: `"${thread.title}" ${thread.pinned ? 'unpinned' : 'pinned'}`,
    });
  };

  const handleArchiveThread = async (thread: Thread) => {
    // Mock archive functionality - would call API in real implementation
    toast({
      title: thread.archived ? "Thread Restored" : "Thread Archived",
      description: `"${thread.title}" ${thread.archived ? 'restored' : 'archived'}`,
    });
  };

  const handleDeleteThread = async (thread: Thread) => {
    if (!confirm(`Are you sure you want to delete "${thread.title}"? This action cannot be undone.`)) {
      return;
    }

    // Mock delete functionality - would call API in real implementation
    toast({
      title: "Thread Deleted",
      description: `"${thread.title}" has been deleted`,
      variant: "destructive"
    });
  };

  const getThreadPreview = (thread: Thread): string => {
    const threadMessages = messages[thread.id] || [];
    const firstUserMessage = threadMessages.find(m => m.role === 'user');
    return firstUserMessage?.content.slice(0, 100) + '...' || thread.summary || 'No messages yet';
  };

  const getMessageCount = (threadId: string): number => {
    return messages[threadId]?.length || 0;
  };

  const ThreadsList = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Chat History</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredThreads.length}
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="space-y-2">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                activeThreadId === thread.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => handleSelectThread(thread.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-medium truncate">
                    {thread.title || 'Untitled Conversation'}
                  </h4>
                  {thread.pinned && (
                    <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinThread(thread);
                      }}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {thread.pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveThread(thread);
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {thread.archived ? 'Restore' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(thread);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {getThreadPreview(thread)}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(thread.updatedAt))} ago
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getMessageCount(thread.id)} msgs
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {filteredThreads.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No conversations found</p>
          {searchQuery && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const triggerButton = (
    <Button variant="ghost" size="sm" className="gap-2">
      <History className="h-4 w-4" />
      History
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Chat History</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <ThreadsList />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ThreadsList />
        </div>
      </SheetContent>
    </Sheet>
  );
};