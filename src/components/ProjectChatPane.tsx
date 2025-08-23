
import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import MemoryManager from '@/components/MemoryManager';

interface ProjectChatPaneProps {
  selectedProject: any;
}

export const ProjectChatPane = ({ selectedProject }: ProjectChatPaneProps) => {
  return (
    <div className="flex flex-col md:flex-row h-full gap-4 p-4">
      {/* Main Chat Section - Full height on mobile, left side on desktop */}
      <div className="flex-1 min-h-[60vh] md:min-h-0 order-1">
        <ChatInterface />
      </div>

      {/* Memory Manager - Below chat on mobile with proper spacing, right side on desktop */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 order-2 min-h-[40vh] md:min-h-0 mt-6 md:mt-0">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <MemoryManager />
        </div>
      </div>
    </div>
  );
};
