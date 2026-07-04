import { getAuthHeaders } from '@/lib/auth-session';

// 使用相对路径 /api，让 Next.js rewrite/fallback 代理到后端，避免跨域和端口问题
const API_BASE = '/api';

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

  const params = (options as any).params;
  let queryString = '';
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    queryString = searchParams.toString();
  }

  let normalizedPath = path;
  if (userId && normalizedPath === '/profile' && method === 'GET') normalizedPath = `/profile?userId=${encodeURIComponent(userId)}`;
  if (userId && normalizedPath === '/profile' && (method === 'PATCH' || method === 'PUT')) normalizedPath = `/profile/${encodeURIComponent(userId)}`;

  const separator = normalizedPath.includes('?') ? '&' : '?';
  const url = queryString ? `${API_BASE}${normalizedPath}${separator}${queryString}` : `${API_BASE}${normalizedPath}`;

  const response = await fetch(url, { ...options, headers });
  const rawResponse = await response.text();
  if (!response.ok) console.error(`[request] non-ok response path=${normalizedPath} status=${response.status} raw=${rawResponse || '<empty>'}`);

  if (!rawResponse) {
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return null;
  }

  if (method === 'GET' && (/^\s*%PDF/i.test(rawResponse) || rawResponse.includes('%PDF'))) {
    return rawResponse;
  }
  if (method === 'POST' && (/^\s*PK/i.test(rawResponse) || rawResponse.includes('PK\u0003\u0004'))) {
    return rawResponse;
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawResponse);
  } catch {
    const truncated = rawResponse.length > 200 ? rawResponse.slice(0, 200) + '...' : rawResponse;
    console.error('[request] JSON parse failed. status:', response.status, 'raw response:', rawResponse);
    throw new Error(`Invalid JSON response from server (status ${response.status}): ${truncated}`);
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && 'success' in payload && 'data' in payload ? payload.data : payload;
};

request.get = (path: string, options?: any) => request(path, { ...(options || {}), method: 'GET' });
request.post = (path: string, body?: unknown) => request(path, { method: 'POST', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.patch = (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.put = (path: string, body?: unknown) => request(path, { method: 'PUT', body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
request.delete = (path: string) => request(path, { method: 'DELETE' });

export default request;
