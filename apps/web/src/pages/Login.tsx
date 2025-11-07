import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent){
    e.preventDefault();
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e:any){ setErr(e?.response?.data?.message || 'Login failed'); }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      {err && <div className="text-red-600 mb-2">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">Login</button>
      </form>
      <p className="mt-3 text-sm">No account? <Link to="/register" className="underline">Register</Link></p>
    </div>
  );
}
