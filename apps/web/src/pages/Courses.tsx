import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../lib/api';

export type Course = {
  _id: string;
  code: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  visibility?: string;
  image?: string;
  tags?: string[];
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<Course[]>('/courses');
        if (!active) return;
        setCourses(data ?? []);
      } catch (err) {
        if (!active) return;
        setError('We could not load courses at the moment. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const upcoming: Course[] = [];
    const inProgress: Course[] = [];
    const completed: Course[] = [];
    const now = new Date();
    courses.forEach((course) => {
      const start = course.startDate ? new Date(course.startDate) : undefined;
      const end = course.endDate ? new Date(course.endDate) : undefined;
      if (start && start > now) {
        upcoming.push(course);
      } else if (end && end < now) {
        completed.push(course);
      } else {
        inProgress.push(course);
      }
    });
    return { upcoming, inProgress, completed };
  }, [courses]);

  const hasCourses = courses.length > 0;

  return (
    <Layout>
      <div className="flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">Catalog</p>
            <h1 className="text-3xl font-semibold text-[var(--text)]">Courses</h1>
            <p className="text-sm text-[var(--textMuted)] max-w-2xl">
              Browse the learning experiences available to you. Track ongoing courses, revisit completed ones, and
              prepare for upcoming cohorts.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold text-[var(--text)] shadow-sm hover:border-[var(--primary)]/40"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-10 space-y-10">
          {error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="card p-8 text-center text-[var(--textMuted)]">Loading your course list…</div>
          ) : !hasCourses ? (
            <div className="card flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="text-4xl">📘</div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--text)]">No courses yet</h2>
                <p className="text-sm text-[var(--textMuted)]">
                  Once administrators enroll you in courses, they will appear here with detailed timelines and progress
                  tracking.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30"
              >
                Explore dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {renderSection('In progress', grouped.inProgress)}
              {renderSection('Upcoming', grouped.upcoming)}
              {renderSection('Completed', grouped.completed)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function renderSection(title: string, list: Course[]) {
  if (!list.length) return null;
  return (
    <section aria-label={title} className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">{list.length} course{list.length === 1 ? '' : 's'}</span>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((course) => {
          const timeline = describeCourseTimeline(course);
          return (
            <Link
              key={course._id}
              to={`/courses/${course._id}`}
              className="group rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-6 shadow-sm transition hover:border-[var(--primary)]/50 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">{course.code || 'Course'}</p>
                  <h3 className="text-lg font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                    {course.title}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${timeline.tone}`}>
                  {timeline.label}
                </span>
              </div>
              <p className="mt-4 text-sm text-[var(--textMuted)] line-clamp-3">
                {course.description || 'Start learning with interactive modules, assignments, and live sessions.'}
              </p>
              {course.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--textMuted)]">
                  {course.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/80 px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function describeCourseTimeline(course: Course) {
  const now = new Date();
  const start = course.startDate ? new Date(course.startDate) : undefined;
  const end = course.endDate ? new Date(course.endDate) : undefined;
  if (start && start > now) {
    return {
      label: `Starts ${formatShort(start)}`,
      tone: 'bg-[var(--primary)]/10 text-[var(--primary)]',
    };
  }
  if (end && end < now) {
    return {
      label: `Ended ${formatShort(end)}`,
      tone: 'bg-[var(--muted)]/30 text-[var(--textMuted)]',
    };
  }
  if (end && end >= now) {
    const diffDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      label: `${diffDays} day${diffDays === 1 ? '' : 's'} left`,
      tone: 'bg-amber-500/10 text-amber-600',
    };
  }
  return {
    label: 'Self-paced',
    tone: 'bg-emerald-500/10 text-emerald-600',
  };
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
