
import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import MemoryManager from '@/components/MemoryManager';

interface ProjectChatPaneProps {
  selectedProject: any;
}

export const ProjectChatPane = ({ selectedProject }: ProjectChatPaneProps) => {
  return (
    <div className="flex flex-col md:flex-row h-full gap-4 p-4">
      {/* Main Chat Section - Full width on mobile, left side on desktop */}
      <div className="flex-1 min-h-0 order-1">
        <ChatInterface />
      </div>

      {/* Memory Manager - Below chat on mobile, right side on desktop */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 order-2 min-h-0 mt-4 md:mt-0">
        <div className="h-auto md:h-full overflow-visible md:overflow-y-auto scrollbar-hide">
          <MemoryManager />
        </div>
      </div>
    </div>
  );
};
