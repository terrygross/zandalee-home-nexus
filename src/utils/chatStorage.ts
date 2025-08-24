
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

  // Create new chat function
  const createNewChat = (): string => {
    const chatStore = getChatStore();
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newChat: ChatItem = {
      id: newChatId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedStore: ChatStore = {
      activeChatId: newChatId,
      items: [newChat, ...chatStore.items]
    };

    setChatStore(updatedStore);
    return newChatId;
  };

  // Create new project function
  const createProject = (name = 'New Project'): string => {
    const projectStore = getProjectStore();
    const newProjectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newProject: ProjectItem = {
      id: newProjectId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chats: []
    };

    const updatedStore: ProjectStore = {
      selectedProjectId: newProjectId,
      items: [newProject, ...projectStore.items]
    };

    setProjectStore(updatedStore);
    return newProjectId;
  };

  // Delete chat function
  const deleteChat = (chatId: string) => {
    const chatStore = getChatStore();
    const updatedStore: ChatStore = {
      ...chatStore,
      items: chatStore.items.filter(chat => chat.id !== chatId),
      activeChatId: chatStore.activeChatId === chatId ? null : chatStore.activeChatId
    };
    setChatStore(updatedStore);
  };

  // Delete project function
  const deleteProject = (projectId: string) => {
    const projectStore = getProjectStore();
    const updatedStore: ProjectStore = {
      ...projectStore,
      items: projectStore.items.filter(project => project.id !== projectId),
      selectedProjectId: projectStore.selectedProjectId === projectId ? null : projectStore.selectedProjectId
    };
    setProjectStore(updatedStore);
  };

  // Duplicate chat function
  const duplicateChat = (chatId: string) => {
    const chatStore = getChatStore();
    const originalChat = chatStore.items.find(chat => chat.id === chatId);
    if (!originalChat) return;

    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duplicatedChat: ChatItem = {
      ...originalChat,
      id: newChatId,
      title: `${originalChat.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedStore: ChatStore = {
      ...chatStore,
      items: [duplicatedChat, ...chatStore.items]
    };

    setChatStore(updatedStore);
  };

  // Rename chat function
  const renameChat = (chatId: string, newTitle: string) => {
    const chatStore = getChatStore();
    const updatedStore: ChatStore = {
      ...chatStore,
      items: chatStore.items.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle, updatedAt: new Date().toISOString() }
          : chat
      )
    };
    setChatStore(updatedStore);
  };

  // Rename project function
  const renameProject = (projectId: string, newName: string) => {
    const projectStore = getProjectStore();
    const updatedStore: ProjectStore = {
      ...projectStore,
      items: projectStore.items.map(project => 
        project.id === projectId 
          ? { ...project, name: newName, updatedAt: new Date().toISOString() }
          : project
      )
    };
    setProjectStore(updatedStore);
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
    createNewChat,
    createProject,
    deleteChat,
    deleteProject,
    duplicateChat,
    renameChat,
    renameProject,
    moveChatToProject,
  };
};
