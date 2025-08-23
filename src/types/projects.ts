export type Role = "user" | "assistant" | "system";

export interface Project { 
  id: string; 
  name: string; 
  archived?: boolean; 
  createdAt: string; 
  lastActivity?: string;
}

export interface Thread { 
  id: string; 
  title?: string; 
  pinned?: boolean; 
  archived?: boolean; 
  createdAt: string; 
  updatedAt: string; 
  summary?: string;
}

export interface ChatMessage { 
  id: string; 
  role: Role; 
  content: string; 
  ts: string; 
  authorFamilyName?: string;
}

export interface ProjectsStore {
  activeProjectId: string;         // "default" initially
  list: Project[];
}

export interface ChatStore {
  activeThreadId: string | null;
  threads: Thread[];               // for active project
  messages: Record<string, ChatMessage[]>; // keyed by threadId
  draftByThread: Record<string, string>;   // autosave
}