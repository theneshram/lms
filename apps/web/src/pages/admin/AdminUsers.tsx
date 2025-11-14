import React from 'react';

const cohorts = [
  { label: 'Students', color: 'text-emerald-500' },
  { label: 'Teachers', color: 'text-sky-500' },
  { label: 'Teaching Assistants', color: 'text-indigo-500' },
  { label: 'Admins', color: 'text-amber-500' },
];

export default function AdminUsers() {
  return (
    <div className="space-y-8">
      <section className="card space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">User directory</h2>
            <p className="text-sm text-[var(--textMuted)]">
              Provision accounts, map roles, and review the most recent sign-ins from a single surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)]/50">
              Invite user
            </button>
            <button className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30">
              Bulk upload
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {cohorts.map((cohort) => (
            <div key={cohort.label} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
              <p className={`text-xs uppercase tracking-[0.3em] ${cohort.color}`}>{cohort.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text)]">0</p>
              <p className="mt-1 text-xs text-[var(--textMuted)]">Awaiting live data.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-8">
        <h3 className="text-lg font-semibold text-[var(--text)]">Activity feed</h3>
        <p className="text-sm text-[var(--textMuted)]">Recent admin actions will surface here for quick auditing.</p>
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] p-6 text-sm text-[var(--textMuted)]">
          No events just yet. Once directory API traffic flows through, you will see invitations, role changes, and enrolment
          sync logs.
        </div>
      </section>
    </div>
  );
}
