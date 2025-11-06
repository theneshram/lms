import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }){
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">LMS</Link>
          <nav className="flex gap-4">
            <Link to="/courses">Courses</Link>
            {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
            {user ? <button onClick={logout} className="px-3 py-1 border rounded">Logout</button> : <Link to="/login">Login</Link>}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}