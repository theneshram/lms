import React, { useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

export default function AssignmentSubmit() {
  const { id } = useParams<{ id: string }>(); // ✅ typed route param
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!id) {
      setMsg('Invalid assignment ID.');
      return;
    }
    try {
      setLoading(true);
      // ✅ Corrected URL and added error handling
      await api.post(`/assignments/${id}/submit`, { text });
      setMsg('✅ Submitted successfully!');
      setText('');
    } catch (err) {
      console.error(err);
      setMsg('❌ Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-3">Submit Assignment</h2>
      <textarea
        className="w-full border p-2 h-40 rounded"
        placeholder="Write your answer here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3">
        <button
          className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
          onClick={submit}
          disabled={loading || !text.trim()}
        >
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      {msg && (
        <div
          className={`mt-2 font-medium ${
            msg.startsWith('✅') ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {msg}
        </div>
      )}
    </Layout>
  );
}
