import React from 'react';
import { Link } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

const features = [
  {
    title: 'Personalized Learning Journeys',
    description: 'Adaptive paths, prerequisites, and automated recommendations ensure every learner progresses with confidence.',
  },
  {
    title: 'Collaborative Classrooms',
    description: 'Live virtual sessions, discussion forums, and real-time messaging keep cohorts engaged across time zones.',
  },
  {
    title: 'Insights that Drive Action',
    description: 'Analytics dashboards highlight risk, momentum, and completion trends so leaders can intervene quickly.',
  },
];

const quickActions = [
  { label: 'View Dashboard', to: '/dashboard' },
  { label: 'Explore Courses', to: '/courses' },
  { label: 'Admin Console', to: '/admin', roles: ['ADMIN'] as const },
];

export default function App() {
  const { user } = useAuth();
  const { appearance } = useTheme();
  const headerTitle = appearance?.header?.title || 'Learning Management System';
  const appTitle = appearance?.header?.applicationName || 'LMS';

  return (
    <Layout>
      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-12 items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-4 py-2 text-sm font-semibold">
            {headerTitle}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[var(--text)]">
            Empower every learner with a modern {appTitle} experience
          </h1>
          <p className="text-lg leading-relaxed text-[var(--textMuted)] max-w-2xl">
            Launch blended programs, automate enrollments, and keep stakeholders aligned with beautiful dashboards, event automation, and branded communications.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="px-6 py-3 rounded-full bg-[var(--primary)] text-white text-base font-semibold shadow-lg shadow-[var(--primary)]/30 hover:translate-y-[-1px] transition"
            >
              {user ? 'Open my dashboard' : 'Start learning now'}
            </Link>
            <Link
              to="/courses"
              className="px-6 py-3 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] font-semibold hover:bg-[var(--primary)]/5 transition"
            >
              Browse catalog
            </Link>
          </div>
        </div>

        <div className="card p-8 space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text)]">Quick actions</h2>
          <div className="space-y-3">
            {quickActions.map(({ label, to, roles }) => {
              if (roles && (!user || !roles.includes(user.role as any))) return null;
              if (!user && to !== '/courses') return null;
              return (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 px-4 py-3 hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5 transition"
                >
                  <span className="font-medium text-[var(--text)]">{label}</span>
                  <span className="text-[var(--primary)] text-sm">→</span>
                </Link>
              );
            })}
          </div>
          <div className="rounded-2xl bg-[var(--secondary)]/10 px-4 py-3 text-sm text-[var(--text)]">
            <strong>Switch themes.</strong> Toggle between light and dark mode anytime from the top navigation.
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-[var(--text)] mb-6">Why teams choose our LMS</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">{feature.title}</h3>
              <p className="text-sm text-[var(--textMuted)] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
