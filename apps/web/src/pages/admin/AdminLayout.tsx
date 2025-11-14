import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Layout from '../../components/Layout';

const tabs = [
  { label: 'Courses', path: 'courses', helper: 'Active, archived, and upcoming programmes.' },
  { label: 'Users', path: 'users', helper: 'Directory, roles, and enrolment controls.' },
  { label: 'Settings', path: 'settings', helper: 'Branding, SMTP, storage, and databases.' },
  { label: 'Notifications', path: 'notifications', helper: 'Automation, alerts, and reminder policies.' },
  { label: 'Question Bank', path: 'question-bank', helper: 'Assessments, quiz pools, and rubrics.' },
];

export default function AdminLayout() {
  return (
    <Layout>
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--textMuted)]">Admin Console</p>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Operations control center</h1>
          <p className="text-sm text-[var(--textMuted)] max-w-3xl">
            Navigate between courses, users, notifications, and system preferences. Each area is purpose-built so admins
            can focus on a single responsibility at a time.
          </p>
        </header>

        <div className="flex w-full gap-3 overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 px-4 py-3 text-sm">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/admin/${tab.path}`}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 transition ${
                  isActive ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--textMuted)] hover:text-[var(--text)]'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <section className="grid gap-4 text-xs text-[var(--textMuted)] sm:grid-cols-5">
          {tabs.map((tab) => (
            <div key={`${tab.path}-helper`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-4">
              <p className="text-sm font-semibold text-[var(--text)]">{tab.label}</p>
              <p className="mt-1 leading-relaxed">{tab.helper}</p>
            </div>
          ))}
        </section>

        <div className="space-y-8">
          <Outlet />
        </div>
      </div>
    </Layout>
  );
}
