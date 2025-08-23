export interface InviteRequest {
  email: string;
  displayName: string;
  role: 'admin' | 'adult' | 'kid' | 'guest';
}

export interface InviteResponse {
  ok: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

export interface RegisterRequest {
  code: string;
  username: string;
  pin: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: {
    username: string;
    displayName: string;
    role: 'admin' | 'adult' | 'kid' | 'guest';
  };
  error?: string;
}

export interface LoginRequest {
  username: string;
  pin: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  last_activity: string;
}

export interface ProjectsResponse {
  ok: boolean;
  projects?: Project[];
  error?: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  ok: boolean;
  messages?: ChatMessage[];
  error?: string;
}