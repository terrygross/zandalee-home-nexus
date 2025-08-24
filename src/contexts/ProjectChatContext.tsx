
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, Thread, ChatMessage, ProjectsStore, ChatStore } from '@/types/projects';
import { useSession } from './SessionContext';

interface ProjectChatContextType {
  // Project state
  projects: ProjectsStore;
  setActiveProject: (projectId: string) => void;
  createProject: (name: string) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  archiveProject: (id: string, archived: boolean) => Promise<void>;
  
  // Chat state
  chat: ChatStore;
  setActiveThread: (threadId: string | null) => void;
  createThread: (title?: string) => Promise<Thread>;
  pinThread: (threadId: string, pinned: boolean) => Promise<void>;
  archiveThread: (threadId: string, archived: boolean) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  
  // Messages
  getThreadMessages: (threadId: string) => ChatMessage[];
  addMessage: (threadId: string, message: ChatMessage) => void;
  
  // Draft management
  saveDraft: (threadId: string, content: string) => void;
  getDraft: (threadId: string) => string;
  clearDraft: (threadId: string) => void;
}

const ProjectChatContext = createContext<ProjectChatContextType | null>(null);

export const useProjectChat = () => {
  const context = useContext(ProjectChatContext);
  if (!context) {
    throw new Error('useProjectChat must be used within a ProjectChatProvider');
  }
  return context;
};

interface ProjectChatProviderProps {
  children: ReactNode;
}

export const ProjectChatProvider: React.FC<ProjectChatProviderProps> = ({ children }) => {
  const { user } = useSession();
  const familyName = user?.familyName || 'default';
  
  const [projects, setProjects] = useState<ProjectsStore>({
    activeProjectId: 'default',
    list: []
  });
  
  const [chat, setChat] = useState<ChatStore>({
    activeThreadId: null,
    threads: [],
    messages: {},
    draftByThread: {}
  });

  // Initialize default project
  useEffect(() => {
    const defaultProject: Project = {
      id: 'default',
      name: 'Default Project',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    // Load from localStorage or create default
    const savedProjects = localStorage.getItem(`projects_${familyName}`);
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects);
      setProjects(parsed);
    } else {
      setProjects({
        activeProjectId: 'default',
        list: [defaultProject]
      });
    }
    
    // Load chat data
    const savedChat = localStorage.getItem(`chat_${familyName}`);
    if (savedChat) {
      const parsed = JSON.parse(savedChat);
      setChat(parsed);
    }
  }, [familyName]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(`projects_${familyName}`, JSON.stringify(projects));
  }, [projects, familyName]);

  useEffect(() => {
    localStorage.setItem(`chat_${familyName}`, JSON.stringify(chat));
  }, [chat, familyName]);

  const setActiveProject = (projectId: string) => {
    setProjects(prev => ({ ...prev, activeProjectId: projectId }));
    // Load threads for this project
    const savedThreads = localStorage.getItem(`threads_${familyName}_${projectId}`);
    if (savedThreads) {
      const threads = JSON.parse(savedThreads);
      setChat(prev => ({ ...prev, threads, activeThreadId: null }));
    } else {
      setChat(prev => ({ ...prev, threads: [], activeThreadId: null }));
    }
  };

  const createProject = async (name: string): Promise<Project> => {
    const newProject: Project = {
      id: `project_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    setProjects(prev => ({
      ...prev,
      list: [...prev.list, newProject]
    }));
    
    return newProject;
  };

  const renameProject = async (id: string, name: string): Promise<void> => {
    setProjects(prev => ({
      ...prev,
      list: prev.list.map(p => p.id === id ? { ...p, name } : p)
    }));
  };

  const archiveProject = async (id: string, archived: boolean): Promise<void> => {
    setProjects(prev => ({
      ...prev,
      list: prev.list.map(p => p.id === id ? { ...p, archived } : p)
    }));
  };

  const setActiveThread = (threadId: string | null) => {
    setChat(prev => ({ ...prev, activeThreadId: threadId }));
  };

  const createThread = async (title?: string): Promise<Thread> => {
    const newThread: Thread = {
      id: `thread_${Date.now()}`,
      title: title || 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setChat(prev => ({
      ...prev,
      threads: [newThread, ...prev.threads],
      activeThreadId: newThread.id
    }));
    
    // Save threads for current project
    const updatedThreads = [newThread, ...chat.threads];
    localStorage.setItem(`threads_${familyName}_${projects.activeProjectId}`, JSON.stringify(updatedThreads));
    
    return newThread;
  };

  const pinThread = async (threadId: string, pinned: boolean): Promise<void> => {
    setChat(prev => ({
      ...prev,
      threads: prev.threads.map(t => t.id === threadId ? { ...t, pinned } : t)
    }));
  };

  const archiveThread = async (threadId: string, archived: boolean): Promise<void> => {
    setChat(prev => ({
      ...prev,
      threads: prev.threads.map(t => t.id === threadId ? { ...t, archived } : t)
    }));
  };

  const deleteThread = async (threadId: string): Promise<void> => {
    setChat(prev => ({
      ...prev,
      threads: prev.threads.filter(t => t.id !== threadId),
      activeThreadId: prev.activeThreadId === threadId ? null : prev.activeThreadId
    }));
    
    // Remove messages for this thread
    setChat(prev => {
      const newMessages = { ...prev.messages };
      delete newMessages[threadId];
      return { ...prev, messages: newMessages };
    });
  };

  const getThreadMessages = (threadId: string): ChatMessage[] => {
    return chat.messages[threadId] || [];
  };

  const addMessage = (threadId: string, message: ChatMessage) => {
    setChat(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [threadId]: [...(prev.messages[threadId] || []), message]
      }
    }));
    
    // Update thread title from first user message - safely handle undefined content
    if (message.role === 'user' && !getThreadMessages(threadId).some(m => m.role === 'user')) {
      const messageContent = message.content || '';
      const title = messageContent.slice(0, 60) + (messageContent.length > 60 ? '...' : '');
      setChat(prev => ({
        ...prev,
        threads: prev.threads.map(t => t.id === threadId ? { ...t, title, updatedAt: new Date().toISOString() } : t)
      }));
    }
  };

  const saveDraft = (threadId: string, content: string) => {
    setChat(prev => ({
      ...prev,
      draftByThread: {
        ...prev.draftByThread,
        [threadId]: content
      }
    }));
  };

  const getDraft = (threadId: string): string => {
    return chat.draftByThread[threadId] || '';
  };

  const clearDraft = (threadId: string) => {
    setChat(prev => {
      const newDrafts = { ...prev.draftByThread };
      delete newDrafts[threadId];
      return { ...prev, draftByThread: newDrafts };
    });
  };

  return (
    <ProjectChatContext.Provider value={{
      projects,
      setActiveProject,
      createProject,
      renameProject,
      archiveProject,
      chat,
      setActiveThread,
      createThread,
      pinThread,
      archiveThread,
      deleteThread,
      getThreadMessages,
      addMessage,
      saveDraft,
      getDraft,
      clearDraft
    }}>
      {children}
    </ProjectChatContext.Provider>
  );
};
