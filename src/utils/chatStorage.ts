
import { useSession } from '@/contexts/SessionContext';

export interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  note?: string;
  snapshots?: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
}

export interface ChatStore {
  activeChatId: string | null;
  items: ChatItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  chats: string[];
}

export interface ProjectStore {
  selectedProjectId: string | null;
  items: ProjectItem[];
}

export const useChatStorage = () => {
  const { user } = useSession();
  const userId = user?.familyName || 'default';

  const getChatStore = (): ChatStore => {
    try {
      const stored = localStorage.getItem(`zandalee.${userId}.chats`);
      return stored ? JSON.parse(stored) : { activeChatId: null, items: [] };
    } catch {
      return { activeChatId: null, items: [] };
    }
  };

  const setChatStore = (store: ChatStore) => {
    localStorage.setItem(`zandalee.${userId}.chats`, JSON.stringify(store));
  };

  const getProjectStore = (): ProjectStore => {
    try {
      const stored = localStorage.getItem(`zandalee.${userId}.projects`);
      return stored ? JSON.parse(stored) : { selectedProjectId: null, items: [] };
    } catch {
      return { selectedProjectId: null, items: [] };
    }
  };

  const setProjectStore = (store: ProjectStore) => {
    localStorage.setItem(`zandalee.${userId}.projects`, JSON.stringify(store));
  };

  const getLastTab = (): 'history' | 'projects' => {
    try {
      const stored = localStorage.getItem(`zandalee.${userId}.lastTab`);
      return stored === 'projects' ? 'projects' : 'history';
    } catch {
      return 'history';
    }
  };

  const setLastTab = (tab: 'history' | 'projects') => {
    localStorage.setItem(`zandalee.${userId}.lastTab`, tab);
  };

  // Helper function to move chat to project
  const moveChatToProject = (chatId: string, projectId: string) => {
    const projectStore = getProjectStore();
    const project = projectStore.items.find(p => p.id === projectId);
    
    if (!project) return false;

    // Add chat to project if not already there
    if (!project.chats.includes(chatId)) {
      const updatedProject = {
        ...project,
        chats: [...project.chats, chatId],
        updatedAt: new Date().toISOString()
      };

      const updatedProjectStore = {
        ...projectStore,
        items: projectStore.items.map(p => p.id === projectId ? updatedProject : p)
      };

      setProjectStore(updatedProjectStore);
      return true;
    }

    return false;
  };

  return {
    getChatStore,
    setChatStore,
    getProjectStore,
    setProjectStore,
    getLastTab,
    setLastTab,
    moveChatToProject,
  };
};
