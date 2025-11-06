import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function Dashboard(){
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  useEffect(() => { api('/health').then(setHealth).catch(()=>{}); }, []);

  return (
    <div className='p-6 grid grid-cols-1 lg:grid-cols-[260px,1fr,360px] gap-6'>
      <aside className='sidebar-base rounded-2xl p-4 h-fit'>
        <div className='text-white font-semibold text-xl mb-4'>LMS</div>
        <nav className='flex flex-col gap-2'>
          <Link className='btn-primary text-center' to='/courses'>Courses</Link>
        </nav>
      </aside>

      <main className='space-y-6'>
        <div className='card-base p-6'>
          <h1 className='text-2xl font-semibold mb-2'>Dashboard Overview</h1>
          <div>Welcome, <b>{user?.name}</b> ({user?.role})</div>
          <pre className='mt-4 bg-overlay/60 border border-line/40 rounded-xl p-4 overflow-auto'>{JSON.stringify(health,null,2)}</pre>
        </div>

        <div className='card-base p-6'>
          <div className='kpi'></div>
          <div className='kpi-label'>Revenue (Mar)</div>
        </div>
      </main>

      <section className='space-y-6'>
        <div className='card-base p-6'>
          <div className='text-sm text-muted mb-2'>Customer</div>
          <div className='bg-brand-gradient h-2 rounded-full w-1/2 shadow-glow'></div>
        </div>
      </section>
    </div>
  );
}