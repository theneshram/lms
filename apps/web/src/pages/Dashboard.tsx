import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Course = {
  _id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  visibility?: string;
};

type Enrollment = {
  _id: string;
  course: Course;
};

type Session = {
  _id: string;
  title: string;
  startAt: string;
  endAt?: string;
  meetingUrl?: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [events, setEvents] = useState<Session[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ data: enrolled }, { data: courses }, { data: upcoming }] = await Promise.all([
          api.get<Enrollment[]>('/enrollments/me'),
          api.get<Course[]>('/courses'),
          api.get<Session[]>('/virtual/upcoming'),
        ]);
        setEnrollments(enrolled || []);
        setCatalog(courses || []);
        setEvents(upcoming || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((en) => en.course?._id || en._id)), [enrollments]);
  const openCourses = useMemo(
    () =>
      catalog.filter((course) => {
        if (enrolledCourseIds.has(course._id)) return false;
        return course.visibility === 'PUBLIC' || course.visibility === 'INVITE_ONLY';
      }),
    [catalog, enrolledCourseIds]
  );

  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--textMuted)]">Welcome back</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text)]">{user?.name}</h1>
          <p className="text-[var(--textMuted)] max-w-2xl">
            Stay on track with upcoming sessions, explore new courses, and monitor your learning momentum in one place.
          </p>
        </header>

        {loading ? (
          <div className="text-[var(--textMuted)]">Loading your dashboard...</div>
        ) : (
          <div className="grid lg:grid-cols-[1.4fr,1fr] gap-8">
            <section className="space-y-6">
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[var(--text)]">Enrolled courses</h2>
                  <Link to="/courses" className="text-sm font-medium text-[var(--primary)]">
                    View catalog
                  </Link>
                </div>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-[var(--textMuted)]">
                    You are not enrolled yet. Browse the catalog to join your first course.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {enrollments.map((enrollment) => (
                      <Link
                        key={enrollment._id}
                        to={`/courses/${enrollment.course?._id}`}
                        className="rounded-2xl border border-slate-200/70 bg-white/70 dark:bg-slate-900/60 p-4 shadow-sm hover:shadow-lg transition"
                      >
                        <h3 className="font-semibold text-[var(--text)] mb-2">{enrollment.course?.title}</h3>
                        <p
                          className="text-xs text-[var(--textMuted)] leading-relaxed overflow-hidden"
                          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                        >
                          {enrollment.course?.description || 'Stay engaged and track your progress with assignments and quizzes.'}
                        </p>
                        <span className="mt-3 inline-flex items-center text-xs font-semibold text-[var(--primary)]">
                          Continue learning →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[var(--text)]">Open courses to enroll</h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{openCourses.length} available</span>
                </div>
                {openCourses.length === 0 ? (
                  <p className="text-sm text-[var(--textMuted)]">All caught up! Check back later for new offerings.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {openCourses.slice(0, 6).map((course) => (
                      <Link
                        key={course._id}
                        to={`/courses/${course._id}`}
                        className="rounded-2xl border border-slate-200/60 bg-white/70 dark:bg-slate-900/60 p-4 hover:border-[var(--primary)]/60 transition"
                      >
                        <h3 className="font-semibold text-[var(--text)] mb-1">{course.title}</h3>
                        <p
                          className="text-xs text-[var(--textMuted)] leading-relaxed overflow-hidden"
                          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                        >
                          {course.description || 'Discover new skills and earn certificates on completion.'}
                        </p>
                        <span className="mt-3 inline-flex items-center text-xs font-semibold text-[var(--primary)]">
                          Preview course →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="card p-6 space-y-4">
                <h2 className="text-xl font-semibold text-[var(--text)]">Upcoming events</h2>
                {events.length === 0 ? (
                  <p className="text-sm text-[var(--textMuted)]">No live sessions scheduled. Create or join events from your courses.</p>
                ) : (
                  <ul className="space-y-4">
                    {events.map((event) => {
                      const start = new Date(event.startAt);
                      return (
                        <li key={event._id} className="rounded-xl border border-slate-200/60 p-4 bg-white/70 dark:bg-slate-900/60">
                          <div className="text-xs uppercase tracking-[0.25em] text-[var(--textMuted)]">
                            {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                          </div>
                          <p className="font-semibold text-[var(--text)]">{event.title}</p>
                          <p className="text-xs text-[var(--textMuted)]">
                            {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.meetingUrl && (
                            <a
                              href={event.meetingUrl}
                              className="mt-2 inline-flex text-xs font-semibold text-[var(--primary)]"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Join meeting →
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="card p-6 space-y-3">
                <h2 className="text-xl font-semibold text-[var(--text)]">Calendar snapshot</h2>
                <p className="text-sm text-[var(--textMuted)]">
                  Add course activities, assignment deadlines, and exams to your preferred calendar tool. Upcoming sessions are
                  automatically synchronized from scheduling requests when notifications are enabled.
                </p>
                <Link to="/courses" className="inline-flex text-sm font-semibold text-[var(--primary)]">
                  View detailed schedule →
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
