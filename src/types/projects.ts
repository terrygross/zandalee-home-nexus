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
  activeProjectId: string;
  list: Project[];
}

export interface ChatStore {
  activeThreadId: string | null;
  threads: Thread[];
  messages: Record<string, ChatMessage[]>;
  draftByThread: Record<string, string>;
}

// API Response types
export interface ProjectsResponse {
  ok: boolean;
  projects?: Project[];
  project?: Project;
  error?: string;
}

export interface ThreadsResponse {
  ok: boolean;
  threads?: Thread[];
  thread?: Thread;
  error?: string;
}

export interface MessagesResponse {
  ok: boolean;
  messages?: ChatMessage[];
  id?: string;
  error?: string;
}