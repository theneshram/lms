import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import ParticipantsPanel from './ParticipantsPanel';

type CourseSummary = { _id: string; title: string; code: string; visibility: string };

type CourseDetail = CourseSummary & { sections?: Array<{ _id: string; title: string }>; assets?: Array<{ _id: string; label: string }> };

export default function AdminCourses() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    api
      .get<CourseSummary[]>('/admin/courses')
      .then(({ data }) => {
        if (cancelled) return;
        setCourses(data);
        if (!selectedId && data.length) setSelectedId(data[0]._id);
      })
      .catch(() => setErr('Unable to load courses'))
      .finally(() => !cancelled && setLoadingList(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoadingCourse(true);
    api
      .get<CourseDetail>(`/admin/courses/${selectedId}`)
      .then(({ data }) => {
        if (!cancelled) setCourse(data);
      })
      .catch(() => setErr('Unable to load course'))
      .finally(() => !cancelled && setLoadingCourse(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <aside className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
        {loadingList ? (
          <p className="text-sm text-[var(--textMuted)]">Loading…</p>
        ) : err ? (
          <p className="text-sm text-rose-600">{err}</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-[var(--textMuted)]">No courses.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {courses.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c._id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedId === c._id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-transparent bg-[var(--surface)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--text)]">{c.title}</div>
                  <div className="text-[var(--textMuted)] text-xs uppercase tracking-widest">{c.code}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-6 space-y-6">
        {loadingCourse ? (
          <p className="text-sm text-[var(--textMuted)]">Loading course…</p>
        ) : !course ? (
          <p className="text-sm text-[var(--textMuted)]">Select a course to manage.</p>
        ) : (
          <>
            <header>
              <h2 className="text-xl font-semibold text-[var(--text)]">{course.title}</h2>
              <p className="text-xs text-[var(--textMuted)] uppercase tracking-widest">{course.code}</p>
            </header>
            <section>
              <h3 className="text-sm font-semibold text-[var(--text)]">Sections</h3>
              {course.sections?.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-[var(--text)]">
                  {course.sections.map((s) => (
                    <li key={s._id}>{s.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--textMuted)]">No sections yet.</p>
              )}
            </section>
            <ParticipantsPanel courseId={course._id} />
          </>
        )}
      </main>
    </div>
  );
}
