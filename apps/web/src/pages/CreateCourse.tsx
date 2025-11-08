import React, { useState } from 'react';
import { api } from '../lib/api';
import Layout from '../components/Layout';

export default function CreateCourse() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/courses', { title, description });
    alert('Course created successfully!');
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto mt-10">
        <h2 className="text-xl font-semibold mb-4">Create New Course</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full border p-2 mb-3"
            placeholder="Course Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border p-2 mb-3"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
        </form>
      </div>
    </Layout>
  );
}
