const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const K = { access: 'sp_access', refresh: 'sp_refresh', user: 'sp_user' };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const tokens = {
  get access() { return localStorage.getItem(K.access); },
  get refresh() { return localStorage.getItem(K.refresh); },
  save({ accessToken, refreshToken, user }) {
    if (accessToken) localStorage.setItem(K.access, accessToken);
    if (refreshToken) localStorage.setItem(K.refresh, refreshToken);
    if (user) localStorage.setItem(K.user, JSON.stringify(user));
  },
  user() {
    try { return JSON.parse(localStorage.getItem(K.user)); } catch { return null; }
  },
  clear() { Object.values(K).forEach((k) => localStorage.removeItem(k)); },
};

async function raw(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running on port 5000.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.errors?.join('. ') || data.message || 'Something went wrong', res.status);
  }
  return data;
}

let refreshing = null;
async function refreshAccess() {
  refreshing = refreshing || raw('/auth/refresh', { method: 'POST', body: { refreshToken: tokens.refresh } })
    .finally(() => { refreshing = null; });
  const { accessToken } = await refreshing;
  tokens.save({ accessToken });
  return accessToken;
}

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh'];

export async function api(path, opts = {}) {
  try {
    return await raw(path, { ...opts, token: tokens.access });
  } catch (err) {
    if (err.status !== 401 || !tokens.refresh || NO_REFRESH.includes(path)) throw err;
    const token = await refreshAccess();
    return raw(path, { ...opts, token });
  }
}
