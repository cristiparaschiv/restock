'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPreferences } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, language: string) => Promise<void>;
  logout: () => void;
  updateLanguage: (language: string) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (api.isAuthenticated()) {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch {
        api.logout();
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    const userData = await api.getCurrentUser();
    setUser(userData);
  };

  const register = async (email: string, password: string, language: string) => {
    await api.register(email, password, language);
    const userData = await api.getCurrentUser();
    setUser(userData);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const updateLanguage = async (language: string) => {
    const updatedUser = await api.updateUserPreferences(language);
    setUser(updatedUser);
  };

  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    const updatedUser = await api.updateUserPreferences(undefined, preferences);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateLanguage,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
