import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Project, Thread, ChatMessage, ProjectsResponse, ThreadsResponse, MessagesResponse } from '@/types/projects';

export const useProjects = () => {
  const { user } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);  
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [draftByThread, setDraftByThread] = useState<Record<string, string>>({});

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User': user?.familyName || 'default',
    'X-Project': activeProjectId,
    ...(user?.pin && { 'X-PIN': user.pin })
  });

  // Mock data for when backend isn't available
  const mockProjects: Project[] = [
    { 
      id: 'default', 
      name: 'Default Project', 
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString() 
    }
  ];

  const mockThreads: Thread[] = [
    {
      id: 'thread-1',
      title: 'General Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: 'General conversation thread'
    }
  ];

  // Initialize default project
  useEffect(() => {
    const initializeProjects = async () => {
      try {
        const projectList = await listProjects();
        if (projectList.length === 0) {
          await createProject('Default Project');
        }
      } catch (error) {
        console.warn('Using mock data:', error);
        setProjects(mockProjects);
      }
    };

    if (user) {
      initializeProjects();
    }
  }, [user]);

  // Load threads when project changes
  useEffect(() => {
    if (activeProjectId) {
      loadThreads();
    }
  }, [activeProjectId]);

  const loadThreads = async () => {
    try {
      const threadList = await listThreads(activeProjectId);
      if (threadList.length === 0 && activeProjectId) {
        // Create first thread if none exist
        await createThread(activeProjectId, 'General Conversation');
      }
    } catch (error) {
      console.warn('Using mock threads:', error);
      setThreads(mockThreads);
      setActiveThreadId('thread-1');
    }
  };

  // Projects API
  const listProjects = async (): Promise<Project[]> => {
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        headers: getHeaders()
      });
      
      if (response.status === 404) {
        // Backend not ready, use localStorage
        const stored = localStorage.getItem(`projects_${user?.familyName}`);
        const projects = stored ? JSON.parse(stored) : mockProjects;
        setProjects(projects);
        return projects;
      }

      const data: ProjectsResponse = await response.json();
      if (data.ok && data.projects) {
        setProjects(data.projects);
        return data.projects;
      }
      throw new Error(data.error || 'Failed to load projects');
    } catch (error) {
      console.warn('Projects API error, using localStorage:', error);
      const stored = localStorage.getItem(`projects_${user?.familyName}`);
      const projects = stored ? JSON.parse(stored) : mockProjects;
      setProjects(projects);
      return projects;
    }
  };

  const createProject = async (name: string): Promise<Project> => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
        setActiveProjectId(newProject.id);
        return newProject;
      }

      const data: ProjectsResponse = await response.json();
      if (data.ok && data.project) {
        const updatedProjects = [...projects, data.project];
        setProjects(updatedProjects);
        setActiveProjectId(data.project.id);
        return data.project;
      }
      throw new Error(data.error || 'Failed to create project');
    } catch (error) {
      console.warn('Create project API error, using localStorage:', error);
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
      setActiveProjectId(newProject.id);
      return newProject;
    }
  };

  const renameProject = async (id: string, name: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/projects/rename`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id, name })
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const updatedProjects = projects.map(p => p.id === id ? { ...p, name } : p);
        setProjects(updatedProjects);
        localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
        return;
      }

      const data: ProjectsResponse = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to rename project');
      }
      
      const updatedProjects = projects.map(p => p.id === id ? { ...p, name } : p);
      setProjects(updatedProjects);
    } catch (error) {
      console.warn('Rename project API error, using localStorage:', error);
      const updatedProjects = projects.map(p => p.id === id ? { ...p, name } : p);
      setProjects(updatedProjects);
      localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
    }
  };

  const setProjectArchived = async (id: string, archived: boolean): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/projects/archive`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id, archived })
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const updatedProjects = projects.map(p => p.id === id ? { ...p, archived } : p);
        setProjects(updatedProjects);
        localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
        return;
      }

      const data: ProjectsResponse = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to archive project');
      }
      
      const updatedProjects = projects.map(p => p.id === id ? { ...p, archived } : p);
      setProjects(updatedProjects);
    } catch (error) {
      console.warn('Archive project API error, using localStorage:', error);
      const updatedProjects = projects.map(p => p.id === id ? { ...p, archived } : p);
      setProjects(updatedProjects);
      localStorage.setItem(`projects_${user?.familyName}`, JSON.stringify(updatedProjects));
    }
  };

  // Threads API
  const listThreads = async (projectId: string, filter?: string, query?: string): Promise<Thread[]> => {
    try {
      let url = `${API_BASE}/projects/${projectId}/threads`;
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (query) params.append('query', query);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const stored = localStorage.getItem(`threads_${user?.familyName}_${projectId}`);
        const threads = stored ? JSON.parse(stored) : [];
        setThreads(threads);
        return threads;
      }

      const data: ThreadsResponse = await response.json();
      if (data.ok && data.threads) {
        setThreads(data.threads);
        return data.threads;
      }
      throw new Error(data.error || 'Failed to load threads');
    } catch (error) {
      console.warn('Threads API error, using localStorage:', error);
      const stored = localStorage.getItem(`threads_${user?.familyName}_${projectId}`);
      const threads = stored ? JSON.parse(stored) : [];
      setThreads(threads);
      return threads;
    }
  };

  const createThread = async (projectId: string, title?: string): Promise<Thread> => {
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      title: title || 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/threads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title })
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const updatedThreads = [...threads, newThread];
        setThreads(updatedThreads);
        localStorage.setItem(`threads_${user?.familyName}_${projectId}`, JSON.stringify(updatedThreads));
        setActiveThreadId(newThread.id);
        return newThread;
      }

      const data: ThreadsResponse = await response.json();
      if (data.ok && data.thread) {
        const updatedThreads = [...threads, data.thread];
        setThreads(updatedThreads);
        setActiveThreadId(data.thread.id);
        return data.thread;
      }
      throw new Error(data.error || 'Failed to create thread');
    } catch (error) {
      console.warn('Create thread API error, using localStorage:', error);
      const updatedThreads = [...threads, newThread];
      setThreads(updatedThreads);
      localStorage.setItem(`threads_${user?.familyName}_${projectId}`, JSON.stringify(updatedThreads));
      setActiveThreadId(newThread.id);
      return newThread;
    }
  };

  // Messages API
  const listMessages = async (projectId: string, threadId: string): Promise<ChatMessage[]> => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/threads/${threadId}/messages`, {
        headers: getHeaders()
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const stored = localStorage.getItem(`messages_${user?.familyName}_${projectId}_${threadId}`);
        const msgs = stored ? JSON.parse(stored) : [];
        setMessages(prev => ({ ...prev, [threadId]: msgs }));
        return msgs;
      }

      const data: MessagesResponse = await response.json();
      if (data.ok && data.messages) {
        setMessages(prev => ({ ...prev, [threadId]: data.messages! }));
        return data.messages;
      }
      throw new Error(data.error || 'Failed to load messages');
    } catch (error) {
      console.warn('Messages API error, using localStorage:', error);
      const stored = localStorage.getItem(`messages_${user?.familyName}_${projectId}_${threadId}`);
      const msgs = stored ? JSON.parse(stored) : [];
      setMessages(prev => ({ ...prev, [threadId]: msgs }));
      return msgs;
    }
  };

  const sendMessage = async (projectId: string, threadId: string, role: "user" | "assistant", content: string): Promise<string> => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role,
      content,
      ts: new Date().toISOString(),
      authorFamilyName: user?.familyName
    };

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/threads/${threadId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ role, content })
      });

      if (response.status === 404) {
        // Backend not ready, use localStorage
        const currentMessages = messages[threadId] || [];
        const updatedMessages = [...currentMessages, newMessage];
        setMessages(prev => ({ ...prev, [threadId]: updatedMessages }));
        localStorage.setItem(`messages_${user?.familyName}_${projectId}_${threadId}`, JSON.stringify(updatedMessages));
        return newMessage.id;
      }

      const data: MessagesResponse = await response.json();
      if (data.ok && data.id) {
        const currentMessages = messages[threadId] || [];
        setMessages(prev => ({ ...prev, [threadId]: [...currentMessages, { ...newMessage, id: data.id! }] }));
        return data.id;
      }
      throw new Error(data.error || 'Failed to send message');
    } catch (error) {
      console.warn('Send message API error, using localStorage:', error);
      const currentMessages = messages[threadId] || [];
      const updatedMessages = [...currentMessages, newMessage];
      setMessages(prev => ({ ...prev, [threadId]: updatedMessages }));
      localStorage.setItem(`messages_${user?.familyName}_${projectId}_${threadId}`, JSON.stringify(updatedMessages));
      return newMessage.id;
    }
  };

  // Draft management
  const saveDraft = (threadId: string, content: string) => {
    const key = `${user?.familyName}/${activeProjectId}/${threadId}/draft`;
    if (content.trim()) {
      localStorage.setItem(key, content);
      setDraftByThread(prev => ({ ...prev, [threadId]: content }));
    } else {
      localStorage.removeItem(key);
      setDraftByThread(prev => {
        const { [threadId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const loadDraft = (threadId: string): string => {
    const key = `${user?.familyName}/${activeProjectId}/${threadId}/draft`;
    return localStorage.getItem(key) || '';
  };

  const clearDraft = (threadId: string) => {
    const key = `${user?.familyName}/${activeProjectId}/${threadId}/draft`;
    localStorage.removeItem(key);
    setDraftByThread(prev => {
      const { [threadId]: removed, ...rest } = prev;
      return rest;
    });
  };

  return {
    // State
    projects,
    activeProjectId,
    threads,
    activeThreadId,
    messages,
    draftByThread,
    
    // Actions
    setActiveProjectId,
    setActiveThreadId,
    
    // Projects
    listProjects,
    createProject,
    renameProject,
    setProjectArchived,
    
    // Threads
    listThreads,
    createThread,
    
    // Messages
    listMessages,
    sendMessage,
    
    // Drafts
    saveDraft,
    loadDraft,
    clearDraft
  };
};