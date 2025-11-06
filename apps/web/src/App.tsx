import React from 'react';
import Layout from './components/Layout';

export default function App(){
  return (
    <Layout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome to LMS</h1>
        <p>Login, enroll, manage courses, assignments, and quizzes.</p>
      </div>
    </Layout>
  );
}