import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'TA' | 'STUDENT';
type User = { id: string; name: string; email: string; role: Role } | null;

type Ctx = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<Ctx>({} as any);
export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/users/me')
      .then(({ data }) => {
        const currentUser = { id: data._id, name: data.name, email: data.email, role: data.role };
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string, role: Role = 'STUDENT') {
    await api.post('/auth/register', { name, email, password, role });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
};
