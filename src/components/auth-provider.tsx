'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import request from '@/api/request';
import { clearAuthSession, normalizeAuthUser, readAuthSession, writeAuthSession, type AuthSessionUser } from '@/lib/auth-session';
import type { UserProfile } from '@/types/core';

export type AuthUser = AuthSessionUser;

type AuthContextValue = {
  user: AuthUser | null;
  token: string;
  userId: string;
  isLogin: boolean;
  loading: boolean;
  login: (user?: AuthUser | null, token?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, updateUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((nextUser: AuthUser | null, nextToken = '') => {
    const normalized = normalizeAuthUser(nextUser);
    const session = writeAuthSession({ user: normalized, token: nextToken });
    updateUser(session.user);
    setToken(session.token);
    setUserId(session.userId);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    const session = readAuthSession();
    let nextUser = session.user;
    try {
      if (session.user?.id) {
        const profileRes = await request.get('/profile');
        nextUser = profileRes?.user || profileRes?.profile || session.user;
      }
    } catch {
      nextUser = session.user;
    }
    persistSession(nextUser, session.token);
  }, [persistSession]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (nextUser?: AuthUser | null, nextToken = ''): Promise<void> => {
    const normalized = normalizeAuthUser(nextUser);
    persistSession(normalized, nextToken);
    setLoading(false);
  }, [persistSession]);

  const logout = useCallback(() => {
    clearAuthSession();
    updateUser(null);
    setToken('');
    setUserId('');
    setLoading(false);
  }, []);

  const setUser = useCallback((nextUser: AuthUser | null) => {
    const normalized = normalizeAuthUser(nextUser);
    persistSession(normalized, token);
  }, [persistSession, token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const session = readAuthSession();
      persistSession(session.user, session.token);
    } catch {
      persistSession(null, '');
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    userId,
    isLogin: Boolean(user?.id),
    loading,
    login,
    logout,
    refresh,
    refreshProfile,
    setUser
  }), [user, token, userId, loading, login, logout, refresh, refreshProfile, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuthStore must be used within AuthProvider');
  }
  return value;
}

export const useAuth = useAuthStore;
