import React, { createContext, useContext, useState } from 'react';
import { api } from '../lib/api';

type Role = 'ADMIN'|'TEACHER'|'TA'|'STUDENT';
type User = { id: string; name: string; email: string; role: Role } | null;

type Ctx = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<void>;
  logout: ()=>void;
};

const AuthCtx = createContext<Ctx>({} as any);
export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  async function login(email: string, password: string){
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string, role: Role='STUDENT'){
    await api.post('/auth/register', { name, email, password, role });
    await login(email, password);
  }

  function logout(){
    localStorage.removeItem('token');
    setUser(null);
  }

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>
}
