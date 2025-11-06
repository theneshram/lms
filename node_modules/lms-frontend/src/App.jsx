import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CourseView from './pages/CourseView.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Nav(){
  const { user, logout } = useAuth();
  return (
    <nav className='flex items-center justify-between p-3 border-b border-line/40'>
      <div className='flex items-center gap-4'>
        <Link to='/' className='bg-brand-gradient text-white rounded-xl px-3 py-1 shadow-glow'>LMS</Link>
        {user && (<Link to='/courses' className='text-muted hover:text-white'>Courses</Link>)}
      </div>
      <div>
        {user ? (
          <button onClick={logout} className='btn-accent'>Logout</button>
        ) : (
          <Link to='/login' className='btn-primary'>Login</Link>
        )}
      </div>
    </nav>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path='/courses' element={<ProtectedRoute roles={["admin","teacher","ta","student"]}><Courses /></ProtectedRoute>} />
        <Route path='/course' element={<ProtectedRoute roles={["admin","teacher","ta","student"]}><CourseView /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}