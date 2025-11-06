import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard(){
  const { user } = useAuth();
  return (
    <Layout>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p>Signed in as <b>{user?.name}</b> ({user?.role}).</p>
        <div className="flex gap-4 mt-4">
          <Link className="px-3 py-2 border rounded" to="/courses">Go to Courses</Link>
          {user?.role==='ADMIN' && <Link className="px-3 py-2 border rounded" to="/admin">Admin Settings</Link>}
        </div>
      </div>
    </Layout>
  );
}