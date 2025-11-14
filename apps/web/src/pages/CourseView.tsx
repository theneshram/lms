import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../lib/api';

type CourseActivity = {
  _id: string;
  title: string;
  type?: string;
  description?: string;
  durationMinutes?: number;
};

type CourseSection = {
  _id: string;
  title: string;
  description?: string;
  order?: number;
  activities?: CourseActivity[];
};

type Course = {
  _id: string;
  code: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  sections?: CourseSection[];
  resources?: Array<{ _id: string }>;
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

type AssignmentSummary = { _id: string; title: string; dueAt?: string };

type SessionSummary = { _id: string; title: string; startAt?: string; endAt?: string; meetingUrl?: string };

type CourseEvent = {
  id: string;
  label: string;
  date: string;
  type: 'ASSIGNMENT' | 'SESSION';
  time?: string | null;
  meta?: string;
};

type QuickLinkStats = {
  dueSoonAssignments: AssignmentSummary[];
  totalAssignments: number;
  sessionCount: number;
  nextSession?: SessionSummary;
  sectionsCount: number;
  resourcesCount: number;
};

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [metrics, setMetrics] = useState<CourseSummaryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [quickLinkNotice, setQuickLinkNotice] = useState<string | null>(null);

  const sections = useMemo(() => {
    const list = course?.sections ?? [];
    return list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [course]);

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
    ]).then(([courseResult, metricsResult]) => {
      if (!isMounted) return;
      if (courseResult.status === 'fulfilled') {
        setCourse(courseResult.value.data);
      }
      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value.data.summary);
        setMetricsError(null);
      } else {
        setMetricsError('Live progress analytics are unavailable for this course right now.');
      }
      setLoadingMetrics(false);
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(null);
    Promise.allSettled([api.get<AssignmentSummary[]>(`/assignments/course/${id}`), api.get<SessionSummary[]>(`/virtual/course/${id}`)]).then(
      ([assignmentResult, sessionResult]) => {
        if (cancelled) return;
        if (assignmentResult.status === 'fulfilled') {
          setAssignments(assignmentResult.value.data || []);
        } else {
          setEventsError('Unable to load assignments right now.');
        }
        if (sessionResult.status === 'fulfilled') {
          setSessions(sessionResult.value.data || []);
        } else {
          setEventsError((prev) => prev ?? 'Unable to load course events.');
        }
        setEventsLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const calendarEvents = useMemo<CourseEvent[]>(() => {
    const items: CourseEvent[] = [];
    assignments.forEach((assignment) => {
      if (!assignment.dueAt) return;
      items.push({
        id: `assignment-${assignment._id}`,
        label: assignment.title,
        date: assignment.dueAt,
        type: 'ASSIGNMENT',
        time: assignment.dueAt,
      });
    });
    sessions.forEach((session) => {
      if (!session.startAt) return;
      items.push({
        id: `session-${session._id}`,
        label: session.title,
        date: session.startAt,
        type: 'SESSION',
        time: session.startAt,
        meta: session.meetingUrl,
      });
    });
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [assignments, sessions]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return calendarEvents.filter((event) => new Date(event.date).getTime() >= now).slice(0, 4);
  }, [calendarEvents]);

  if (!course) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center text-[var(--textMuted)]">Loading course.</div>
      </Layout>
    );
  }

  const progressPercent = Math.max(0, Math.min(100, Math.round(metrics?.progressPercent ?? 0)));
  const moduleSummary = metrics ? `${metrics.modulesCompleted ?? 0}/${metrics.modulesTotal ?? 0} modules` : 'Modules loading.';
  const timelineItems = [
    course.startDate ? `Starts ${formatDate(course.startDate)}` : null,
    course.endDate ? `Ends ${formatDate(course.endDate)}` : null,
  ].filter(Boolean) as string[];

  const dueSoonAssignments = assignments
    .filter((assignment) => assignment.dueAt && new Date(assignment.dueAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime())
    .slice(0, 3);

  const quickLinkStats: QuickLinkStats = {
    dueSoonAssignments,
    totalAssignments: assignments.length,
    sessionCount: sessions.length,
    nextSession: sessions
      .filter((session) => session.startAt && new Date(session.startAt).getTime() > Date.now())
      .sort((a, b) => new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime())[0],
    sectionsCount: sections.length,
    resourcesCount: course.resources?.length ?? 0,
  };

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
        <div className="space-y-6">
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
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700">{metricsError}</div>
            )}
          </header>

          <section className="grid gap-6 lg:grid-cols-3">
            <AnalyticsCard
              title="Course progress"
              percent={progressPercent}
              accent="var(--primary)"
              loading={loadingMetrics}
              subtitle={moduleSummary}
              extra={
                metrics?.dueSoonCount ? `${metrics.dueSoonCount} item${metrics.dueSoonCount === 1 ? '' : 's'} due soon` : undefined
              }
            />
            <AnalyticsCard
              title="Assignments"
              percent={assignmentsPercent}
              accent="var(--secondary)"
              loading={loadingMetrics}
              subtitle={metrics ? `${metrics.assignmentsCompleted}/${metrics.assignmentsTotal} submitted` : '-'}
              extra={
                metrics?.assignmentAverage != null ? `Average score ${Math.round(metrics.assignmentAverage)}%` : undefined
              }
            />
            <AnalyticsCard
              title="Quizzes & sessions"
              percent={quizzesPercent}
              accent="var(--accent)"
              loading={loadingMetrics}
              subtitle={metrics ? `${metrics.quizzesAttempted}/${metrics.quizzesTotal} attempted` : '-'}
              extra={
                metrics?.upcomingSessionCount
                  ? `${metrics.upcomingSessionCount} live session${metrics.upcomingSessionCount === 1 ? '' : 's'} ahead`
                  : undefined
              }
            />
          </section>

          <UpcomingEventsList events={upcomingEvents} loading={eventsLoading} error={eventsError} />

          <section id="sections" className="card space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text)]">Sections & activities</h2>
                <p className="text-sm text-[var(--textMuted)]">Use the navigator to jump into the right module instantly.</p>
              </div>
              <a href="#calendar" className="text-sm font-semibold text-[var(--primary)]">
                View calendar
              </a>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-[var(--textMuted)]">Sections are not published for this course yet.</p>
            ) : (
              <div className="flex flex-col gap-6 lg:flex-row">
                <SectionNavigator sections={sections} />
                <SectionsContent sections={sections} />
              </div>
            )}
          </section>

          <CourseCalendar events={calendarEvents} />
        </div>

        <div className="space-y-6">
          <QuickLinksWidget
            courseId={course._id}
            stats={quickLinkStats}
            onQuizInfo={() => setQuickLinkNotice('Quiz attempt tracking is coming soon. Stay tuned!')}
          />
          {quickLinkNotice && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-700">{quickLinkNotice}</div>
          )}
          <section id="events" className="card space-y-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--text)]">Course schedule</h3>
            {eventsLoading ? (
              <p className="text-sm text-[var(--textMuted)]">Loading schedule…</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-[var(--textMuted)]">No virtual sessions have been scheduled yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {sessions
                  .slice()
                  .sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime())
                  .map((session) => (
                    <li key={session._id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-3">
                      <p className="font-semibold text-[var(--text)]">{session.title}</p>
                      {session.startAt && (
                        <p className="text-[var(--textMuted)]">{formatDateTime(session.startAt)}</p>
                      )}
                      {session.meetingUrl && (
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[var(--primary)] underline"
                        >
                          Join meeting
                        </a>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function AnalyticsCard({
  title,
  percent,
  accent,
  loading,
  subtitle,
  extra,
}: {
  title: string;
  percent: number;
  accent: string;
  loading: boolean;
  subtitle: string;
  extra?: string;
}) {
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
            {loading ? '-' : `${safePercent}%`}
          </div>
        </div>
      </div>
      {extra && <p className="text-sm text-[var(--textMuted)]">{extra}</p>}
    </div>
  );
}

function QuickLinksWidget({
  courseId,
  stats,
  onQuizInfo,
}: {
  courseId: string;
  stats: QuickLinkStats;
  onQuizInfo: () => void;
}) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--textMuted)]">Quick links</p>
        <h3 className="text-xl font-semibold text-[var(--text)]">Take action for this course</h3>
      </div>
      <div className="space-y-2 text-sm">
        <Link
          className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40"
          to={`/courses/${courseId}/assignments`}
        >
          <span>View assignments</span>
          <span className="text-xs text-[var(--textMuted)]">
            {stats.dueSoonAssignments.length
              ? `${stats.dueSoonAssignments.length} due soon`
              : `${stats.totalAssignments} total`}
          </span>
        </Link>
        <button
          type="button"
          onClick={onQuizInfo}
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface)]/60 px-4 py-2 text-left font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/30"
        >
          <span>Quiz attempts</span>
          <span className="text-xs text-[var(--textMuted)]">Coming soon</span>
        </button>
        <a
          href="#events"
          className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40"
        >
          <span>Upcoming events</span>
          <span className="text-xs text-[var(--textMuted)]">
            {stats.sessionCount ? `${stats.sessionCount} scheduled` : 'None yet'}
          </span>
        </a>
        <a
          href="#sections"
          className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40"
        >
          <span>Sections & resources</span>
          <span className="text-xs text-[var(--textMuted)]">
            {stats.sectionsCount} sections · {stats.resourcesCount} resources
          </span>
        </a>
        <a
          href="#calendar"
          className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40"
        >
          <span>Course calendar</span>
          <span className="text-xs text-[var(--textMuted)]">
            {stats.nextSession?.startAt ? `Next: ${formatDate(stats.nextSession.startAt)}` : 'Explore view'}
          </span>
        </a>
      </div>
    </section>
  );
}

function UpcomingEventsList({
  events,
  loading,
  error,
}: {
  events: CourseEvent[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Upcoming events</h2>
          <p className="text-sm text-[var(--textMuted)]">Sessions and due dates tied to this course.</p>
        </div>
        <a href="#calendar" className="text-sm font-semibold text-[var(--primary)]">
          Calendar view
        </a>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--textMuted)]">Loading events…</p>
      ) : error ? (
        <p className="text-sm text-rose-500">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-[var(--textMuted)]">No upcoming items for this course.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">{event.label}</p>
                  <p className="text-[var(--textMuted)]">
                    {event.type === 'ASSIGNMENT' ? 'Assignment due' : 'Live session'} · {formatDateTime(event.date)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    event.type === 'ASSIGNMENT' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {event.type === 'ASSIGNMENT' ? 'Due' : 'Session'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionNavigator({ sections }: { sections: CourseSection[] }) {
  const handleNavigate = (targetId: string) => {
    const anchor = document.getElementById(targetId);
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4 lg:w-64">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">Navigator</p>
      <ul className="mt-3 space-y-3 text-sm text-[var(--text)]">
        {sections.map((section) => (
          <li key={section._id}>
            <button
              type="button"
              onClick={() => handleNavigate(`section-${section._id}`)}
              className="w-full text-left font-semibold text-[var(--text)] hover:text-[var(--primary)]"
            >
              {section.title}
            </button>
            {section.activities && section.activities.length > 0 && (
              <ul className="mt-1 space-y-1 text-xs text-[var(--textMuted)]">
                {section.activities.map((activity) => (
                  <li key={activity._id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(`activity-${activity._id}`)}
                      className="w-full text-left hover:text-[var(--primary)]"
                    >
                      {activity.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionsContent({ sections }: { sections: CourseSection[] }) {
  return (
    <div className="space-y-4 flex-1">
      {sections.map((section) => (
        <div key={section._id} id={`section-${section._id}`} className="rounded-2xl border border-[var(--border-soft)] bg-white/80 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text)]">{section.title}</h3>
            {section.activities && section.activities.length > 0 && (
              <span className="text-xs text-[var(--textMuted)]">{section.activities.length} activities</span>
            )}
          </div>
          {section.description && <p className="mt-1 text-sm text-[var(--textMuted)]">{section.description}</p>}
          {section.activities && section.activities.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {section.activities.map((activity) => (
                <li
                  key={activity._id}
                  id={`activity-${activity._id}`}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{activity.title}</p>
                      {activity.description && <p className="text-xs text-[var(--textMuted)]">{activity.description}</p>}
                    </div>
                    {activity.type && (
                      <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        {activity.type}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--textMuted)]">Activities will appear here when published.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function CourseCalendar({ events }: { events: CourseEvent[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CourseEvent[]>();
    events.forEach((event) => {
      const day = formatDate(event.date);
      map.set(day, [...(map.get(day) ?? []), event]);
    });
    return Array.from(map.entries()).sort(
      ([dayA], [dayB]) => new Date(dayA).getTime() - new Date(dayB).getTime()
    );
  }, [events]);

  return (
    <section id="calendar" className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Course calendar</h2>
          <p className="text-sm text-[var(--textMuted)]">Assignments and live sessions mapped by day.</p>
        </div>
        <a href="#sections" className="text-sm font-semibold text-[var(--primary)]">
          Back to sections
        </a>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--textMuted)]">Add assignments or sessions to populate the calendar.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([day, dayEvents]) => (
            <div key={day} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
              <p className="text-sm font-semibold text-[var(--text)]">{day}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {dayEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--text)]">{event.label}</p>
                        <p className="text-xs text-[var(--textMuted)]">{event.time ? formatTime(event.time) : 'All day'}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          event.type === 'ASSIGNMENT' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {event.type === 'ASSIGNMENT' ? 'Due' : 'Session'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
