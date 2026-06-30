export type AuthSessionUser = {
  id: string;
  name: string;
  nickname?: string;
  avatar?: string;
  identity?: string;
  profession?: string;
  goal?: string;
  goalTargetDate?: string;
};

export type AuthSession = {
  user: AuthSessionUser | null;
  token: string;
  userId: string;
};

const AUTH_SESSION_KEY = 'authSession';
const AUTH_USER_KEY = 'authUser';
const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_ID_KEY = 'userId';

export function normalizeAuthUser(raw: any): AuthSessionUser | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    name: raw.name || raw.nickname || '未命名用户',
    nickname: raw.nickname || raw.name || '未命名用户',
    avatar: raw.avatar || (raw.name || raw.nickname || '未').slice(0, 1),
    identity: raw.identity || '',
    profession: raw.profession || '',
    goal: raw.goal || '',
    goalTargetDate: raw.goalTargetDate || raw.goal_target_date || ''
  };
}

function readLegacySession(): AuthSession {
  if (typeof window === 'undefined') {
    return { user: null, token: '', userId: '' };
  }

  const rawUser = window.localStorage.getItem(AUTH_USER_KEY);
  const rawToken = window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
  const rawUserId = window.localStorage.getItem(AUTH_USER_ID_KEY) || '';
  const user = normalizeAuthUser(rawUser ? JSON.parse(rawUser) : null);
  return {
    user,
    token: rawToken,
    userId: user?.id || rawUserId || ''
  };
}

export function readAuthSession(): AuthSession {
  if (typeof window === 'undefined') {
    return { user: null, token: '', userId: '' };
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      const user = normalizeAuthUser(parsed.user);
      const token = String(parsed.token || '');
      const userId = String(parsed.userId || user?.id || '');
      if (user || token || userId) {
        return { user, token, userId };
      }
    } catch {
      // Fall back to legacy keys below.
    }
  }

  return readLegacySession();
}

export function writeAuthSession(nextSession: { user: AuthSessionUser | null; token?: string }): AuthSession {
  const user = normalizeAuthUser(nextSession.user);
  const token = String(nextSession.token || '');
  const session: AuthSession = {
    user,
    token,
    userId: user?.id || ''
  };

  if (typeof window !== 'undefined') {
    if (session.user) {
      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
      window.localStorage.setItem(AUTH_USER_ID_KEY, session.userId);
    } else {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem(AUTH_USER_ID_KEY);
    }

    if (session.token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  return session;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(AUTH_USER_ID_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders() {
  const { token, userId } = readAuthSession();
  return {
    token,
    userId
  };
}
