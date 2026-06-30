'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import request from '@/api/request';
import { clearAuthSession, normalizeAuthUser, readAuthSession, writeAuthSession, type AuthSessionUser } from '@/lib/auth-session';

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
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function emitAuthEvents() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('auth:changed'));
  window.dispatchEvent(new Event('USER_UPDATED'));
  window.dispatchEvent(new Event('PROFILE_UPDATED'));
  window.dispatchEvent(new Event('workspace-profile-updated'));
  window.dispatchEvent(new Event('workspace-data-updated'));
  window.dispatchEvent(new Event('workspace-goal-updated'));
}

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

  const refresh = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    const session = readAuthSession();
    let nextUser = session.user;
    try {
      if (session.user?.id) {
        const profileRes = await request.get('/profile');
        nextUser = profileRes?.profile || profileRes?.user || session.user;
      }
    } catch {
      nextUser = session.user;
    }
    persistSession(nextUser, session.token);
  }, [persistSession]);

  const login = useCallback(async (nextUser?: AuthUser | null, nextToken = ''): Promise<void> => {
    const normalized = normalizeAuthUser(nextUser);
    persistSession(normalized, nextToken);
    setLoading(false);
    emitAuthEvents();
  }, [persistSession]);

  const logout = useCallback(() => {
    clearAuthSession();
    updateUser(null);
    setToken('');
    setUserId('');
    setLoading(false);
    emitAuthEvents();
  }, []);

  const setUser = useCallback((nextUser: AuthUser | null) => {
    const normalized = normalizeAuthUser(nextUser);
    persistSession(normalized, token);
    emitAuthEvents();
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

    const handleSync = () => {
      refresh().catch(() => {});
    };

    window.addEventListener('PROFILE_UPDATED', handleSync);
    window.addEventListener('USER_UPDATED', handleSync);
    window.addEventListener('workspace-profile-updated', handleSync);
    window.addEventListener('workspace-data-updated', handleSync);
    window.addEventListener('workspace-goal-updated', handleSync);

    return () => {
      window.removeEventListener('PROFILE_UPDATED', handleSync);
      window.removeEventListener('USER_UPDATED', handleSync);
      window.removeEventListener('workspace-profile-updated', handleSync);
      window.removeEventListener('workspace-data-updated', handleSync);
      window.removeEventListener('workspace-goal-updated', handleSync);
    };
  }, [persistSession, refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    userId,
    isLogin: Boolean(user?.id),
    loading,
    login,
    logout,
    refresh,
    setUser
  }), [user, token, userId, loading, login, logout, refresh, setUser]);

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
