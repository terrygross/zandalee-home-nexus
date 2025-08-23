
import { ProjectChatPane } from '@/components/ProjectChatPane';

export const ChatPane = () => {
  return (
    <div className="flex-1 min-h-0">
      <ProjectChatPane selectedProject={null} />
    </div>
  );
};
