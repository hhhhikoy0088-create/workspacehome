import { getAuthHeaders } from '@/lib/auth-session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const request: any = async function request(path: string, options: RequestInit = {}) {
  const { token, userId } = getAuthHeaders();
  const method = String(options.method || 'GET').toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'X-User-Id': userId } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  let normalizedPath = path;
  if (userId && normalizedPath === '/profile' && method === 'GET') {
    normalizedPath = `/profile?userId=${encodeURIComponent(userId)}`;
  }
  if (userId && normalizedPath === '/profile' && (method === 'PATCH' || method === 'PUT')) {
    normalizedPath = `/profile/${encodeURIComponent(userId)}`;
  }

  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response from server');
    }
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && 'success' in payload && 'data' in payload ? payload.data : payload;
}

request.get = (path: string) => request(path, { method: 'GET' });
request.post = (path: string, body?: unknown) => request(path, { method: 'POST', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.patch = (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.put = (path: string, body?: unknown) => request(path, { method: 'PUT', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.delete = (path: string) => request(path, { method: 'DELETE' });

export default request;
