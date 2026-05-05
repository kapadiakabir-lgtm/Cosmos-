import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken, clearToken } from './api';

type User = {
  user_id: string;
  email?: string | null;
  name: string;
  avatar?: string | null;
  created_at: string;
  stats: { sightings: number; nebulae: number; planets: number; galaxies: number; meteors: number };
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  identify: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const identify = async (username: string) => {
    const data = await api.identify(username);
    await setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const refresh = async () => {
    try { const me = await api.me(); setUser(me); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, identify, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
