import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseView from './pages/CourseView';
import Assignments from './pages/Assignments';
import AssignmentSubmit from './pages/AssignmentSubmit';
import QuizTake from './pages/QuizTake';
import AdminSettings from './pages/AdminSettings';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/dashboard', element: <ProtectedRoute><Dashboard/></ProtectedRoute> },
  { path: '/courses', element: <ProtectedRoute><Courses/></ProtectedRoute> },
  { path: '/courses/:id', element: <ProtectedRoute><CourseView/></ProtectedRoute> },
  { path: '/courses/:id/assignments', element: <ProtectedRoute><Assignments/></ProtectedRoute> },
  { path: '/assignments/:id/submit', element: <ProtectedRoute allow={["STUDENT"]}><AssignmentSubmit/></ProtectedRoute> },
  { path: '/quizzes/:id/take', element: <ProtectedRoute allow={["STUDENT"]}><QuizTake/></ProtectedRoute> },
  { path: '/admin', element: <ProtectedRoute allow={["ADMIN"]}><AdminSettings/></ProtectedRoute> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
