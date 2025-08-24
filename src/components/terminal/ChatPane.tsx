
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { History, FolderOpen } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import MemoryManager from '@/components/MemoryManager';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { useChatStorage } from '@/utils/chatStorage';

export const ChatPane = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'projects'>('history');
  const { getLastTab, setLastTab } = useChatStorage();

  // Load last tab on mount
  useState(() => {
    const lastTab = getLastTab();
    if (lastTab) {
      setActiveTab(lastTab);
    }
  });

  const handleTabChange = (tab: 'history' | 'projects') => {
    setActiveTab(tab);
    setLastTab(tab);
  };

  const toggleDrawer = (tab: 'history' | 'projects') => {
    if (drawerOpen && activeTab === tab) {
      setDrawerOpen(false);
    } else {
      setActiveTab(tab);
      setLastTab(tab);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 p-4">
      {/* Header with drawer triggers - visible on mobile/tablet */}
      <div className="flex gap-2 mb-4 md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleDrawer('history')}
          className="flex-1"
        >
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleDrawer('projects')}
          className="flex-1"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Projects
        </Button>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 min-h-[60vh] md:min-h-0 order-1 relative">
        {/* Desktop drawer triggers - floating buttons */}
        <div className="hidden md:flex absolute top-4 right-4 gap-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleDrawer('history')}
            className="shadow-md"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleDrawer('projects')}
            className="shadow-md"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </Button>
        </div>

        <ChatInterface />
      </div>

      {/* Memory Manager - Below chat on mobile with proper spacing, right side on desktop */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 order-2 min-h-[40vh] md:min-h-0 mt-6 md:mt-0">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <MemoryManager />
        </div>
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
};
