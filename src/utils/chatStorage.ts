
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from 'usehooks-ts';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatItem {
  id: string;
  title: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ProjectItem {
  id: string;
  name: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  chatIds: string[];
  chats: ChatItem[];
}

export interface ChatStore {
  items: ChatItem[];
}

export interface ProjectStore {
  items: ProjectItem[];
}

const initialChatStore: ChatStore = { items: [] };
const initialProjectStore: ProjectStore = { items: [] };

const CHAT_STORAGE_KEY = 'zandalee-chats';
const PROJECT_STORAGE_KEY = 'zandalee-projects';

const getChatStoreFromStorage = (): ChatStore => {
  try {
    const storedChats = localStorage.getItem(CHAT_STORAGE_KEY);
    return storedChats ? JSON.parse(storedChats) : initialChatStore;
  } catch (error) {
    console.error("Error retrieving chats from localStorage:", error);
    return initialChatStore;
  }
};

const setChatStoreToStorage = (store: ChatStore): void => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error setting chats to localStorage:", error);
  }
};

const getProjectStoreFromStorage = (): ProjectStore => {
  try {
    const storedProjects = localStorage.getItem(PROJECT_STORAGE_KEY);
    return storedProjects ? JSON.parse(storedProjects) : initialProjectStore;
  } catch (error) {
    console.error("Error retrieving projects from localStorage:", error);
    return initialProjectStore;
  }
};

const setProjectStoreToStorage = (store: ProjectStore): void => {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error setting projects to localStorage:", error);
  }
};

export const useChatStorage = () => {
  const createNewChat = (): string => {
    const chatId = `chat-${Date.now()}`;
    const newChat: ChatItem = {
      id: chatId,
      title: "New Chat",
      projectId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const store = getChatStoreFromStorage();
    store.items.push(newChat);
    setChatStoreToStorage(store);

    return chatId;
  };

  const addMessageToChat = (chatId: string, message: ChatMessage): void => {
    const store = getChatStoreFromStorage();
    const chat = store.items.find(c => c.id === chatId);
    if (chat) {
      chat.messages.push(message);
      chat.updatedAt = new Date().toISOString();
      setChatStoreToStorage(store);
    } else {
      console.warn(`Chat with id ${chatId} not found.`);
    }
  };

  const getChatMessages = (chatId: string): ChatMessage[] => {
    const store = getChatStoreFromStorage();
    const chat = store.items.find(c => c.id === chatId);
    return chat?.messages || [];
  };

  const getChat = (chatId: string): ChatItem | undefined => {
     const store = getChatStoreFromStorage();
     return store.items.find(c => c.id === chatId);
  };

  const setChatTitle = (chatId: string, title: string): void => {
    const store = getChatStoreFromStorage();
    const chat = store.items.find(c => c.id === chatId);
    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date().toISOString();
      setChatStoreToStorage(store);
    }
  };

  const getAllChats = (): ChatItem[] => {
    const store = getChatStoreFromStorage();
    return store.items;
  };

  const createNewProject = (): string => {
    const projectId = `project-${Date.now()}`;
    const newProject: ProjectItem = {
      id: projectId,
      name: "New Project",
      title: "New Project",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatIds: [],
      chats: []
    };
    
    const store = getProjectStoreFromStorage();
    store.items.push(newProject);
    setProjectStoreToStorage(store);
    
    return projectId;
  };

  const getChatStore = (): ChatStore => {
    return getChatStoreFromStorage();
  };

  const setChatStore = (store: ChatStore): void => {
    setChatStoreToStorage(store);
  };

  const getProjectStore = (): ProjectStore => {
    return getProjectStoreFromStorage();
  };

  const setProjectStore = (store: ProjectStore): void => {
    setProjectStoreToStorage(store);
  };

  const createProject = (): string => {
    return createNewProject();
  };

  const deleteChat = (chatId: string): void => {
    const store = getChatStoreFromStorage();
    store.items = store.items.filter(chat => chat.id !== chatId);
    setChatStoreToStorage(store);
  };

  const deleteProject = (projectId: string): void => {
    const store = getProjectStoreFromStorage();
    store.items = store.items.filter(project => project.id !== projectId);
    setProjectStoreToStorage(store);
  };

  const duplicateChat = (chatId: string): string => {
    const store = getChatStoreFromStorage();
    const originalChat = store.items.find(c => c.id === chatId);
    if (originalChat) {
      const newChatId = `chat-${Date.now()}`;
      const duplicatedChat: ChatItem = {
        ...originalChat,
        id: newChatId,
        title: `${originalChat.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.items.push(duplicatedChat);
      setChatStoreToStorage(store);
      return newChatId;
    }
    return '';
  };

  const renameChat = (chatId: string, newName: string): void => {
    setChatTitle(chatId, newName);
  };

  const renameProject = (projectId: string, newName: string): void => {
    const store = getProjectStoreFromStorage();
    const project = store.items.find(p => p.id === projectId);
    if (project) {
      project.name = newName;
      project.title = newName;
      project.updatedAt = new Date().toISOString();
      setProjectStoreToStorage(store);
    }
  };

  const moveChatToProject = (chatId: string, projectId: string): boolean => {
    const chatStore = getChatStoreFromStorage();
    const chat = chatStore.items.find(c => c.id === chatId);
    if (chat) {
      chat.projectId = projectId;
      chat.updatedAt = new Date().toISOString();
      setChatStoreToStorage(chatStore);
      return true;
    }
    return false;
  };

  return {
    createNewChat,
    addMessageToChat,
    getChatMessages,
    getChat,
    setChatTitle,
    getAllChats,
    createNewProject,
    getChatStore,
    setChatStore,
    getProjectStore,
    setProjectStore,
    createProject,
    deleteChat,
    deleteProject,
    duplicateChat,
    renameChat,
    renameProject,
    moveChatToProject,
  };
};
