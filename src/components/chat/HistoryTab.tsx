
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Download, MoreHorizontal, Pin, Archive, Trash2, Copy, Edit2, FolderOpen, BookmarkPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChatStorage, ChatItem, ChatStore } from '@/utils/chatStorage';

export const HistoryTab = () => {
  const [chatStore, setChatStore] = useState<ChatStore>({ activeChatId: null, items: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'oldest' | 'a-z'>('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date());
  
  const { getChatStore, setChatStore: saveChatStore } = useChatStorage();
  const { toast } = useToast();

  useEffect(() => {
    setChatStore(getChatStore());
  }, []);

  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const saveWithStatus = debounce((store: ChatStore) => {
    setSaveStatus('saving');
    saveChatStore(store);
    setLastSaveTime(new Date());
    setTimeout(() => setSaveStatus('saved'), 500);
  }, 200);

  const updateStore = (newStore: ChatStore) => {
    setChatStore(newStore);
    saveWithStatus(newStore);
  };

  const startNewChat = () => {
    const newChat: ChatItem = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const newStore = {
      ...chatStore,
      activeChatId: newChat.id,
      items: [newChat, ...chatStore.items],
    };
    
    updateStore(newStore);
    toast({ title: 'New chat started' });
  };

  const saveSnapshot = (chatId: string) => {
    const chat = chatStore.items.find(c => c.id === chatId);
    if (!chat) return;

    const snapshot = {
      id: `snapshot_${Date.now()}`,
      title: `Snapshot of ${chat.title}`,
      createdAt: new Date().toISOString(),
    };

    const updatedChat = {
      ...chat,
      snapshots: [...(chat.snapshots || []), snapshot],
      updatedAt: new Date().toISOString(),
    };

    const newStore = {
      ...chatStore,
      items: chatStore.items.map(c => c.id === chatId ? updatedChat : c),
    };

    updateStore(newStore);
    toast({ title: 'Snapshot saved' });
  };

  const exportChat = (chatId: string, format: 'markdown' | 'json') => {
    const chat = chatStore.items.find(c => c.id === chatId);
    if (!chat) return;

    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(chat, null, 2);
      filename = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    } else {
      content = `# ${chat.title}\n\nCreated: ${new Date(chat.createdAt).toLocaleString()}\n\n`;
      if (chat.note) content += `**Note:** ${chat.note}\n\n`;
      filename = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: `Chat exported as ${format.toUpperCase()}` });
  };

  const renameChat = (chatId: string, newTitle: string) => {
    const newStore = {
      ...chatStore,
      items: chatStore.items.map(c => 
        c.id === chatId 
          ? { ...c, title: newTitle, updatedAt: new Date().toISOString() }
          : c
      ),
    };
    updateStore(newStore);
    toast({ title: 'Chat renamed' });
  };

  const duplicateChat = (chatId: string) => {
    const chat = chatStore.items.find(c => c.id === chatId);
    if (!chat) return;

    const duplicate: ChatItem = {
      ...chat,
      id: `chat_${Date.now()}`,
      title: `${chat.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshots: [],
    };

    const newStore = {
      ...chatStore,
      items: [duplicate, ...chatStore.items],
    };

    updateStore(newStore);
    toast({ title: 'Chat duplicated' });
  };

  const togglePinned = (chatId: string) => {
    const chat = chatStore.items.find(c => c.id === chatId);
    if (!chat) return;

    const newStore = {
      ...chatStore,
      items: chatStore.items.map(c =>
        c.id === chatId
          ? { ...c, pinned: !c.pinned, updatedAt: new Date().toISOString() }
          : c
      ),
    };

    updateStore(newStore);
    toast({ title: chat.pinned ? 'Chat unpinned' : 'Chat pinned' });
  };

  const archiveChat = (chatId: string) => {
    const chat = chatStore.items.find(c => c.id === chatId);
    if (!chat) return;

    const newStore = {
      ...chatStore,
      items: chatStore.items.map(c =>
        c.id === chatId
          ? { ...c, archived: !c.archived, updatedAt: new Date().toISOString() }
          : c
      ),
    };

    updateStore(newStore);
    toast({ title: chat.archived ? 'Chat restored' : 'Chat archived' });
  };

  const deleteChat = (chatId: string) => {
    const newStore = {
      ...chatStore,
      items: chatStore.items.filter(c => c.id !== chatId),
      activeChatId: chatStore.activeChatId === chatId ? null : chatStore.activeChatId,
    };

    updateStore(newStore);
    toast({ title: 'Chat deleted', variant: 'destructive' });
  };

  const updateChatNote = (chatId: string, note: string) => {
    const newStore = {
      ...chatStore,
      items: chatStore.items.map(c =>
        c.id === chatId
          ? { ...c, note, updatedAt: new Date().toISOString() }
          : c
      ),
    };

    updateStore(newStore);
    setEditingNote(null);
    toast({ title: 'Note updated' });
  };

  const openChat = (chatId: string) => {
    const newStore = {
      ...chatStore,
      activeChatId: chatId,
    };
    updateStore(newStore);
    toast({ title: 'Chat opened' });
  };

  // Filter and sort chats
  const filteredChats = chatStore.items
    .filter(chat => {
      if (!showArchived && chat.archived) return false;
      if (searchQuery) {
        return chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               chat.note?.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned chats always float to top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      switch (sortMode) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <Button onClick={startNewChat} size="sm" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Export all as markdown')}>
                Export All (Markdown)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Export all as JSON')}>
                Export All (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortMode === 'recent' ? 'Recent' : sortMode === 'oldest' ? 'Oldest' : 'A-Z'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortMode('recent')}>Recent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('oldest')}>Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('a-z')}>A-Z</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg border ${
                chatStore.activeChatId === chat.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'
              } ${chat.archived ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{chat.title}</h4>
                    {chat.pinned && <Pin className="w-3 h-3 text-primary" />}
                    {chat.archived && <Archive className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chat.updatedAt).toLocaleString()}
                  </p>
                  {chat.snapshots && chat.snapshots.length > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {chat.snapshots.length} snapshots
                    </Badge>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openChat(chat.id)}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const newTitle = prompt('New title:', chat.title);
                      if (newTitle) renameChat(chat.id, newTitle);
                    }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateChat(chat.id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => saveSnapshot(chat.id)}>
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Save Snapshot
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePinned(chat.id)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {chat.pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archiveChat(chat.id)}>
                      <Archive className="w-4 h-4 mr-2" />
                      {chat.archived ? 'Restore' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChat(chat.id, 'markdown')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChat(chat.id, 'json')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteChat(chat.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Notes */}
              {editingNote === chat.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="text-xs"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateChatNote(chat.id, noteText)}>
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingNote(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  {chat.note ? (
                    <p 
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => {
                        setEditingNote(chat.id);
                        setNoteText(chat.note || '');
                      }}
                    >
                      {chat.note}
                    </p>
                  ) : (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingNote(chat.id);
                        setNoteText('');
                      }}
                    >
                      Add note...
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredChats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No chats found</p>
              {searchQuery && (
                <button
                  className="text-primary hover:underline text-sm mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Status */}
      <div className="p-2 border-t">
        <p className="text-xs text-muted-foreground text-center">
          {saveStatus === 'saving' ? 'Saving...' : `Saved • ${Math.floor((Date.now() - lastSaveTime.getTime()) / 1000)}s ago`}
        </p>
      </div>
    </div>
  );
};
