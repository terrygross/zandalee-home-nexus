import { useState } from 'react';
import { ProjectChatPane } from '@/components/ProjectChatPane';
import ChatProjectsSidebar from '@/components/projects/ChatProjectsSidebar';

type Project = { id: string; name: string; archived?: boolean };

export const ChatPane = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-shrink-0">
        <ChatProjectsSidebar onSelect={setSelectedProject} />
      </div>
      <div className="flex-1 min-w-0">
        <ProjectChatPane selectedProject={selectedProject} />
      </div>
    </div>
  );
};
