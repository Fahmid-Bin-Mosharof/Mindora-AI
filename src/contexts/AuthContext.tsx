import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore, User } from '@/lib/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!tokenStore.get()) { setUser(null); return; }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    tokenStore.set(token);
    setUser(user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const { token, user } = await api.signup(name, email, password);
    tokenStore.set(token);
    setUser(user);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
