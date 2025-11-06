import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allow }: { children: JSX.Element, allow?: Array<'ADMIN'|'TEACHER'|'TA'|'STUDENT'> }){
  const { user } = useAuth();
  if(!user) return <Navigate to="/login" replace />;
  if(allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}