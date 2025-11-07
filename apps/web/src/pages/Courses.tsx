import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

type Course = { _id: string; code: string; title: string; description?: string };

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Course[]>('/courses')
      .then(r => setCourses(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">My Courses</h2>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : courses.length === 0 ? (
        <div className="text-gray-600">No courses yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {courses.map(c => (
            <Link
              key={c._id}
              to={`/courses/${c._id}`}         // ✅ use template string, not /regex/
              className="border rounded p-3 hover:bg-gray-50"
            >
              <div className="text-sm text-gray-500">{c.code}</div>
              <div className="font-medium">{c.title}</div>
              {c.description && (
                <p className="text-sm mt-1 line-clamp-2">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
