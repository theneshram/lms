import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const roleOptions = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teaching Assistant', value: 'TA' },
  { label: 'Teacher', value: 'TEACHER' },
  { label: 'Admin', value: 'ADMIN' },
];

type Settings = {
  appearance: any;
  mail: { smtp?: any; templates?: any[] };
  directory: any;
  notifications: any;
  database: any;
};

type Palette = {
  id: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
};

type FontResponse = { fonts: string[] };

type SaveState = { message: string; tone: 'success' | 'error' } | null;

type DatabaseState = { provider?: string; uri?: string; dbName?: string };

type AppearanceForm = {
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  activePaletteId?: string;
  palettes: Palette[];
  typography: { heading?: string; body?: string };
  header: { logoUrl?: string; title?: string; applicationName?: string };
  footer: { organization?: string; legal?: string; customText?: string; showYear?: boolean };
  allowUserToggle?: boolean;
};

type SmtpForm = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fonts, setFonts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [emailTest, setEmailTest] = useState('');
  const [emailState, setEmailState] = useState<SaveState>(null);
  const [dbState, setDbState] = useState<SaveState>(null);
  const { refresh } = useTheme();
  const navSections = useMemo(
    () => [
      { id: 'branding', label: 'Branding & appearance' },
      { id: 'smtp', label: 'Email & SMTP' },
      { id: 'directory', label: 'Directory & SSO' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'database', label: 'Database & backups' },
    ],
    []
  );
  const [activeNav, setActiveNav] = useState(navSections[0].id);

  useEffect(() => {
    async function load() {
      const [{ data: rawSettings }, { data: fontData }] = await Promise.all([
        api.get<Settings>('/admin/settings'),
        api.get<FontResponse>('/public/fonts/google'),
      ]);
      setSettings(rawSettings);
      setFonts(fontData.fonts || []);
    }
    load();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveNav(visible[0].target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0.2 }
    );
    navSections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [navSections, settings]);

  const appearance = useMemo<AppearanceForm | undefined>(() => settings?.appearance, [settings]);
  const smtp = useMemo<SmtpForm | undefined>(() => settings?.mail?.smtp, [settings]);
  const directory = useMemo(() => settings?.directory ?? {}, [settings]);
  const notifications = useMemo(() => settings?.notifications ?? {}, [settings]);
  const database = useMemo<DatabaseState>(() => settings?.database ?? {}, [settings]);

  function updateAppearance(updates: Partial<AppearanceForm>) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            appearance: {
              ...prev.appearance,
              ...updates,
            },
          }
        : prev
    );
  }

  function updateHeader(field: string, value: string) {
    updateAppearance({ header: { ...appearance?.header, [field]: value } });
  }

  function updateFooter(field: string, value: string | boolean) {
    updateAppearance({ footer: { ...appearance?.footer, [field]: value } });
  }

  function updateTypography(field: 'heading' | 'body', value: string) {
    updateAppearance({ typography: { ...appearance?.typography, [field]: value } });
  }

  function updateSmtp(field: keyof SmtpForm, value: string | number | boolean) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            mail: {
              ...prev.mail,
              smtp: {
                ...prev.mail?.smtp,
                [field]: value,
              },
              templates: prev.mail?.templates,
            },
          }
        : prev
    );
  }

  function updateDirectory(field: string, value: string | boolean) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            directory: {
              ...prev.directory,
              [field]: value,
            },
          }
        : prev
    );
  }

  function updateNotifications(field: string, value: number | string | string[]) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            notifications: {
              ...prev.notifications,
              [field]: value,
            },
          }
        : prev
    );
  }

  function updateDatabase(field: keyof DatabaseState, value: string) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            database: {
              ...prev.database,
              [field]: value,
            },
          }
        : prev
    );
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaveState(null);
    try {
      const payload = {
        appearance: settings.appearance,
        mail: { ...settings.mail, smtp: settings.mail?.smtp },
        directory: settings.directory,
        notifications: settings.notifications,
      };
      await api.post('/admin/settings', payload);
      await refresh();
      setSaveState({ message: 'Appearance and integration settings saved.', tone: 'success' });
    } catch (error) {
      setSaveState({ message: 'Unable to save settings. Check required fields.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!emailTest) {
      setEmailState({ message: 'Enter a recipient email address.', tone: 'error' });
      return;
    }
    try {
      await api.post('/admin/settings/mail/test', { to: emailTest });
      setEmailState({ message: 'Test email sent successfully.', tone: 'success' });
    } catch (error) {
      setEmailState({ message: 'Failed to send test email. Verify SMTP credentials.', tone: 'error' });
    }
  }

  async function handleApplyDatabase() {
    if (!database?.uri) {
      setDbState({ message: 'Provide a MongoDB connection string before applying.', tone: 'error' });
      return;
    }
    try {
      const response = await api.post('/admin/settings/database/apply', {
        provider: database?.provider,
        uri: database?.uri,
        dbName: database?.dbName,
      });
      setDbState({ message: `Database reconfigured to ${response.data.active?.uri}`, tone: 'success' });
    } catch (error) {
      setDbState({ message: 'Unable to connect to the provided database.', tone: 'error' });
    }
  }

  if (!settings || !appearance) {
    return (
      <Layout>
        <div className="text-[var(--textMuted)]">Loading system settings…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[260px,1fr]">
        <aside className="lg:pt-2">
          <div className="hidden lg:block">
            <nav className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--nav-bg)]/80 backdrop-blur p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)] mb-4">Admin navigation</p>
              <ul className="space-y-2 text-sm">
                {navSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={() => setActiveNav(section.id)}
                      className={`block rounded-xl px-3 py-2 transition hover:text-[var(--text)] ${
                        activeNav === section.id
                          ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                          : 'text-[var(--textMuted)]'
                      }`}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="lg:hidden -mx-2 flex gap-3 overflow-x-auto px-2 pb-4 text-sm">
            {navSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveNav(section.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 ${
                  activeNav === section.id
                    ? 'border-[var(--primary)] text-[var(--text)] bg-[var(--surface)]'
                    : 'border-transparent bg-[var(--surface)]/70 text-[var(--textMuted)]'
                }`}
              >
                {section.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-10">
          <header className="space-y-2" id="overview">
            <p className="text-sm uppercase tracking-[0.3em] text-[var(--textMuted)]">System Configuration</p>
            <h1 className="text-3xl font-semibold text-[var(--text)]">Admin customization studio</h1>
            <p className="text-[var(--textMuted)] max-w-2xl">
              Manage branding, theme palettes sourced from the Figma color library, email integrations, directory services, and database configuration from one place.
            </p>
          </header>

          <section id="branding" className="card p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Branding & appearance</h2>
              <p className="text-sm text-[var(--textMuted)]">Control hero branding, footer language, theme palettes, and Google font selections.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/30 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save appearance'}
            </button>
          </div>

          {saveState && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                saveState.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}
            >
              {saveState.message}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[var(--text)]">Header title</label>
              <input
                type="text"
                value={appearance.header?.title || ''}
                onChange={(e) => updateHeader('title', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
              />
              <label className="block text-sm font-semibold text-[var(--text)]">Application name</label>
              <input
                type="text"
                value={appearance.header?.applicationName || ''}
                onChange={(e) => updateHeader('applicationName', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <label className="block text-sm font-semibold text-[var(--text)]">Logo URL</label>
              <input
                type="url"
                value={appearance.header?.logoUrl || ''}
                onChange={(e) => updateHeader('logoUrl', e.target.value)}
                placeholder="https://cdn.example.com/logo.svg"
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[var(--text)]">Footer organization</label>
              <input
                type="text"
                value={appearance.footer?.organization || ''}
                onChange={(e) => updateFooter('organization', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <label className="block text-sm font-semibold text-[var(--text)]">Footer legal text</label>
              <input
                type="text"
                value={appearance.footer?.legal || ''}
                onChange={(e) => updateFooter('legal', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <label className="block text-sm font-semibold text-[var(--text)]">Footer custom message</label>
              <textarea
                value={appearance.footer?.customText || ''}
                onChange={(e) => updateFooter('customText', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
                rows={3}
              />
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={appearance.footer?.showYear !== false}
                  onChange={(e) => updateFooter('showYear', e.target.checked)}
                />
                Show current year in footer
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">Theme mode</label>
              <select
                value={appearance.themeMode}
                onChange={(e) => updateAppearance({ themeMode: e.target.value as AppearanceForm['themeMode'] })}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              >
                <option value="SYSTEM">Follow system preference</option>
                <option value="LIGHT">Always light</option>
                <option value="DARK">Always dark</option>
              </select>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={appearance.allowUserToggle !== false}
                  onChange={(e) => updateAppearance({ allowUserToggle: e.target.checked })}
                />
                Allow learners to toggle theme
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">Heading font</label>
              <select
                value={appearance.typography?.heading || ''}
                onChange={(e) => updateTypography('heading', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              >
                <option value="">Default (Inter)</option>
                {fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">Body font</label>
              <select
                value={appearance.typography?.body || ''}
                onChange={(e) => updateTypography('body', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              >
                <option value="">Default (Inter)</option>
                {fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text)] mb-3">Theme palettes</p>
            <div className="grid md:grid-cols-3 gap-4">
              {appearance.palettes?.map((palette: Palette) => (
                <button
                  type="button"
                  key={palette.id}
                  onClick={() => updateAppearance({ activePaletteId: palette.id })}
                  className={`rounded-2xl border-2 p-4 text-left space-y-3 transition ${
                    palette.id === appearance.activePaletteId
                      ? 'border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20'
                      : 'border-transparent bg-white/60 hover:border-[var(--primary)]/40'
                  }`}
                >
                  <div className="flex gap-2">
                    {Object.entries(palette.colors)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <span key={key} className="h-8 w-8 rounded-full border border-white/60" style={{ background: value }} />
                      ))}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{palette.name}</p>
                    <p className="text-xs text-[var(--textMuted)]">{palette.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="smtp" className="card p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">SMTP email setup</h2>
              <p className="text-sm text-[var(--textMuted)]">Configure transactional email for password resets, welcome letters, and enrollment confirmations.</p>
            </div>
          </div>

          {emailState && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                emailState.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}
            >
              {emailState.message}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              value={smtp?.host || ''}
              onChange={(e) => updateSmtp('host', e.target.value)}
              placeholder="SMTP host"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <input
              type="number"
              value={smtp?.port ?? 587}
              onChange={(e) => updateSmtp('port', Number(e.target.value))}
              placeholder="Port"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={Boolean(smtp?.secure)}
                onChange={(e) => updateSmtp('secure', e.target.checked)}
              />
              Use SSL/TLS
            </label>
            <input
              type="text"
              value={smtp?.user || ''}
              onChange={(e) => updateSmtp('user', e.target.value)}
              placeholder="Username"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <input
              type="password"
              value={smtp?.password || ''}
              onChange={(e) => updateSmtp('password', e.target.value)}
              placeholder="Password / App token"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <input
              type="text"
              value={smtp?.fromName || ''}
              onChange={(e) => updateSmtp('fromName', e.target.value)}
              placeholder="From name"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <input
              type="email"
              value={smtp?.fromEmail || ''}
              onChange={(e) => updateSmtp('fromEmail', e.target.value)}
              placeholder="From email"
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="email"
              value={emailTest}
              onChange={(e) => setEmailTest(e.target.value)}
              placeholder="Send test email to"
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleTestEmail}
              className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/30"
            >
              Send test email
            </button>
          </div>
        </section>

        <section id="directory" className="card p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Directory & SSO</h2>
              <p className="text-sm text-[var(--textMuted)]">Enable Azure AD, Google, Okta, or generic SAML to auto-provision accounts with the appropriate LMS roles.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[var(--text)]">Provider</label>
              <select
                value={directory.provider || 'NONE'}
                onChange={(e) => updateDirectory('provider', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              >
                <option value="NONE">Disabled</option>
                <option value="AZURE_AD">Azure Active Directory</option>
                <option value="GOOGLE">Google Workspace / Cloud Identity</option>
                <option value="OKTA">Okta</option>
                <option value="GENERIC_SAML">Generic SAML 2.0</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={Boolean(directory.enabled)}
                  onChange={(e) => updateDirectory('enabled', e.target.checked)}
                />
                Enable SSO for sign-in
              </label>
              <label className="block text-sm font-semibold text-[var(--text)]">Default LMS role</label>
              <select
                value={directory.defaultRole || 'STUDENT'}
                onChange={(e) => updateDirectory('defaultRole', e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={directory.domain || ''}
                onChange={(e) => updateDirectory('domain', e.target.value)}
                placeholder="Tenant domain"
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <input
                type="url"
                value={directory.metadataUrl || ''}
                onChange={(e) => updateDirectory('metadataUrl', e.target.value)}
                placeholder="Metadata URL"
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <input
                type="text"
                value={directory.clientId || ''}
                onChange={(e) => updateDirectory('clientId', e.target.value)}
                placeholder="Client ID"
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
              />
              <input
                type="password"
                value={directory.clientSecret || ''}
                onChange={(e) => updateDirectory('clientSecret', e.target.value)}
                placeholder="Client secret"
                className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="card p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Event notifications</h2>
              <p className="text-sm text-[var(--textMuted)]">Define default reminder offsets for live sessions and closing summaries. Instructors can opt in or out when scheduling.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm text-[var(--text)]">
              Reminder before start (minutes)
              <input
                type="number"
                value={notifications.eventStartLeadMinutes ?? 30}
                onChange={(e) => updateNotifications('eventStartLeadMinutes', Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-[var(--text)]">
              Follow-up after end (minutes)
              <input
                type="number"
                value={notifications.eventEndLeadMinutes ?? 15}
                onChange={(e) => updateNotifications('eventEndLeadMinutes', Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="card p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Database configuration</h2>
              <p className="text-sm text-[var(--textMuted)]">Switch between local MongoDB deployments and managed MongoDB Atlas clusters, then migrate schemas instantly.</p>
            </div>
          </div>

          {dbState && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                dbState.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}
            >
              {dbState.message}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={database.provider || 'LOCAL'}
              onChange={(e) => updateDatabase('provider', e.target.value)}
              className="rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
            >
              <option value="LOCAL">Local MongoDB</option>
              <option value="ATLAS">MongoDB Atlas</option>
              <option value="CUSTOM">Custom connection</option>
            </select>
            <input
              type="text"
              value={database.uri || ''}
              onChange={(e) => updateDatabase('uri', e.target.value)}
              placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
              className="rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
            />
            <input
              type="text"
              value={database.dbName || ''}
              onChange={(e) => updateDatabase('dbName', e.target.value)}
              placeholder="Database name"
              className="rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyDatabase}
            className="px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/30"
          >
            Apply & run schema sync
          </button>
        </section>
      </div>
    </Layout>
  );
}

