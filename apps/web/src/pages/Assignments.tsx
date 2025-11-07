import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams, Link } from 'react-router-dom';

type Assignment = { _id: string; title: string; dueAt?: string };

export default function Assignments() {
  const { id } = useParams<{ id: string }>(); // course id
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    // Adjust this endpoint if your backend uses /courses/:id/assignments instead.
    api.get<Assignment[]>(`/assignments/course/${id}`)
      .then(r => setItems(r.data))
      .catch(() => setErr('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-4">Assignments</h2>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-700">{err}</div>}

      {!loading && !err && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-gray-600">No assignments yet.</div>
          ) : (
            items.map(a => (
              <div key={a._id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.title}</div>
                  {a.dueAt && (
                    <div className="text-sm text-gray-500">
                      Due: {new Date(a.dueAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <Link
                  className="px-3 py-2 border rounded"
                  to={`/assignments/${a._id}/submit`}   // ✅ string path, not /regex/
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </Layout>
  );
}
