import { createContext, useContext, useState } from 'react';
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('name');
    return token ? { token, role, name } : null;
  });
  const login = ({ token, role, name }) => { localStorage.setItem('token',token); localStorage.setItem('role',role); localStorage.setItem('name',name); setUser({ token, role, name }); };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}