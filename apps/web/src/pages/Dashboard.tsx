import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  image?: string;
};

type Enrollment = {
  _id: string;
  course: Course;
  role?: string;
  status?: string;
};

type Session = {
  _id: string;
  title: string;
  startAt: string;
  endAt?: string;
  meetingUrl?: string;
  course?: string;
};

type Announcement = {
  _id: string;
  title: string;
  message?: string;
  createdAt?: string;
  course?: { title?: string };
};

type DueAssignment = {
  _id: string;
  title: string;
  dueAt?: string;
  course?: string;
  courseTitle?: string;
};

type CourseProgress = {
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  modulesTotal: number;
  modulesCompleted: number;
  assignmentsTotal: number;
  assignmentsCompleted: number;
  assignmentAverage: number | null;
  quizzesTotal: number;
  quizzesAttempted: number;
  quizAverage: number | null;
  dueSoonCount: number;
  upcomingSessionCount: number;
  grade: number | null;
  role?: string;
  status?: string;
};

type CalendarHighlight = {
  date: string;
  type: 'SESSION' | 'ASSIGNMENT';
  title: string;
  courseId?: string;
  courseTitle?: string;
};

type DemoCourseInfo = {
  courseId?: string;
  code?: string;
  title?: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  modules?: number;
  resources?: number;
  assignments?: number;
  quizzes?: number;
  upcomingSessions?: number;
  highlight?: string;
  autoEnroll?: boolean;
  enrolled?: boolean;
  quizId?: string;
};

type DashboardResponse = {
  enrollments: Enrollment[];
  openCourses: Course[];
  upcomingSessions: Session[];
  announcements: Announcement[];
  dueAssignments: DueAssignment[];
  stats: {
    enrolledCount: number;
    completedCount: number;
    upcomingEventCount: number;
    dueSoonCount: number;
    openCourseCount?: number;
  };
  progress: CourseProgress[];
  calendarHighlights: CalendarHighlight[];
  demoCourse?: DemoCourseInfo;
};

type WidgetKey = 'announcements' | 'calendar' | 'events' | 'performance';

type CalendarCell = {
  key: string;
  date: Date | null;
  iso?: string;
  events: CalendarHighlight[];
};

const DEFAULT_WIDGET_STATE: Record<WidgetKey, boolean> = {
  announcements: true,
  calendar: true,
  events: true,
  performance: true,
};

const DASHBOARD_WIDGET_STORAGE_KEY = 'lms-dashboard-widgets';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [openCourses, setOpenCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dueAssignments, setDueAssignments] = useState<DueAssignment[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [demoCourse, setDemoCourse] = useState<DemoCourseInfo | null>(null);
  const [enrollingDemo, setEnrollingDemo] = useState(false);
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDGET_STATE;
    try {
      const stored = window.localStorage.getItem(DASHBOARD_WIDGET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_WIDGET_STATE, ...parsed };
      }
    } catch (err) {
      console.warn('Unable to read dashboard widget preferences', err);
    }
    return DEFAULT_WIDGET_STATE;
  });
  const dashboardNav = useMemo(
    () => [
      { id: 'summary', label: 'Overview' },
      { id: 'courses', label: 'My courses' },
      { id: 'open-courses', label: 'Open catalog' },
      { id: 'announcements', label: 'Announcements' },
      { id: 'schedule', label: 'Schedule' },
      { id: 'insights', label: 'Insights' },
    ],
    []
  );
  const [activeSection, setActiveSection] = useState('summary');
  const navItems = useMemo(
    () =>
      dashboardNav.filter((item) => {
        if (item.id === 'announcements') return widgets.announcements;
        if (item.id === 'schedule') return widgets.events || widgets.calendar;
        if (item.id === 'insights') return widgets.performance;
        return true;
      }),
    [dashboardNav, widgets]
  );
  const todayIso = useMemo(() => toISODate(new Date()) ?? '', []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get<DashboardResponse>('/analytics/dashboard/me');
        if (!isMounted) return;
        setDashboardData(data);
        setEnrollments(data.enrollments ?? []);
        setOpenCourses(data.openCourses ?? []);
        setEvents(data.upcomingSessions ?? []);
        setAnnouncements(data.announcements ?? []);
        setDueAssignments(data.dueAssignments ?? []);
        setDemoCourse(data.demoCourse ?? null);
      } catch (primaryError) {
        if (!isMounted) return;
        console.warn('Falling back to basic dashboard data', primaryError);
        setError('Advanced analytics are temporarily unavailable. Showing basic data instead.');
        try {
          const [{ data: enrolled }, { data: courses }, { data: upcoming }] = await Promise.all([
            api.get<Enrollment[]>('/enrollments/me'),
            api.get<Course[]>('/courses'),
            api.get<Session[]>('/virtual/upcoming'),
          ]);
          if (!isMounted) return;
          const safeEnrollments = enrolled || [];
          setEnrollments(safeEnrollments);
          const enrolledIds = new Set(safeEnrollments.map((en) => en.course?._id || en._id));
          const availableCourses = (courses || []).filter(
            (course) =>
              !enrolledIds.has(course._id) &&
              (course.visibility === 'PUBLIC' || course.visibility === 'INVITE_ONLY' || !course.visibility)
          );
          setOpenCourses(availableCourses);
          setEvents(upcoming || []);
          setAnnouncements([]);
          setDueAssignments([]);
          setDemoCourse(null);
        } catch (fallbackError) {
          if (!isMounted) return;
          console.error('Unable to load dashboard data', fallbackError);
          setError('Unable to load dashboard data at this time. Please try again shortly.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!navItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0.2 }
    );
    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [navItems, widgets, enrollments.length, openCourses.length, announcements.length, events.length]);

  useEffect(() => {
    if (navItems.length && !navItems.find((item) => item.id === activeSection)) {
      setActiveSection(navItems[0].id);
    }
  }, [navItems, activeSection]);

  const progressLookup = useMemo(() => {
    const map = new Map<string, CourseProgress>();
    dashboardData?.progress?.forEach((entry) => {
      map.set(entry.courseId, entry);
    });
    return map;
  }, [dashboardData?.progress]);

  const stats = useMemo(() => {
    const base = dashboardData?.stats;
    return [
      {
        label: 'Enrolled',
        value: base?.enrolledCount ?? enrollments.length,
        color: 'var(--primary)',
      },
      {
        label: 'Completed',
        value: base?.completedCount ?? 0,
        color: 'var(--secondary)',
      },
      {
        label: 'Upcoming events',
        value: base?.upcomingEventCount ?? events.length,
        color: 'var(--accent)',
      },
      {
        label: 'Due soon',
        value: base?.dueSoonCount ?? dueAssignments.length,
        color: 'var(--primary)',
      },
    ];
  }, [dashboardData?.stats, enrollments.length, events.length, dueAssignments.length]);

  const maxStatValue = useMemo(() => Math.max(...stats.map((stat) => stat.value), 1), [stats]);

  const calendarHighlights = useMemo(() => {
    if (dashboardData?.calendarHighlights?.length) return dashboardData.calendarHighlights;
    const fallback: CalendarHighlight[] = [];
    events.forEach((event) => {
      fallback.push({ date: event.startAt, type: 'SESSION', title: event.title, courseId: event.course });
    });
    dueAssignments.forEach((assignment) => {
      if (assignment.dueAt) {
        fallback.push({
          date: assignment.dueAt,
          type: 'ASSIGNMENT',
          title: assignment.title,
          courseId: assignment.course,
          courseTitle: assignment.courseTitle,
        });
      }
    });
    return fallback;
  }, [dashboardData?.calendarHighlights, events, dueAssignments]);

  const highlightMap = useMemo(() => {
    const map = new Map<string, CalendarHighlight[]>();
    calendarHighlights.forEach((item) => {
      const iso = toISODate(item.date);
      if (!iso) return;
      const list = map.get(iso) ?? [];
      list.push(item);
      map.set(iso, list);
    });
    return map;
  }, [calendarHighlights]);

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: CalendarCell[] = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ key: `pad-start-${i}`, date: null, events: [] });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const iso = toISODate(date);
      cells.push({ key: iso ?? `day-${day}`, date, iso, events: iso ? highlightMap.get(iso) ?? [] : [] });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-end-${cells.length}`, date: null, events: [] });
    }
    return cells;
  }, [currentMonth, highlightMap]);

  const calendarWeeks = useMemo(() => {
    const weeks: CalendarCell[][] = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      weeks.push(calendarCells.slice(i, i + 7));
    }
    return weeks;
  }, [calendarCells]);

  const selectedHighlights = selectedDate ? highlightMap.get(selectedDate) ?? [] : [];

  const summaryCards = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{stat.label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{stat.value}</p>
          <div className="mt-4 h-2 rounded-full bg-[var(--muted)]/40">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, (stat.value / maxStatValue) * 100)}%`, background: stat.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const handleJoinDemoCourse = useCallback(async () => {
    if (!demoCourse?.courseId) return;
    setEnrollingDemo(true);
    try {
      await api.post('/enrollments/self', { courseId: demoCourse.courseId });
      const { data: refreshedCourse } = await api.get<Course>(`/courses/${demoCourse.courseId}`);
      setEnrollments((prev) => {
        if (prev.some((enrollment) => enrollment.course?._id === refreshedCourse._id)) {
          return prev;
        }
        const enrollment: Enrollment = {
          _id: `enrollment-${refreshedCourse._id}`,
          course: refreshedCourse,
          role: 'STUDENT',
          status: 'ACTIVE',
        };
        return [...prev, enrollment];
      });
      setOpenCourses((prev) => prev.filter((course) => course._id !== refreshedCourse._id));
      setDemoCourse((prev) => (prev ? { ...prev, enrolled: true } : prev));
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              demoCourse: {
                ...(prev.demoCourse ?? {}),
                enrolled: true,
                courseId: demoCourse.courseId,
              },
            }
          : prev
      );
      setError(null);
    } catch (joinError) {
      console.error('Failed to self-enrol in the demo course', joinError);
      setError('We could not enrol you in the demo course. Please try again shortly.');
    } finally {
      setEnrollingDemo(false);
    }
  }, [demoCourse?.courseId]);

  const demoCourseSection = useMemo(() => {
    if (!demoCourse) return null;

    const stats = [
      { label: 'Modules', value: demoCourse.modules },
      { label: 'Resources', value: demoCourse.resources },
      { label: 'Assignments', value: demoCourse.assignments },
      { label: 'Quizzes', value: demoCourse.quizzes },
      { label: 'Live sessions', value: demoCourse.upcomingSessions },
    ].filter((item) => typeof item.value === 'number');

    const highlight = demoCourse.highlight ||
      'Walk through announcements, assignments, quizzes, live sessions, and chat in a safe sandbox.';

    return (
      <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)]/90 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">Demo course</p>
            <h2 className="text-2xl font-semibold text-[var(--text)]">
              {demoCourse.title || 'LMS experience tour'}
            </h2>
            <p className="text-sm text-[var(--textMuted)]">{highlight}</p>
            <ul className="grid gap-2 text-sm text-[var(--text)] sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-[var(--textMuted)]">
                <span className="text-[var(--primary)]">•</span> Rubric-based assignment with plagiarism checks
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-[var(--textMuted)]">
                <span className="text-[var(--primary)]">•</span> Secure readiness quiz with analytics
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-[var(--textMuted)]">
                <span className="text-[var(--primary)]">•</span> Embedded video, Figma resources, and downloads
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-[var(--textMuted)]">
                <span className="text-[var(--primary)]">•</span> Announcements, chat lounge, and live meeting link
              </li>
            </ul>
            {demoCourse.enrolled ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600">
                You are enrolled in this guided tour.
              </span>
            ) : (
              <button
                type="button"
                onClick={handleJoinDemoCourse}
                disabled={!demoCourse.courseId || enrollingDemo}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)] disabled:opacity-60"
              >
                {enrollingDemo ? 'Enrolling…' : 'Join the experience tour'}
              </button>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-[var(--textMuted)]">
              <span>Code: {demoCourse.code || 'DEMO-COURSE'}</span>
              {demoCourse.startDate && <span>Opens {formatShort(new Date(demoCourse.startDate))}</span>}
              {demoCourse.endDate && <span>Ends {formatShort(new Date(demoCourse.endDate))}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--text)]">
              {demoCourse.courseId && (
                <Link
                  to={`/courses/${demoCourse.courseId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
                >
                  Enter demo course <span aria-hidden>→</span>
                </Link>
              )}
              {demoCourse.quizId && (
                <Link
                  to={`/quizzes/${demoCourse.quizId}/take`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
                >
                  Try readiness quiz <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:min-w-[220px]">
            {demoCourse.image && (
              <img
                src={demoCourse.image}
                alt={demoCourse.title || 'Demo course cover'}
                className="h-36 w-full rounded-2xl object-cover shadow-sm"
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {stats.length ? (
                stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{item.value}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-4 text-center text-sm text-[var(--textMuted)]">
                  Demo statistics will appear once the tour is refreshed.
                </div>
              )}
            </div>
          </div>
        </div>
        {!demoCourse.courseId && (
          <p className="mt-4 text-xs text-[var(--textMuted)]">
            The admin can seed the sandbox from Admin → Demo course experience. Once provisioned, it will appear here for every learner.
          </p>
        )}
      </section>
    );
  }, [demoCourse, enrollingDemo, handleJoinDemoCourse]);
  if (loading) {
    return (
      <Layout>
        <div className="py-24 text-center text-[var(--textMuted)]">Loading your dashboard…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-10 xl:grid xl:grid-cols-[260px,1fr]">
        <aside className="xl:pt-2">
          <div className="hidden xl:block">
            <nav className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--nav-bg)]/80 backdrop-blur p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)] mb-4">Dashboard</p>
              <ul className="space-y-2 text-sm">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setActiveSection(item.id)}
                      className={`block rounded-xl px-3 py-2 transition hover:text-[var(--text)] ${
                        activeSection === item.id
                          ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                          : 'text-[var(--textMuted)]'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="xl:hidden -mx-2 flex gap-3 overflow-x-auto px-2 pb-4 text-sm">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 ${
                  activeSection === item.id
                    ? 'border-[var(--primary)] text-[var(--text)] bg-[var(--surface)]'
                    : 'border-transparent bg-[var(--surface)]/70 text-[var(--textMuted)]'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-10">
          <header id="summary" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-[var(--textMuted)]">Welcome back</p>
                <h1 className="text-3xl font-semibold text-[var(--text)]">{user?.name}</h1>
                <p className="text-[var(--textMuted)] max-w-2xl">
                  Stay on track with your learning plan, keep an eye on upcoming events, and tailor the dashboard to match how you work best.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                {error && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-200 rounded-full px-3 py-1">
                    {error}
                  </span>
                )}
                <button
                  onClick={() => setCustomizing((prev) => !prev)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold text-[var(--text)] shadow-sm hover:border-[var(--primary)]/40"
                >
                  {customizing ? 'Done customizing' : 'Customize layout'}
                </button>
              </div>
            </div>
            {summaryCards}
            {demoCourseSection}
          </header>

          {customizing && (
            <section className="card p-6" aria-label="Customize dashboard widgets">
              <h2 className="text-lg font-semibold text-[var(--text)]">Choose the sections you want to see</h2>
              <p className="text-sm text-[var(--textMuted)]">
                Course progress is always visible. Toggle additional blocks below to personalize your workspace.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { key: 'announcements', label: 'Announcements & updates' },
                    { key: 'events', label: 'Upcoming events' },
                    { key: 'calendar', label: 'Calendar' },
                    { key: 'performance', label: 'Insights & performance' },
                  ] as { key: WidgetKey; label: string }[]
                ).map((option) => (
                  <label key={option.key} className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={widgets[option.key]}
                      onChange={() =>
                        setWidgets((prev) => ({
                          ...prev,
                          [option.key]: !prev[option.key],
                        }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section id="courses" className="card p-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-[var(--text)]">Enrolled courses</h2>
              <Link to="/courses" className="text-sm font-semibold text-[var(--primary)]">
                View catalog
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <p className="text-sm text-[var(--textMuted)]">You are not enrolled yet. Explore the catalog to join your first course.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {enrollments.map((enrollment) => {
                  const course = enrollment.course;
                  const timeline = getCourseTimeline(course);
                  const progress = progressLookup.get(course._id);
                  const progressPercent = Math.max(0, Math.min(100, progress?.progressPercent ?? 0));
                  return (
                    <Link
                      key={enrollment._id}
                      to={`/courses/${course._id}`}
                      className="group rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 shadow-sm transition hover:border-[var(--primary)]/60 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                          {course.title}
                        </h3>
                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${timeline.tone}`}>{timeline.label}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--textMuted)]">
                        {course.description || 'Track progress, access resources, and collaborate with your cohort.'}
                      </p>
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[var(--textMuted)]">
                          <span>{progress ? `${progressPercent}% complete` : 'Progress tracking kicks off once you start learning'}</span>
                          {progress?.grade != null && <span>Grade: {Math.round(progress.grade)}%</span>}
                        </div>
                        <div className="h-2 rounded-full bg-[var(--muted)]/40">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        {progress && (
                          <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--textMuted)]">
                            <span>
                              Assignments {progress.assignmentsCompleted}/{progress.assignmentsTotal}
                            </span>
                            <span>
                              Quizzes {progress.quizzesAttempted}/{progress.quizzesTotal}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section id="open-courses" className="card p-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-[var(--text)]">Open courses to enroll</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{openCourses.length} available</span>
            </div>
            {openCourses.length === 0 ? (
              <p className="text-sm text-[var(--textMuted)]">All caught up! Check back later for new offerings curated by the faculty.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {openCourses.slice(0, 6).map((course) => {
                  const timeline = getCourseTimeline(course);
                  return (
                    <Link
                      key={course._id}
                      to={`/courses/${course._id}`}
                      className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-5 transition hover:border-[var(--primary)]/50"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">
                        <span>{course.visibility || 'PUBLIC'}</span>
                        <span className={timeline.tone}>{timeline.label}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">{course.title}</h3>
                      <p className="mt-2 text-sm text-[var(--textMuted)]">
                        {course.description || 'Discover new skills and earn certificates on completion.'}
                      </p>
                      <span className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--primary)]">
                        Preview course →
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {widgets.announcements && (
            <section id="announcements" className="card p-8 space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--text)]">Announcements</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{announcements.length || 'No'} updates</span>
              </div>
              {announcements.length === 0 ? (
                <p className="text-sm text-[var(--textMuted)]">Faculty announcements will appear here as courses publish updates.</p>
              ) : (
                <ul className="space-y-4">
                  {announcements.slice(0, 6).map((announcement) => (
                    <li key={announcement._id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[var(--text)]">{announcement.title}</h3>
                        {announcement.createdAt && (
                          <span className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">
                            {formatShort(new Date(announcement.createdAt))}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[var(--textMuted)]">
                        {announcement.message || 'Keep an eye out for more details soon.'}
                      </p>
                      {announcement.course?.title && (
                        <span className="mt-3 inline-flex text-xs font-semibold text-[var(--primary)]">
                          {announcement.course.title}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(widgets.events || widgets.calendar) && (
            <section id="schedule" className="grid gap-6 lg:grid-cols-2">
              {widgets.events && (
                <div className="card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-[var(--text)]">Upcoming events</h2>
                    <span className="text-xs uppercase tracking-[0.2em] text-[var(--textMuted)]">{events.length}</span>
                  </div>
                  {events.length === 0 ? (
                    <p className="text-sm text-[var(--textMuted)]">No live sessions scheduled. Create or join events from your courses.</p>
                  ) : (
                    <ul className="space-y-4">
                      {events.slice(0, 6).map((event) => {
                        const start = new Date(event.startAt);
                        const end = event.endAt ? new Date(event.endAt) : null;
                        return (
                          <li key={event._id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
                            <div className="text-xs uppercase tracking-[0.25em] text-[var(--textMuted)]">
                              {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                            </div>
                            <p className="text-sm font-semibold text-[var(--text)]">{event.title}</p>
                            <p className="text-xs text-[var(--textMuted)]">
                              {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              {end ? ` – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
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
              )}

              {widgets.calendar && (
                <div className="card p-6 space-y-4" id="calendar">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-[var(--text)]">Calendar</h2>
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1"
                        aria-label="Previous month"
                      >
                        ←
                      </button>
                      <span className="font-semibold text-[var(--text)]">
                        {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1"
                        aria-label="Next month"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-[var(--textMuted)] text-xs uppercase tracking-[0.2em]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                      <span key={label} className="text-center">
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarWeeks.map((week, index) => (
                      <React.Fragment key={index}>
                        {week.map((cell) => {
                          const isSelected = cell.iso === selectedDate;
                          const isToday = cell.iso && cell.iso === todayIso;
                          return (
                            <button
                              key={cell.key}
                              type="button"
                              disabled={!cell.date}
                              onClick={() => cell.iso && setSelectedDate(cell.iso)}
                              className={`min-h-[60px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-2 text-left text-sm transition ${
                                isSelected ? 'border-[var(--primary)] shadow-md' : ''
                              } ${!cell.date ? 'opacity-40' : ''}`}
                            >
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                isSelected
                                  ? 'bg-[var(--primary)] text-white'
                                  : isToday
                                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                  : 'text-[var(--text)]'
                              }`}>
                                {cell.date ? cell.date.getDate() : ''}
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {cell.events.map((event, idx) => (
                                  <span
                                    key={`${cell.key}-${idx}`}
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      event.type === 'SESSION' ? 'bg-[var(--primary)]' : 'bg-[var(--accent)]'
                                    }`}
                                  />
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-4">
                    <h3 className="text-sm font-semibold text-[var(--text)]">
                      {selectedDate ? formatLong(new Date(selectedDate)) : 'Select a date'}
                    </h3>
                    {selectedHighlights.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--textMuted)]">No scheduled items for this day.</p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-sm text-[var(--text)]">
                        {selectedHighlights.map((highlight, idx) => (
                          <li key={`${highlight.title}-${idx}`}>
                            <span className="font-semibold">
                              {highlight.type === 'SESSION' ? 'Session' : 'Deadline'}:
                            </span>{' '}
                            {highlight.title}
                            {highlight.courseTitle && <span className="text-[var(--textMuted)]"> · {highlight.courseTitle}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {widgets.performance && (
            <section id="insights" className="card p-8 space-y-6">
              <h2 className="text-xl font-semibold text-[var(--text)]">Insights</h2>
              <p className="text-sm text-[var(--textMuted)]">Review high-level metrics and drill into course progress.</p>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
                  <h3 className="text-sm font-semibold text-[var(--text)]">Summary</h3>
                  <div className="mt-4 space-y-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-[var(--textMuted)]">
                          <span>{stat.label}</span>
                          <span className="font-semibold text-[var(--text)]">{stat.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--muted)]/40">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, (stat.value / maxStatValue) * 100)}%`, background: stat.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
                  <h3 className="text-sm font-semibold text-[var(--text)]">Course performance</h3>
                  {dashboardData?.progress?.length ? (
                    <div className="mt-4 space-y-4">
                      {dashboardData.progress.slice(0, 5).map((course) => (
                        <div key={course.courseId} className="space-y-2">
                          <div className="flex items-center justify-between text-sm font-semibold text-[var(--text)]">
                            <span>{course.courseTitle}</span>
                            <span>{Math.round(course.progressPercent)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--muted)]/40">
                            <div
                              className="h-full rounded-full bg-[var(--primary)]"
                              style={{ width: `${Math.min(100, course.progressPercent)}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-[var(--textMuted)]">
                            <span>
                              Assignments {course.assignmentsCompleted}/{course.assignmentsTotal}
                            </span>
                            <span>
                              Quizzes {course.quizzesAttempted}/{course.quizzesTotal}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--textMuted)]">
                      Progress analytics will populate as you complete coursework.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

function toISODate(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

function getCourseTimeline(course: Course) {
  const now = new Date();
  const start = course.startDate ? new Date(course.startDate) : undefined;
  const end = course.endDate ? new Date(course.endDate) : undefined;
  if (start && start > now) {
    return { label: `Starts ${formatShort(start)}`, tone: 'text-[var(--primary)]' };
  }
  if (end && end < now) {
    return { label: `Ended ${formatShort(end)}`, tone: 'text-[var(--textMuted)]' };
  }
  if (end && end >= now) {
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `${diffDays} day${diffDays === 1 ? '' : 's'} left`, tone: 'text-amber-500' };
  }
  return { label: 'Self-paced', tone: 'text-emerald-500' };
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLong(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

