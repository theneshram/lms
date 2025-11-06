import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams, Link } from 'react-router-dom';

type Assignment = { _id:string; title:string; dueAt?:string };

export default function Assignments(){
  const { id } = useParams();
  const [items, setItems] = useState<Assignment[]>([]);
  useEffect(()=>{ api.get(/assignments/course/).then(r=>setItems(r.data)); },[id]);
  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-4">Assignments</h2>
      <div className="space-y-2">
        {items.map(a=> (
          <div key={a._id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{a.title}</div>
              {a.dueAt && <div className="text-sm text-gray-500">Due: {new Date(a.dueAt).toLocaleString()}</div>}
            </div>
            <Link className="px-3 py-2 border rounded" to={/assignments//submit}>Open</Link>
          </div>
        ))}
      </div>
    </Layout>
  );
}