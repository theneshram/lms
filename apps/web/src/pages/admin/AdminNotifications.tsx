import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type ChannelSettings = { email?: boolean; sms?: boolean; inApp?: boolean };
type EventKey = 'courseWelcome' | 'assignmentDue' | 'sessionReminder' | 'announcement';

type NotificationPreferences = {
  eventStartLeadMinutes?: number;
  eventEndLeadMinutes?: number;
  defaultChannels: ChannelSettings;
  userOverridesEnabled?: boolean;
  events: Record<
    EventKey,
    {
      enabled?: boolean;
      leadMinutes?: number;
      channels?: ChannelSettings;
    }
  >;
};

const DEFAULT_CHANNELS: ChannelSettings = { email: true, sms: false, inApp: true };

const EVENT_CONFIG: Array<{
  key: EventKey;
  label: string;
  description: string;
  showLead?: boolean;
}> = [
  { key: 'courseWelcome', label: 'Course welcome email', description: 'Triggered when learners are added to a course.' },
  {
    key: 'assignmentDue',
    label: 'Assignment reminders',
    description: 'Sends a countdown reminder before each due date.',
    showLead: true,
  },
  {
    key: 'sessionReminder',
    label: 'Live session reminders',
    description: 'Alerts learners ahead of each virtual session.',
    showLead: true,
  },
  { key: 'announcement', label: 'Course announcements', description: 'Notifies learners when admins publish an announcement.' },
];

export default function AdminNotifications() {
  const [form, setForm] = useState<NotificationPreferences>({
    defaultChannels: DEFAULT_CHANNELS,
    events: {
      courseWelcome: {},
      assignmentDue: {},
      sessionReminder: {},
      announcement: {},
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      setLoading(true);
      try {
        const { data } = await api.get<{ notifications?: NotificationPreferences }>('/admin/settings');
        if (cancelled) return;
        const next: NotificationPreferences = {
          defaultChannels: { ...DEFAULT_CHANNELS, ...(data.notifications?.defaultChannels ?? {}) },
          eventStartLeadMinutes: data.notifications?.eventStartLeadMinutes ?? 30,
          eventEndLeadMinutes: data.notifications?.eventEndLeadMinutes ?? 15,
          userOverridesEnabled: data.notifications?.userOverridesEnabled ?? true,
          events: {
            courseWelcome: { enabled: true, leadMinutes: 0, ...(data.notifications?.events?.courseWelcome ?? {}) },
            assignmentDue: { enabled: true, leadMinutes: 120, ...(data.notifications?.events?.assignmentDue ?? {}) },
            sessionReminder: { enabled: true, leadMinutes: 30, ...(data.notifications?.events?.sessionReminder ?? {}) },
            announcement: { enabled: true, ...(data.notifications?.events?.announcement ?? {}) },
          },
        };
        setForm(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDefaultChannel(channel: keyof ChannelSettings, value: boolean) {
    setForm((prev) => ({
      ...prev,
      defaultChannels: { ...prev.defaultChannels, [channel]: value },
    }));
  }

  function updateEvent(key: EventKey, updates: Partial<{ enabled: boolean; leadMinutes: number; channels: ChannelSettings }>) {
    setForm((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: {
          ...(prev.events[key] ?? {}),
          ...updates,
        },
      },
    }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/admin/settings', { notifications: form });
      setMessage('Notification policies updated.');
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? 'Unable to save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <section className="card space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">Notification policies</h2>
            <p className="text-sm text-[var(--textMuted)]">
              Choose which channels are enabled by default and how far in advance reminders should go out.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save policies'}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              message.includes('Unable') ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-700'
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {['email', 'inApp', 'sms'].map((channel) => (
            <label
              key={channel}
              className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm text-[var(--text)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">{channel === 'inApp' ? 'In-app' : channel}</span>
                <input
                  type="checkbox"
                  checked={Boolean(form.defaultChannels[channel as keyof ChannelSettings])}
                  onChange={(event) => updateDefaultChannel(channel as keyof ChannelSettings, event.target.checked)}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--textMuted)]">
                {channel === 'email'
                  ? 'Transactional welcome letters, reminders, completion summaries.'
                  : channel === 'inApp'
                  ? 'Bell notifications inside the learner portal.'
                  : 'Short alerts for high-priority nudges.'}
              </p>
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--text)]">
            Start reminder lead (minutes)
            <input
              type="number"
              min={0}
              value={form.eventStartLeadMinutes ?? 30}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventStartLeadMinutes: Number(event.target.value) }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm"
              disabled={loading}
            />
          </label>
          <label className="text-sm text-[var(--text)]">
            End summary delay (minutes)
            <input
              type="number"
              min={0}
              value={form.eventEndLeadMinutes ?? 15}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventEndLeadMinutes: Number(event.target.value) }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm"
              disabled={loading}
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={form.userOverridesEnabled !== false}
            onChange={(event) => setForm((prev) => ({ ...prev, userOverridesEnabled: event.target.checked }))}
            disabled={loading}
          />
          Allow learners to opt out per channel
        </label>
      </section>

      <section className="card space-y-4 p-8">
        <h3 className="text-lg font-semibold text-[var(--text)]">Event presets</h3>
        <p className="text-sm text-[var(--textMuted)]">
          Control which messages are sent for each event, their channels, and the reminder offsets.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {EVENT_CONFIG.map((event) => {
            const config = form.events[event.key] ?? {};
            return (
              <div key={event.key} className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{event.label}</p>
                    <p className="text-xs text-[var(--textMuted)]">{event.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={config.enabled !== false}
                      onChange={(ev) => updateEvent(event.key, { enabled: ev.target.checked })}
                      disabled={loading}
                    />
                    Enabled
                  </label>
                </div>
                {event.showLead && (
                  <label className="block text-xs text-[var(--text)]">
                    Reminder offset (minutes)
                    <input
                      type="number"
                      min={0}
                      value={config.leadMinutes ?? ''}
                      onChange={(ev) =>
                        updateEvent(event.key, { leadMinutes: Number(ev.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--border-soft)] px-3 py-1.5"
                      disabled={loading}
                    />
                  </label>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text)]">
                  {['email', 'inApp', 'sms'].map((channel) => (
                    <label
                      key={`${event.key}-${channel}`}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 ${
                        config.channels?.[channel as keyof ChannelSettings]
                          ? 'border-[var(--primary)] text-[var(--primary)]'
                          : 'border-[var(--border-soft)] text-[var(--textMuted)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(config.channels?.[channel as keyof ChannelSettings])}
                        onChange={(ev) =>
                          updateEvent(event.key, {
                            channels: { ...(config.channels ?? {}), [channel]: ev.target.checked },
                          })
                        }
                        disabled={loading}
                      />
                      <span className="capitalize">{channel === 'inApp' ? 'In-app' : channel}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </form>
  );
}
