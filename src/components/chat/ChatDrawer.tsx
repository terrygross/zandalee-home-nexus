
import { useState, useEffect } from 'react';
import { Drawer, SideDrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HistoryTab } from './HistoryTab';
import { ProjectsTab } from './ProjectsTab';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useChatStorage } from '@/utils/chatStorage';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: 'history' | 'projects';
  onTabChange: (tab: 'history' | 'projects') => void;
}

export const ChatDrawer = ({ open, onOpenChange, activeTab, onTabChange }: ChatDrawerProps) => {
  const { createNewChat, createProject, getChatStore } = useChatStorage();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      } else if (e.key === 'h' || e.key === 'H') {
        if (!open || activeTab !== 'history') {
          onTabChange('history');
          onOpenChange(true);
        } else {
          onOpenChange(false);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (!open || activeTab !== 'projects') {
          onTabChange('projects');
          onOpenChange(true);
        } else {
          onOpenChange(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, activeTab, onOpenChange, onTabChange]);

  const handleNewChat = () => {
    const chatId = createNewChat();
    console.log('Created new chat:', chatId);
  };

  const handleCreateProject = () => {
    const projectId = createProject();
    console.log('Created new project:', projectId);
    onTabChange('projects');
  };

  // Get recent chats for preview
  const recentChats = getChatStore().items.slice(0, 3);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <SideDrawerContent 
        className="fixed right-0 inset-y-0 w-[360px] md:w-[420px] rounded-none bg-background border-l z-[200]"
        style={{ 
          top: 'var(--terminal-header-height, 0px)',
          height: 'calc(100vh - var(--terminal-header-height, 0px))'
        }}
      >
        {/* LCARS styled container */}
        <div className="border-2 border-blue-500 rounded-2xl m-2 bg-background flex flex-col h-[calc(100%-1rem)]">
          <DrawerHeader className="border-b border-blue-500/30 flex-shrink-0">
            <DrawerTitle className="text-blue-400 font-bold">CHATS & PROJECTS</DrawerTitle>
          </DrawerHeader>
          
          {/* Always-visible LCARS action buttons */}
          <div className="p-4 space-y-3 flex-shrink-0">
            {/* New Chat Button */}
            <div className="relative">
              <Button
                onClick={handleNewChat}
                className="w-full h-12 bg-background hover:bg-blue-500/10 border-2 border-blue-500 rounded-full text-blue-400 font-bold justify-start px-6 relative"
                variant="outline"
              >
                New Chat
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-2 h-8 w-8 p-0 rounded-full hover:bg-blue-500/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4 text-blue-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-blue-500 z-[300]">
                    <DropdownMenuItem onClick={handleNewChat}>
                      New Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTabChange('history')}>
                      View All Chats
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Button>
            </div>

            {/* Projects Button */}
            <div className="relative">
              <Button
                onClick={() => onTabChange('projects')}
                className="w-full h-12 bg-background hover:bg-blue-500/10 border-2 border-blue-500 rounded-full text-blue-400 font-bold justify-start px-6 relative"
                variant="outline"
              >
                Projects
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateProject();
                  }}
                  variant="ghost"
                  size="sm"
                  className="absolute right-12 h-8 w-8 p-0 rounded-full hover:bg-blue-500/20"
                >
                  <Plus className="w-5 h-5 text-blue-400" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-2 h-8 w-8 p-0 rounded-full hover:bg-blue-500/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4 text-blue-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-blue-500 z-[300]">
                    <DropdownMenuItem onClick={() => onTabChange('projects')}>
                      View Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreateProject}>
                      New Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Button>
            </div>

            {/* Chat History Button */}
            <div className="relative">
              <Button
                onClick={() => onTabChange('history')}
                className="w-full h-12 bg-background hover:bg-blue-500/10 border-2 border-blue-500 rounded-full text-blue-400 font-bold justify-start px-6 relative"
                variant="outline"
              >
                Chat History
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-2 h-8 w-8 p-0 rounded-full hover:bg-blue-500/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4 text-blue-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-blue-500 z-[300]">
                    <DropdownMenuItem onClick={() => onTabChange('history')}>
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Export All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Button>
            </div>

            {/* Recent Chats Preview */}
            {recentChats.map((chat) => (
              <div key={chat.id} className="relative">
                <Button
                  className="w-full h-12 bg-background hover:bg-blue-500/10 border-2 border-blue-500 rounded-full text-blue-400 font-bold justify-start px-6 relative truncate"
                  variant="outline"
                >
                  {chat.title}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-2 h-8 w-8 p-0 rounded-full hover:bg-blue-500/20"
                      >
                        <MoreHorizontal className="w-4 h-4 text-blue-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border-blue-500 z-[300]">
                      <DropdownMenuItem>
                        Open Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Button>
              </div>
            ))}
          </div>

          {/* Scrollable Content Area for History/Projects tabs */}
          <div className="flex-1 min-h-0 px-4 pb-4">
            <ScrollArea className="h-full">
              {activeTab === 'history' && <HistoryTab />}
              {activeTab === 'projects' && <ProjectsTab />}
            </ScrollArea>
          </div>
        </div>
      </SideDrawerContent>
    </Drawer>
  );
};
