import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

type Course = {
  _id: string;
  code: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

type CourseSummaryMetrics = {
  modulesTotal: number;
  modulesCompleted: number;
  progressPercent: number;
  grade: number | null;
  assignmentsTotal: number;
  assignmentsCompleted: number;
  assignmentAverage: number | null;
  quizzesTotal: number;
  quizzesAttempted: number;
  quizAverage: number | null;
  dueSoonCount: number;
  upcomingSessionCount: number;
};

type AnalyticsCardProps = {
  title: string;
  percent: number;
  accent: string;
  loading: boolean;
  subtitle: string;
  extra?: string;
};

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [metrics, setMetrics] = useState<CourseSummaryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const assignmentsPercent = useMemo(() => {
    if (!metrics || !metrics.assignmentsTotal) return 0;
    return Math.min(100, Math.round((metrics.assignmentsCompleted / metrics.assignmentsTotal) * 100));
  }, [metrics]);

  const quizzesPercent = useMemo(() => {
    if (!metrics || !metrics.quizzesTotal) return 0;
    return Math.min(100, Math.round((metrics.quizzesAttempted / metrics.quizzesTotal) * 100));
  }, [metrics]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoadingMetrics(true);
    Promise.allSettled([
      api.get<Course>(`/courses/${id}`),
      api.get<{ summary: CourseSummaryMetrics }>(`/analytics/progress/${id}`),
    ]).then((results) => {
      if (!isMounted) return;
      const [courseResult, metricsResult] = results;
      if (courseResult.status === 'fulfilled') {
        setCourse(courseResult.value.data);
      }
      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value.data.summary);
      } else {
        setMetricsError('Live progress analytics are unavailable for this course right now.');
      }
      setLoadingMetrics(false);
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!course) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center text-[var(--textMuted)]">Loading course…</div>
      </Layout>
    );
  }

  const progressPercent = Math.max(0, Math.min(100, Math.round(metrics?.progressPercent ?? 0)));

  const moduleSummary = metrics
    ? `${metrics.modulesCompleted ?? 0}/${metrics.modulesTotal ?? 0} modules`
    : 'Modules loading…';

  const timelineItems = [
    course.startDate ? `Starts ${formatDate(course.startDate)}` : null,
    course.endDate ? `Ends ${formatDate(course.endDate)}` : null,
  ].filter(Boolean) as string[];

  return (
    <Layout>
      <div className="flex flex-col flex-1 gap-10">
        <header className="card space-y-4 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">{course.code || 'Course'}</p>
              <h1 className="text-3xl font-semibold text-[var(--text)]">{course.title}</h1>
              {course.description && <p className="text-sm text-[var(--textMuted)] max-w-3xl">{course.description}</p>}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm text-[var(--textMuted)] sm:items-end">
              {timelineItems.length ? (
                <ul className="space-y-1 text-right">
                  {timelineItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <span>No schedule provided</span>
              )}
              {metrics?.grade != null && (
                <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                  Current grade {Math.round(metrics.grade)}%
                </span>
              )}
            </div>
          </div>
          {metricsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700">
              {metricsError}
            </div>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <AnalyticsCard
            title="Course progress"
            percent={progressPercent}
            accent="var(--primary)"
            loading={loadingMetrics}
            subtitle={moduleSummary}
            extra={metrics?.dueSoonCount ? `${metrics.dueSoonCount} item${metrics.dueSoonCount === 1 ? '' : 's'} due soon` : ''}
          />
          <AnalyticsCard
            title="Assignments"
            percent={assignmentsPercent}
            accent="var(--secondary)"
            loading={loadingMetrics}
            subtitle={metrics ? `${metrics.assignmentsCompleted}/${metrics.assignmentsTotal} submitted` : '—'}
            extra={
              metrics?.assignmentAverage != null
                ? `Average score ${Math.round(metrics.assignmentAverage)}%`
                : ''
            }
          />
          <AnalyticsCard
            title="Quizzes & sessions"
            percent={quizzesPercent}
            accent="var(--accent)"
            loading={loadingMetrics}
            subtitle={metrics ? `${metrics.quizzesAttempted}/${metrics.quizzesTotal} attempted` : '—'}
            extra={
              metrics?.upcomingSessionCount
                ? `${metrics.upcomingSessionCount} live session${metrics.upcomingSessionCount === 1 ? '' : 's'} ahead`
                : ''
            }
          />
        </section>

        <section className="card p-8 space-y-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Quick links</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] hover:border-[var(--primary)]/40"
              to={`/courses/${id}/assignments`}
            >
              View assignments
            </Link>
            <Link
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] hover:border-[var(--primary)]/40"
              to={`/courses/${id}/quizzes`}
            >
              Quiz attempts
            </Link>
            <Link
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] hover:border-[var(--primary)]/40"
              to="/dashboard#schedule"
            >
              Upcoming events
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function AnalyticsCard({ title, percent, accent, loading, subtitle, extra }: AnalyticsCardProps) {
  const safePercent = Math.max(0, Math.min(100, loading ? 0 : percent));
  const degrees = (safePercent / 100) * 360;
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--textMuted)]">{subtitle}</p>
        </div>
        <div
          className="relative h-24 w-24 rounded-full border border-[var(--border-soft)] bg-[var(--surface)]"
          style={{
            backgroundImage: `conic-gradient(${accent} ${degrees}deg, var(--muted) ${degrees}deg 360deg)`,
          }}
        >
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[var(--surface)] text-lg font-semibold text-[var(--text)]">
            {loading ? '—' : `${safePercent}%`}
          </div>
        </div>
      </div>
      {extra && <p className="text-sm text-[var(--textMuted)]">{extra}</p>}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
