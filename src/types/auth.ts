// Auth & Users API Contracts
export interface InviteRequest {
  familyName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
}

export interface InviteResponse {
  ok: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

export interface PendingInvite {
  code: string;
  familyName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
  createdAt: string;
  expiresAt: string;
}

export interface InvitesResponse {
  ok: boolean;
  invites?: PendingInvite[];
  error?: string;
}

export interface RevokeInviteRequest {
  code: string;
}

export interface RegisterRequest {
  code: string;
  familyName: string;
  passwordOrPin: string;
}

export interface LoginRequest {
  familyName: string;
  passwordOrPin: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: {
    familyName: string;
    role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
  };
  error?: string;
}

export interface FamilyMember {
  familyName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
  createdAt: string;
}

export interface FamilyMembersResponse {
  ok: boolean;
  users?: FamilyMember[];
  error?: string;
}

export interface UpdateRoleRequest {
  familyName: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
}

export interface ResetPasswordRequest {
  familyName: string;
}

export interface ResetPasswordResponse {
  ok: boolean;
  tempPasswordOrPin?: string;
  error?: string;
}

export interface RemoveUserRequest {
  familyName: string;
}

// Projects API Contracts (per-user scope)
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
}

export interface ProjectsResponse {
  ok: boolean;
  projects?: Project[];
  error?: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface ProjectChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  authorFamilyName?: string;
}

export interface ProjectChatResponse {
  ok: boolean;
  messages?: ProjectChatMessage[];
  error?: string;
}

export interface ProjectChatRequest {
  role: 'user' | 'assistant';
  content: string;
}

// Shared Family Space API Contracts
export interface SharedChatMessage {
  id: string;
  authorFamilyName: string;
  content: string;
  ts: string;
}

export interface SharedChatResponse {
  ok: boolean;
  messages?: SharedChatMessage[];
  error?: string;
}

export interface SharedChatRequest {
  content: string;
}

export interface SharedDocument {
  name: string;
  size: number;
  uploadedAt: string;
  uploaderFamilyName: string;
  path: string;
}

export interface SharedDocsResponse {
  ok: boolean;
  docs?: SharedDocument[];
  error?: string;
}

export interface SharedUploadResponse {
  ok: boolean;
  files?: { name: string; path: string; size: number }[];
  error?: string;
}

export interface SharedDeleteRequest {
  path: string;
}

// General response type
export interface ApiResponse {
  ok: boolean;
  error?: string;
}