import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

type Course = { _id:string; code:string; title:string; description?:string };

export default function CourseView(){
  const { id } = useParams();
  const [course, setCourse] = useState<Course|null>(null);
  useEffect(()=>{ api.get(/courses/).then(r=>setCourse(r.data)); },[id]);
  if(!course) return null;
  return (
    <Layout>
      <div className="mb-4">
        <div className="text-sm text-gray-500">{course.code}</div>
        <h2 className="text-xl font-semibold">{course.title}</h2>
        {course.description && <p className="mt-1">{course.description}</p>}
      </div>
      <div className="flex gap-3">
        <Link className="px-3 py-2 border rounded" to={/courses//assignments}>Assignments</Link>
        <Link className="px-3 py-2 border rounded" to={/quizzes/}>Quizzes (soon)</Link>
      </div>
    </Layout>
  );
}