import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  username: string;
  displayName: string;
  role: 'admin' | 'adult' | 'kid' | 'guest';
  pin?: string; // Only stored for admin
}

export interface SessionContextType {
  user: User | null;
  login: (user: User, pin?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (requiredRole: string | string[]) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_KEY = 'zandalee_session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        setUser(session.user);
      } catch (error) {
        console.error('Failed to parse stored session:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = (userData: User, pin?: string) => {
    const sessionUser = {
      ...userData,
      pin: userData.role === 'admin' ? pin : undefined
    };
    
    setUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: sessionUser }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const hasRole = (requiredRole: string | string[]) => {
    if (!user) return false;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  return (
    <SessionContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      hasRole
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}