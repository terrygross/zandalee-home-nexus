import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from 'usehooks-ts';

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatItem {
  id: string;
  title: string;
  projectId: string;
  createdAt: string;
  messages: ChatMessage[];
}

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  chatIds: string[];
}

interface ChatStore {
  chats: { [chatId: string]: ChatItem };
}

interface ProjectStore {
  projects: { [projectId: string]: ProjectItem };
}

const initialChatStore: ChatStore = { chats: {} };
const initialProjectStore: ProjectStore = { projects: {} };

const CHAT_STORAGE_KEY = 'zandalee-chats';
const PROJECT_STORAGE_KEY = 'zandalee-projects';

const getChatStore = (): ChatStore => {
  try {
    const storedChats = localStorage.getItem(CHAT_STORAGE_KEY);
    return storedChats ? JSON.parse(storedChats) : initialChatStore;
  } catch (error) {
    console.error("Error retrieving chats from localStorage:", error);
    return initialChatStore;
  }
};

const setChatStore = (store: ChatStore): void => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error setting chats to localStorage:", error);
  }
};

const getProjectStore = (): ProjectStore => {
  try {
    const storedProjects = localStorage.getItem(PROJECT_STORAGE_KEY);
    return storedProjects ? JSON.parse(storedProjects) : initialProjectStore;
  } catch (error) {
    console.error("Error retrieving projects from localStorage:", error);
    return initialProjectStore;
  }
};

const setProjectStore = (store: ProjectStore): void => {
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
      messages: [],
    };

    const store = getChatStore();
    store.chats[chatId] = newChat;
    setChatStore(store);

    return chatId;
  };

  const addMessageToChat = (chatId: string, message: ChatMessage): void => {
    const store = getChatStore();
    if (store.chats[chatId]) {
      store.chats[chatId].messages.push(message);
      setChatStore(store);
    } else {
      console.warn(`Chat with id ${chatId} not found.`);
    }
  };

  const getChatMessages = (chatId: string): ChatMessage[] => {
    const store = getChatStore();
    return store.chats[chatId]?.messages || [];
  };

  const getChat = (chatId: string): ChatItem | undefined => {
     const store = getChatStore();
     return store.chats[chatId];
  };

  const setChatTitle = (chatId: string, title: string): void => {
    const store = getChatStore();
    if (store.chats[chatId]) {
      store.chats[chatId].title = title;
      setChatStore(store);
    }
  };

  const getAllChats = (): ChatItem[] => {
    const store = getChatStore();
    return Object.values(store.chats);
  };

  const createNewProject = (): string => {
    const projectId = `project-${Date.now()}`;
    const newProject: ProjectItem = {
      id: projectId,
      title: "New Project",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatIds: []
    };
    
    const store = getProjectStore();
    store.projects[projectId] = newProject;
    setProjectStore(store);
    
    return projectId;
  };

  return {
    createNewChat,
    addMessageToChat,
    getChatMessages,
    getChat,
    setChatTitle,
    getAllChats,
    createNewProject,
  };
};
