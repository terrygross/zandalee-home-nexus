
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
        {/* Main Container with LCARS styling */}
        <div className="h-full flex flex-col border-2 border-blue-500 rounded-2xl m-2 bg-background overflow-hidden">
          {/* Header */}
          <DrawerHeader className="border-b border-blue-500/30 flex-shrink-0 py-4">
            <DrawerTitle className="text-blue-400 font-bold text-center">CHATS & PROJECTS</DrawerTitle>
          </DrawerHeader>
          
          {/* Always Visible Action Buttons */}
          <div className="flex-shrink-0 p-4 space-y-3 bg-background">
            {/* New Chat Button */}
            <Button
              onClick={handleNewChat}
              className="w-full h-14 bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg rounded-full flex items-center justify-between px-6"
            >
              <span>New Chat</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full hover:bg-white/20 text-white"
                  >
                    <MoreHorizontal className="w-4 h-4" />
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

            {/* Projects Button with Create Project */}
            <Button
              onClick={() => onTabChange('projects')}
              className="w-full h-14 bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg rounded-full flex items-center justify-between px-6"
            >
              <span>Projects</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateProject();
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/20 text-white"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full hover:bg-white/20 text-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
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
              </div>
            </Button>

            {/* Chat History Button */}
            <Button
              onClick={() => onTabChange('history')}
              className="w-full h-14 bg-purple-500 hover:bg-purple-400 text-white font-bold text-lg rounded-full flex items-center justify-between px-6"
            >
              <span>Chat History</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full hover:bg-white/20 text-white"
                  >
                    <MoreHorizontal className="w-4 h-4" />
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

            {/* Recent Chats Preview */}
            {recentChats.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-blue-400 font-bold px-2">Recent Chats:</div>
                {recentChats.map((chat) => (
                  <Button
                    key={chat.id}
                    className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-full flex items-center justify-between px-4 text-left"
                  >
                    <span className="truncate">{chat.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 rounded-full hover:bg-white/20 text-white"
                        >
                          <MoreHorizontal className="w-3 h-3" />
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
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Content for History/Projects Tabs */}
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
