import React from 'react';

const placeholders = [
  { label: 'Question pools', description: 'Group quizzes by topic, difficulty, or course section.' },
  { label: 'Rubrics', description: 'Standardise grading criteria for written assessments.' },
  { label: 'Versioning', description: 'Track edits and publish changes when ready.' },
];

export default function AdminQuestionBank() {
  return (
    <div className="space-y-8">
      <section className="card space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">Question bank</h2>
            <p className="text-sm text-[var(--textMuted)]">
              Centralise quiz items, rubrics, and blueprint metadata before connecting them to activities.
            </p>
          </div>
          <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)]/50">
            Add item
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {placeholders.map((item) => (
            <div key={item.label} className="rounded-2xl border border-dashed border-[var(--border-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">{item.label}</p>
              <p className="mt-2 text-xs text-[var(--textMuted)] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-8 text-sm text-[var(--textMuted)]">
        API endpoints for banks and activities will appear here once the backend scaffolding is connected. Until then this
        space acts as a design reference for the upcoming builder experience.
      </section>
    </div>
  );
}
