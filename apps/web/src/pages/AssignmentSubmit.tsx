import React, { useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

export default function AssignmentSubmit(){
  const { id } = useParams();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(){
    await api.post(/assignments//submit, { text });
    setMsg('Submitted!');
  }

  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-3">Submit Assignment</h2>
      <textarea className="w-full border p-2 h-40" value={text} onChange={e=>setText(e.target.value)} />
      <div className="mt-3"><button className="px-3 py-2 bg-black text-white rounded" onClick={submit}>Submit</button></div>
      {msg && <div className="mt-2 text-green-700">{msg}</div>}
    </Layout>
  );
}