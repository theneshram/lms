import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type ParticipantRole = 'STUDENT' | 'TEACHER' | 'TA';

type Participant = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  role: ParticipantRole;
  status?: string;
};

type UserLite = { _id: string; name: string; email: string; role: string };

const ROLE_OPTIONS: Array<{ label: string; value: ParticipantRole }> = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teacher', value: 'TEACHER' },
  { label: 'Teaching assistant', value: 'TA' },
];

export default function ParticipantsPanel({ courseId }: { courseId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [role, setRole] = useState<ParticipantRole>('STUDENT');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get<Participant[]>(`/admin/courses/${courseId}/participants`);
      setParticipants(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [courseId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      try {
        const { data } = await api.get<UserLite[]>(`/admin/users/search`, { params: { q: search } });
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function add(userId: string) {
    try {
      await api.post(`/admin/courses/${courseId}/participants`, { userId, role, sendWelcome });
      setMessage('Participant added.');
      await refresh();
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? 'Unable to add participant.');
    }
  }

  async function remove(userId: string) {
    try {
      await api.delete(`/admin/courses/${courseId}/participants/${userId}`);
      await refresh();
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? 'Unable to remove participant.');
    }
  }

  async function updateRole(userId: string, nextRole: ParticipantRole) {
    try {
      await api.put(`/admin/courses/${courseId}/participants/${userId}`, { role: nextRole });
      setParticipants((prev) => prev.map((p) => (p.userId === userId ? { ...p, role: nextRole } : p)));
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? 'Unable to update role.');
    }
  }

  async function importCsv() {
    if (!bulkCsv.trim()) {
      setMessage('Paste CSV rows before importing.');
      return;
    }
    setBulkProcessing(true);
    try {
      await api.post(`/admin/courses/${courseId}/participants/bulk`, {
        csv: bulkCsv,
        defaultRole: role,
        sendWelcome,
      });
      setMessage('Bulk enrollment processed.');
      setBulkCsv('');
      await refresh();
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? 'Bulk enrollment failed.');
    } finally {
      setBulkProcessing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--text)]">Participants</h4>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
          <input type="checkbox" checked={sendWelcome} onChange={(event) => setSendWelcome(event.target.checked)} />
          Send welcome email
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr,160px]">
        <input
          type="search"
          placeholder="Search users by name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as ParticipantRole)}
          className="rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {search && results.length > 0 && (
        <ul className="space-y-2 text-sm">
          {results.map((user) => (
            <li key={user._id} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div>
                <p className="font-semibold text-[var(--text)]">{user.name}</p>
                <p className="text-[var(--textMuted)]">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => add(user._id)}
                className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        {loading ? (
          <p className="text-sm text-[var(--textMuted)]">Loading participants…</p>
        ) : participants.length === 0 ? (
          <p className="text-sm text-[var(--textMuted)]">No participants yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {participants.map((participant) => (
              <li key={participant.id} className="rounded-xl border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{participant.name}</p>
                    <p className="text-[var(--textMuted)]">{participant.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={participant.role}
                      onChange={(event) => updateRole(participant.userId, event.target.value as ParticipantRole)}
                      className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => remove(participant.userId)} className="text-rose-500 text-xs">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-[var(--border-soft)] p-3 text-xs">
        <p className="font-semibold text-[var(--text)]">Bulk CSV enrollment</p>
        <p className="text-[var(--textMuted)]">One row per user, e.g. <code>user@example.com,TEACHER</code>. Role falls back to the selector above.</p>
        <textarea
          value={bulkCsv}
          onChange={(event) => setBulkCsv(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-[var(--border-soft)] px-3 py-2"
        />
        <button
          type="button"
          onClick={importCsv}
          disabled={bulkProcessing}
          className="rounded-full bg-[var(--primary)] px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          {bulkProcessing ? 'Importing…' : 'Import CSV rows'}
        </button>
      </div>

      {message && <p className="text-xs text-[var(--textMuted)]">{message}</p>}
    </section>
  );
}
