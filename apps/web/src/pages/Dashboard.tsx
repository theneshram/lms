import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        <p className="mb-4">
          Signed in as <strong>{user.name}</strong> ({user.role}).
        </p>

        <div className="space-x-3">
          <Link to="/courses" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Go to Courses
          </Link>

          {user.role === 'admin' && (
            <>
              <Link to="/courses/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Create Course
              </Link>

              <Link to="/admin/users" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Manage Users
              </Link>

              <Link to="/admin/assignments" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Manage Assignments
              </Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
