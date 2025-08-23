import { ProjectChatPane } from '@/components/ProjectChatPane';

export const ChatPane = () => {
  return (
    <div className="h-full p-4">
      <ProjectChatPane selectedProject={null} />
    </div>
  );
};
