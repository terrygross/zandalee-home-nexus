
import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
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
  const { createNewChat } = useChatStorage();

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[360px] md:w-[420px] mt-0 rounded-none fixed inset-y-0 right-0 z-[200] bg-background border-l">
        {/* LCARS styled header */}
        <div className="border-2 border-blue-500 rounded-2xl m-2 bg-background flex flex-col h-[calc(100%-1rem)]">
          <DrawerHeader className="border-b border-blue-500/30 flex-shrink-0">
            <DrawerTitle className="text-blue-400 font-bold">CHATS & PROJECTS</DrawerTitle>
          </DrawerHeader>
          
          {/* Button List Interface - like in your reference image */}
          <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
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
                <Plus className="absolute right-12 w-5 h-5 text-blue-400" />
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
                    <DropdownMenuItem>
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

            {/* Example Chat Entry - Super Cars */}
            <div className="relative">
              <Button
                className="w-full h-12 bg-background hover:bg-blue-500/10 border-2 border-blue-500 rounded-full text-blue-400 font-bold justify-start px-6 relative"
                variant="outline"
              >
                Super Cars
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

            {/* Content Area - Conditional Rendering */}
            {activeTab === 'history' && (
              <div className="flex-1 min-h-0">
                <HistoryTab />
              </div>
            )}
            
            {activeTab === 'projects' && (
              <div className="flex-1 min-h-0">
                <ProjectsTab />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
