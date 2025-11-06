import { useEffect, useState } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8088').replace(/\/$/, '');

export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetch(API + '/health').then(r => r.json()).then(setHealth).catch(console.error);
  }, []);

  const login = async () => {
    const r = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@lms.local', password: 'admin123' }),
    });
    const j = await r.json();
    if (j.ok) setToken(j.token);
    alert(JSON.stringify(j));
  };

  const loadCourses = async () => {
    const r = await fetch(API + '/courses');
    const j = await r.json();
    setCourses(j.courses || []);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">LMS — Web</h1>

      <pre className="mt-4 p-3 bg-gray-100 rounded">{JSON.stringify(health, null, 2)}</pre>

      <div className="mt-4 flex gap-3">
        <button className="px-3 py-2 border rounded" onClick={login}>Login as admin</button>
        <button className="px-3 py-2 border rounded" onClick={loadCourses}>List courses</button>
      </div>

      <ul className="mt-4 list-disc pl-6">
        {courses.map((c) => <li key={c._id}>{c.title} ({c.code})</li>)}
      </ul>

      {token && <p className="mt-3 text-sm break-all">JWT: {token}</p>}
    </div>
  );
}
