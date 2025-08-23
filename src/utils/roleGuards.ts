import { User } from '@/contexts/SessionContext';

export const ROLE_HIERARCHY = {
  admin: 4,
  adult: 3,
  kid: 2,
  guest: 1
} as const;

export function hasRole(user: User | null, requiredRole: string | string[]): boolean {
  if (!user) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

export function hasMinimumRole(user: User | null, minimumRole: keyof typeof ROLE_HIERARCHY): boolean {
  if (!user) return false;
  
  const userLevel = ROLE_HIERARCHY[user.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  
  return userLevel >= requiredLevel;
}

export function canAccessHands(user: User | null): boolean {
  if (!user) return false;
  return ['admin', 'adult', 'kid'].includes(user.role);
}

export function canAccessSettings(user: User | null): boolean {
  return hasRole(user, 'admin');
}

export function canInviteUsers(user: User | null): boolean {
  return hasRole(user, 'admin');
}

export function canAccessVoiceSelection(user: User | null): boolean {
  return hasRole(user, 'admin');
}

export function canAccessDocs(user: User | null): boolean {
  if (!user) return false;
  return ['admin', 'adult', 'kid'].includes(user.role);
}