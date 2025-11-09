import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type AllowedRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'TA' | 'STUDENT';

export default function ProtectedRoute({ children, allow }: { children: JSX.Element; allow?: Array<AllowedRole> }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) {
    if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
    const isExplicitlyAllowed = allow.includes('SUPER_ADMIN');
    const grantsAll = allow.includes('ADMIN');
    if (!isExplicitlyAllowed && !grantsAll) return <Navigate to="/" replace />;
  }
  return children;
}
