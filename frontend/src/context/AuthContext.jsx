import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokens } from '../api.js';
import { useNavigate } from 'react-router-dom';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(tokens.user());
  const [ready, setReady] = useState(!tokens.access);

  useEffect(() => {
    if (!tokens.access) return;
    api('/auth/me')
      .then(({ user: fresh }) => { setUser(fresh); tokens.save({ user: fresh }); })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) { tokens.clear(); setUser(null); }
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokens.save(data);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const data = await api('/auth/register', { method: 'POST', body: form });
    tokens.save(data);
    setUser(data.user);
    return data.user;
  }, []);
  const logout = useCallback(() => { tokens.clear(); setUser(null); navigate('/'); }, [navigate]);

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
