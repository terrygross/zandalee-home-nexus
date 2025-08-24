
import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HistoryTab } from './HistoryTab';
import { ProjectsTab } from './ProjectsTab';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: 'history' | 'projects';
  onTabChange: (tab: 'history' | 'projects') => void;
}

export const ChatDrawer = ({ open, onOpenChange, activeTab, onTabChange }: ChatDrawerProps) => {
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[360px] md:w-[420px] mt-0 rounded-none fixed inset-y-0 right-0 z-[200] bg-background border-l">
        <DrawerHeader className="border-b">
          <DrawerTitle>Chat Management</DrawerTitle>
        </DrawerHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'history' | 'projects')} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 m-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="flex-1 min-h-0 m-0">
            <HistoryTab />
          </TabsContent>
          
          <TabsContent value="projects" className="flex-1 min-h-0 m-0">
            <ProjectsTab />
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};
