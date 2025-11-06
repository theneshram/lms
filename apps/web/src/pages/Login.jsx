import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login(){
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    try {
      const res = await api('/auth/login', { method:'POST', body:{ email, password } });
      login(res);
    } catch (e){ setErr(e.message); }
  }

  return (
    <div className='min-h-screen grid place-items-center p-4'>
      <form onSubmit={onSubmit} className='card-base max-w-sm w-full p-6 space-y-4'>
        <h1 className='text-2xl font-semibold'>LMS Login</h1>
        {err && <div className='text-red-500 text-sm'>{err}</div>}
        <input className='input-dark w-full' value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' />
        <input type='password' className='input-dark w-full' value={password} onChange={e=>setPassword(e.target.value)} placeholder='Password' />
        <button className='btn-primary w-full'>Sign in</button>
      </form>
    </div>
  );
}