import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const roleOptions = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teaching Assistant', value: 'TA' },
  { label: 'Teacher', value: 'TEACHER' },
  { label: 'Admin', value: 'ADMIN' },
];

const storageProviderOptions: Array<{ label: string; value: StorageProvider }> = [
  { label: 'Local storage (server filesystem)', value: 'LOCAL' },
  { label: 'Amazon S3', value: 'AWS_S3' },
  { label: 'Azure Blob Storage', value: 'AZURE_BLOB' },
  { label: 'Google Cloud Storage', value: 'GCP' },
  { label: 'Microsoft OneDrive', value: 'ONEDRIVE' },
];

type Palette = {
  id: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
};

type FontResponse = { fonts: string[] };

type SaveState = { message: string; tone: 'success' | 'error' } | null;

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

type StorageProvider = 'LOCAL' | 'AWS_S3' | 'AZURE_BLOB' | 'GCP' | 'ONEDRIVE';

type StorageForm = {
  provider?: StorageProvider;
  local?: { root?: string; baseUrl?: string };
  aws?: { bucket?: string; region?: string; accessKeyId?: string; secretAccessKey?: string };
  azure?: { connectionString?: string; container?: string };
  gcp?: { bucket?: string; projectId?: string; credentialsJson?: string };
  onedrive?: { clientId?: string; clientSecret?: string; tenantId?: string; driveId?: string };
  uploadLimits?: {
    maxFileSizeMb?: number;
    totalQuotaGb?: number;
    allowVideos?: boolean;
    allowDocuments?: boolean;
    allowImages?: boolean;
    allowScorm?: boolean;
  };
  archiveAfterDays?: number;
};

type DemoCourseForm = {
  code?: string;
  courseId?: string;
  quizId?: string;
  autoEnroll?: boolean;
  highlight?: string;
};

type ObservabilityForm = {
  enableStorageTelemetry?: boolean;
  enableUserPresence?: boolean;
  enableActivityStream?: boolean;
  retentionDays?: number;
};

type AdminCounts = {
  users: { total: number; students: number; teachers: number; admins: number };
  courses: { total: number; published: number; upcoming: number };
  enrollments: number;
  sessions: number;
};

type AdminOverview = {
  counts: AdminCounts;
  storage: { root: string; usedBytes: number; usedMB: number; files: number; directories: number };
  database?: {
    name?: string;
    collections?: number;
    objects?: number;
    storageSizeMb?: number;
    dataSizeMb?: number;
    indexSizeMb?: number;
    avgObjSizeKb?: number | null;
  } | null;
  activeUsers: Array<{ id: string; name: string; email?: string; role: string; lastLoginAt?: string }>;
  recentLogs: Array<{
    id: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
    occurredAt?: string;
    user?: { id: string; name: string; email?: string; role: string } | null;
  }>;
  upcomingSessions: Array<{
    _id: string;
    title: string;
    startAt?: string;
    endAt?: string;
    provider?: string;
    course?: { _id: string; title: string; code?: string };
  }>;
  settings?: {
    demoCourse?: DemoCourseForm;
    storage?: StorageForm;
    observability?: ObservabilityForm;
  };
};

type DatabaseState = { provider?: string; uri?: string; dbName?: string };

type Settings = {
  appearance: AppearanceForm;
  mail: { smtp?: SmtpForm; templates?: any[] };
  directory: any;
  notifications: any;
  database: DatabaseState;
  storage?: StorageForm;
  demoCourse?: DemoCourseForm;
  observability?: ObservabilityForm;
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fonts, setFonts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [emailTest, setEmailTest] = useState('');
  const [emailState, setEmailState] = useState<SaveState>(null);
  const [dbState, setDbState] = useState<SaveState>(null);
  const [activeDatabase, setActiveDatabase] = useState<DatabaseState | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userFormState, setUserFormState] = useState<SaveState>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    description: '',
    visibility: 'PRIVATE',
    startDate: '',
    endDate: '',
  });
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [courseFormState, setCourseFormState] = useState<SaveState>(null);
  const { refresh } = useTheme();
  const navSections = useMemo(
    () => [
      { id: 'overview', label: 'Admin summary' },
      { id: 'management', label: 'Manage users & courses' },
      { id: 'branding', label: 'Branding & appearance' },
      { id: 'storage', label: 'Storage & delivery' },
      { id: 'smtp', label: 'Email & SMTP' },
      { id: 'directory', label: 'Directory & SSO' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'database', label: 'Database & backups' },
      { id: 'monitoring', label: 'Monitoring & logs' },
      { id: 'demo-course', label: 'Demo course experience' },
    ],
    []
  );
  const [activeNav, setActiveNav] = useState(navSections[0].id);

  const refreshOverview = async () => {
    try {
      const response = await api.get<AdminOverview>('/admin/overview');
      setOverview(response.data);
    } catch (error) {
      console.warn('Unable to refresh admin overview metrics', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      const [settingsResult, fontsResult, overviewResult] = await Promise.allSettled([
        api.get<Settings>('/admin/settings'),
        api.get<FontResponse>('/public/fonts/google'),
        api.get<AdminOverview>('/admin/overview'),
      ]);
      if (cancelled) return;

      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value.data);
      } else {
        console.error('Unable to load admin settings', settingsResult.reason);
        setLoadError((prev) => prev ?? 'Unable to load admin settings. Some controls may be unavailable.');
      }

      if (fontsResult.status === 'fulfilled') {
        setFonts(fontsResult.value.data.fonts || []);
      } else {
        console.warn('Unable to load Google font catalogue', fontsResult.reason);
      }

      if (overviewResult.status === 'fulfilled') {
        setOverview(overviewResult.value.data);
      } else {
        console.warn('Unable to load admin overview metrics', overviewResult.reason);
        setLoadError((prev) => prev ?? 'Admin metrics could not be fetched right now. Try refreshing shortly.');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDatabaseStatus() {
      try {
        const response = await api.get<{ message?: string; stored?: DatabaseState; active?: DatabaseState }>(
          '/admin/settings/database'
        );
        if (cancelled) return;
        setActiveDatabase(response.data.active ?? null);
        if (response.data.stored) {
          setSettings((prev) =>
            prev
              ? {
                  ...prev,
                  database: { ...(prev.database ?? {}), ...response.data.stored },
                }
              : prev
          );
        }
        if (response.data.message) {
          setDbState({ message: response.data.message, tone: 'success' });
        }
      } catch (error: any) {
        if (cancelled) return;
        const message =
          error?.response?.data?.message ??
          'Unable to load database status. Ensure MongoDB is running locally and accessible to the API server.';
        setDbState({ message, tone: 'error' });
      }
    }
    loadDatabaseStatus();
    return () => {
      cancelled = true;
    };
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

  const appearance = useMemo<AppearanceForm>(() => {
    return (
      settings?.appearance ?? {
        themeMode: 'SYSTEM',
        palettes: [],
        typography: {},
        header: {},
        footer: {},
        allowUserToggle: true,
      }
    );
  }, [settings]);
  const smtp = useMemo<SmtpForm | undefined>(() => settings?.mail?.smtp, [settings]);
  const directory = useMemo(() => settings?.directory ?? {}, [settings]);
  const notifications = useMemo(() => settings?.notifications ?? {}, [settings]);
  const database = useMemo<DatabaseState>(() => settings?.database ?? {}, [settings]);
  const storage = useMemo<StorageForm>(() => settings?.storage ?? {}, [settings]);
  const demoCourse = useMemo<DemoCourseForm>(() => settings?.demoCourse ?? {}, [settings]);
  const observability = useMemo<ObservabilityForm>(() => settings?.observability ?? {}, [settings]);

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

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserFormState(null);
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      setUserFormState({ message: 'Provide name, email, and a temporary password.', tone: 'error' });
      return;
    }

    setUserSubmitting(true);
    try {
      await api.post('/users', {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
      });
      setUserForm({ name: '', email: '', password: '', role: 'STUDENT' });
      setUserFormState({ message: 'User created successfully.', tone: 'success' });
      await refreshOverview();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Unable to create user right now.';
      setUserFormState({ message, tone: 'error' });
    } finally {
      setUserSubmitting(false);
    }
  }

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseFormState(null);
    if (!courseForm.title.trim() || !courseForm.code.trim()) {
      setCourseFormState({ message: 'Provide a course title and unique code.', tone: 'error' });
      return;
    }

    setCourseSubmitting(true);
    try {
      const payload = {
        title: courseForm.title.trim(),
        code: courseForm.code.trim(),
        description: courseForm.description?.trim() || undefined,
        visibility: courseForm.visibility,
        startDate: courseForm.startDate || undefined,
        endDate: courseForm.endDate || undefined,
      };
      await api.post('/courses', payload);
      setCourseForm({
        title: '',
        code: '',
        description: '',
        visibility: payload.visibility,
        startDate: '',
        endDate: '',
      });
      setCourseFormState({ message: 'Course created successfully.', tone: 'success' });
      await refreshOverview();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Unable to create course right now.';
      setCourseFormState({ message, tone: 'error' });
    } finally {
      setCourseSubmitting(false);
    }
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

  function mergeStorage(partial: Partial<StorageForm>) {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev.storage ?? {};
      const next: StorageForm = {
        ...current,
        ...partial,
        local:
          partial.local !== undefined
            ? { ...(current.local ?? {}), ...(partial.local ?? {}) }
            : current.local,
        aws:
          partial.aws !== undefined ? { ...(current.aws ?? {}), ...(partial.aws ?? {}) } : current.aws,
        azure:
          partial.azure !== undefined ? { ...(current.azure ?? {}), ...(partial.azure ?? {}) } : current.azure,
        gcp:
          partial.gcp !== undefined ? { ...(current.gcp ?? {}), ...(partial.gcp ?? {}) } : current.gcp,
        onedrive:
          partial.onedrive !== undefined
            ? { ...(current.onedrive ?? {}), ...(partial.onedrive ?? {}) }
            : current.onedrive,
        uploadLimits:
          partial.uploadLimits !== undefined
            ? { ...(current.uploadLimits ?? {}), ...(partial.uploadLimits ?? {}) }
            : current.uploadLimits,
      };
      return { ...prev, storage: next };
    });
  }

  function updateStorageProvider(provider: StorageProvider) {
    mergeStorage({ provider });
  }

  function updateStorageLocal(field: keyof NonNullable<StorageForm['local']>, value: string) {
    mergeStorage({ local: { ...(storage.local ?? {}), [field]: value } });
  }

  function updateStorageAws(field: keyof NonNullable<StorageForm['aws']>, value: string) {
    mergeStorage({ aws: { ...(storage.aws ?? {}), [field]: value } });
  }

  function updateStorageAzure(field: keyof NonNullable<StorageForm['azure']>, value: string) {
    mergeStorage({ azure: { ...(storage.azure ?? {}), [field]: value } });
  }

  function updateStorageGcp(field: keyof NonNullable<StorageForm['gcp']>, value: string) {
    mergeStorage({ gcp: { ...(storage.gcp ?? {}), [field]: value } });
  }

  function updateStorageOnedrive(field: keyof NonNullable<StorageForm['onedrive']>, value: string) {
    mergeStorage({ onedrive: { ...(storage.onedrive ?? {}), [field]: value } });
  }

  function updateUploadLimit(field: keyof NonNullable<StorageForm['uploadLimits']>, value: number | boolean) {
    mergeStorage({ uploadLimits: { ...(storage.uploadLimits ?? {}), [field]: value } });
  }

  function updateDemoCourseField(field: keyof DemoCourseForm, value: string | boolean) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            demoCourse: {
              ...(prev.demoCourse ?? {}),
              [field]: value,
            },
          }
        : prev
    );
  }

  function updateObservabilityField(field: keyof ObservabilityForm, value: boolean | number) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            observability: {
              ...(prev.observability ?? {}),
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
        storage: settings.storage,
        demoCourse: settings.demoCourse,
        observability: settings.observability,
      };
      await api.post('/admin/settings', payload);
      await refresh();
      setSaveState({ message: 'Settings saved successfully.', tone: 'success' });
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

  async function handleRefreshDatabase() {
    try {
      const response = await api.post('/admin/settings/database/apply', {
        uri: database?.uri,
        dbName: database?.dbName,
      });
      setActiveDatabase(response.data.active ?? null);
      if (response.data.stored) {
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                database: { ...(prev.database ?? {}), ...response.data.stored },
              }
            : prev
        );
      }
      const message =
        response.data.message ?? 'Local MongoDB connection verified successfully.';
      setDbState({ message, tone: 'success' });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        'Unable to verify the local MongoDB connection. Confirm the database service is running and reachable.';
      setDbState({ message, tone: 'error' });
    }
  }


  if (!settings) {
    return (
      <Layout>
        <div className="space-y-4 py-16 text-[var(--textMuted)]">
          <p>Loading system settings…</p>
          {loadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
              {loadError}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const renderNav = () => (
    <aside className="lg:pt-2">
      <div className="hidden lg:block">
        <nav className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--nav-bg)]/80 backdrop-blur p-6 shadow-sm">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">Admin navigation</p>
          <ul className="space-y-2 text-sm">
            {navSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveNav(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
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
      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4 text-sm lg:hidden">
        {navSections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              setActiveNav(section.id);
              document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`whitespace-nowrap rounded-full border px-4 py-2 ${
              activeNav === section.id
                ? 'border-[var(--primary)] bg-[var(--surface)] text-[var(--text)]'
                : 'border-transparent bg-[var(--surface)]/70 text-[var(--textMuted)]'
            }`}
          >
            {section.label}
          </a>
        ))}
      </div>
    </aside>
  );

  const renderOverviewSection = () => (
    <section id="overview" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Platform snapshot</h2>
          <p className="text-sm text-[var(--textMuted)]">
            Track enrolments, storage utilisation, and database health at a glance.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
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

      {overview ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--textMuted)]">Users</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {overview.counts.users.total.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[var(--textMuted)]">
                Students {overview.counts.users.students.toLocaleString()} • Teachers {overview.counts.users.teachers.toLocaleString()} • Admins {overview.counts.users.admins.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--textMuted)]">Courses</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {overview.counts.courses.total.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[var(--textMuted)]">
                Published {overview.counts.courses.published.toLocaleString()} • Upcoming {overview.counts.courses.upcoming.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--textMuted)]">Enrollments</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {overview.counts.enrollments.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[var(--textMuted)]">Across all active cohorts</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--textMuted)]">Virtual sessions</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                {overview.counts.sessions.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[var(--textMuted)]">Scheduled or archived live rooms</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <h3 className="text-sm font-semibold text-[var(--text)]">Storage utilisation</h3>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{overview.storage.usedMB.toLocaleString()} MB</p>
              <p className="text-xs text-[var(--textMuted)]">
                {overview.storage.files.toLocaleString()} files across {overview.storage.directories.toLocaleString()} folders
              </p>
              <p className="mt-2 text-xs text-[var(--textMuted)] break-all">Root: {overview.storage.root}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
              <h3 className="text-sm font-semibold text-[var(--text)]">Database</h3>
              {overview.database ? (
                <div className="mt-2 space-y-1 text-xs text-[var(--textMuted)]">
                  <p>
                    {overview.database.name} • Collections {overview.database.collections?.toLocaleString?.() ?? '—'}
                  </p>
                  <p>
                    Data {overview.database.dataSizeMb?.toLocaleString?.() ?? '0'} MB • Indexes{' '}
                    {overview.database.indexSizeMb?.toLocaleString?.() ?? '0'} MB
                  </p>
                  <p>
                    Storage {overview.database.storageSizeMb?.toLocaleString?.() ?? '0'} MB
                    {typeof overview.database.avgObjSizeKb === 'number'
                      ? ` • Avg obj ${overview.database.avgObjSizeKb.toLocaleString()} KB`
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--textMuted)]">Database statistics are unavailable in this environment.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--textMuted)]">Loading admin metrics…</p>
      )}
    </section>
  );

  const renderManagementSection = () => (
    <section id="management" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Manage users & courses</h2>
          <p className="text-sm text-[var(--textMuted)]">
            Review participation, open the directory API, and jump into course management.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">User administration</h3>
            <p className="text-xs text-[var(--textMuted)]">
              Assign roles, review activity trails, and create accounts with a single invite password.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--textMuted)]">
            <div>
              <p className="font-semibold text-[var(--text)]">Students</p>
              <p>{overview?.counts.users.students.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Teachers & TAs</p>
              <p>{overview?.counts.users.teachers.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Admins</p>
              <p>{overview?.counts.users.admins.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Total</p>
              <p>{overview?.counts.users.total.toLocaleString?.() ?? '—'}</p>
            </div>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Full name</span>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Jane Doe"
                  required
                />
              </label>
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Email</span>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="user@example.com"
                  required
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Temporary password</span>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Assign a starter password"
                  required
                />
              </label>
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Role</span>
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={userSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {userSubmitting ? 'Creating…' : 'Create user'}
              </button>
              <button
                type="button"
                onClick={() => window.open('/api/users', '_blank')}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
              >
                Open directory API
              </button>
            </div>
            {userFormState && (
              <div
                className={`rounded-xl px-3 py-2 text-[var(--text)] ${
                  userFormState.tone === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                {userFormState.message}
              </div>
            )}
          </form>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Course catalogue</h3>
            <p className="text-xs text-[var(--textMuted)]">
              Create programmes, duplicate templates, and manage visibility by cohort.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--textMuted)]">
            <div>
              <p className="font-semibold text-[var(--text)]">Courses</p>
              <p>{overview?.counts.courses.total.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Public</p>
              <p>{overview?.counts.courses.published.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Upcoming</p>
              <p>{overview?.counts.courses.upcoming.toLocaleString?.() ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Enrollments</p>
              <p>{overview?.counts.enrollments.toLocaleString?.() ?? '—'}</p>
            </div>
          </div>
          <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Course title</span>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Demo learning path"
                  required
                />
              </label>
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Course code</span>
                <input
                  type="text"
                  value={courseForm.code}
                  onChange={(event) => setCourseForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  placeholder="DEMO-101"
                  required
                />
              </label>
            </div>
            <label className="space-y-1 text-[var(--textMuted)] block">
              <span className="font-semibold text-[var(--text)]">Description</span>
              <textarea
                value={courseForm.description}
                onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                rows={3}
                placeholder="Share who the course is for and what it covers."
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-[var(--textMuted)] sm:col-span-1">
                <span className="font-semibold text-[var(--text)]">Visibility</span>
                <select
                  value={courseForm.visibility}
                  onChange={(event) => setCourseForm((prev) => ({ ...prev, visibility: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                  <option value="INVITE_ONLY">Invite only</option>
                </select>
              </label>
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">Start date</span>
                <input
                  type="date"
                  value={courseForm.startDate}
                  onChange={(event) => setCourseForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-[var(--textMuted)]">
                <span className="font-semibold text-[var(--text)]">End date</span>
                <input
                  type="date"
                  value={courseForm.endDate}
                  onChange={(event) => setCourseForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={courseSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-[var(--secondary)] px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {courseSubmitting ? 'Creating…' : 'Create course'}
              </button>
              <Link
                to="/courses"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
              >
                Go to course workspace
              </Link>
            </div>
            {courseFormState && (
              <div
                className={`rounded-xl px-3 py-2 text-[var(--text)] ${
                  courseFormState.tone === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}
              >
                {courseFormState.message}
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
          <h3 className="text-sm font-semibold text-[var(--text)]">Live user presence</h3>
          <p className="text-xs text-[var(--textMuted)]">Users active within the last 15 minutes.</p>
          <div className="mt-3 space-y-2 text-sm">
            {overview?.activeUsers?.length ? (
              overview.activeUsers.slice(0, 6).map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 px-3 py-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{user.name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--textMuted)]">{user.role}</p>
                  </div>
                  <p className="text-xs text-[var(--textMuted)]">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString() : 'Active now'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--textMuted)]">No recent logins captured yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5">
          <h3 className="text-sm font-semibold text-[var(--text)]">Upcoming live sessions</h3>
          <p className="text-xs text-[var(--textMuted)]">Scheduled meetings starting soonest first.</p>
          <div className="mt-3 space-y-2 text-sm">
            {overview?.upcomingSessions?.length ? (
              overview.upcomingSessions.slice(0, 6).map((session) => (
                <div key={session._id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 px-3 py-2">
                  <p className="font-semibold text-[var(--text)]">{session.title}</p>
                  <p className="text-xs text-[var(--textMuted)]">
                    {session.course?.title ? `${session.course.title} • ` : ''}
                    {session.provider || 'Session'} •{' '}
                    {session.startAt ? new Date(session.startAt).toLocaleString() : 'TBC'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--textMuted)]">No upcoming live sessions detected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderHeader = () => (
    <header className="space-y-2" id="introduction">
      <p className="text-sm uppercase tracking-[0.3em] text-[var(--textMuted)]">System Configuration</p>
      <h1 className="text-3xl font-semibold text-[var(--text)]">Admin customization studio</h1>
      <p className="max-w-2xl text-[var(--textMuted)]">
        Manage branding, theme palettes sourced from the Figma color library, email integrations, directory services, and database configuration from one place.
      </p>
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          {loadError}
        </div>
      )}
    </header>
  );

  const renderBrandingSection = () => (
    <section id="branding" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Branding & appearance</h2>
          <p className="text-sm text-[var(--textMuted)]">Control hero branding, footer language, theme palettes, and Google font selections.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">Theme mode</label>
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
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">Heading font</label>
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
          <label className="mb-2 block text-sm font-semibold text-[var(--text)]">Body font</label>
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
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Theme palettes</p>
        <div className="grid gap-4 md:grid-cols-3">
          {appearance.palettes?.map((palette: Palette) => (
            <button
              type="button"
              key={palette.id}
              onClick={() => updateAppearance({ activePaletteId: palette.id })}
              className={`space-y-3 rounded-2xl border-2 p-4 text-left transition ${
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
  );

  const renderStorageSection = () => (
    <section id="storage" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Storage & delivery</h2>
          <p className="text-sm text-[var(--textMuted)]">
            Choose where lesson uploads live and enforce file-type rules across the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--text)]">Storage provider</label>
          <select
            value={storage.provider || 'LOCAL'}
            onChange={(e) => updateStorageProvider(e.target.value as StorageProvider)}
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          >
            {storageProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--textMuted)]">
            Switch between local disk, cloud object stores, or OneDrive repositories. Credentials are stored securely.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Upload limits</h3>
          <label className="block text-xs text-[var(--text)]">
            Max file size (MB)
            <input
              type="number"
              value={storage.uploadLimits?.maxFileSizeMb ?? 512}
              onChange={(e) => updateUploadLimit('maxFileSizeMb', Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-3 py-2 text-sm"
              min={1}
            />
          </label>
          <label className="block text-xs text-[var(--text)]">
            Total quota (GB)
            <input
              type="number"
              value={storage.uploadLimits?.totalQuotaGb ?? 20}
              onChange={(e) => updateUploadLimit('totalQuotaGb', Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-3 py-2 text-sm"
              min={1}
            />
          </label>
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
              <input
                type="checkbox"
                checked={storage.uploadLimits?.allowVideos !== false}
                onChange={(e) => updateUploadLimit('allowVideos', e.target.checked)}
              />
              Allow video uploads
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
              <input
                type="checkbox"
                checked={storage.uploadLimits?.allowDocuments !== false}
                onChange={(e) => updateUploadLimit('allowDocuments', e.target.checked)}
              />
              Allow documents (PDF, PPT, docs)
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
              <input
                type="checkbox"
                checked={storage.uploadLimits?.allowImages !== false}
                onChange={(e) => updateUploadLimit('allowImages', e.target.checked)}
              />
              Allow images
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
              <input
                type="checkbox"
                checked={storage.uploadLimits?.allowScorm !== false}
                onChange={(e) => updateUploadLimit('allowScorm', e.target.checked)}
              />
              Allow SCORM/xAPI packages
            </label>
          </div>
        </div>
      </div>

      {(storage.provider ?? 'LOCAL') === 'LOCAL' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Local upload path
            <input
              type="text"
              value={storage.local?.root || ''}
              onChange={(e) => updateStorageLocal('root', e.target.value)}
              placeholder="/workspace/lms/storage/uploads"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Public base URL
            <input
              type="url"
              value={storage.local?.baseUrl || ''}
              onChange={(e) => updateStorageLocal('baseUrl', e.target.value)}
              placeholder="https://lms.example.com/uploads"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {storage.provider === 'AWS_S3' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Bucket
            <input
              type="text"
              value={storage.aws?.bucket || ''}
              onChange={(e) => updateStorageAws('bucket', e.target.value)}
              placeholder="lms-demo-bucket"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Region
            <input
              type="text"
              value={storage.aws?.region || ''}
              onChange={(e) => updateStorageAws('region', e.target.value)}
              placeholder="ap-south-1"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Access key ID
            <input
              type="text"
              value={storage.aws?.accessKeyId || ''}
              onChange={(e) => updateStorageAws('accessKeyId', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Secret access key
            <input
              type="password"
              value={storage.aws?.secretAccessKey || ''}
              onChange={(e) => updateStorageAws('secretAccessKey', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {storage.provider === 'AZURE_BLOB' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Connection string
            <textarea
              value={storage.azure?.connectionString || ''}
              onChange={(e) => updateStorageAzure('connectionString', e.target.value)}
              placeholder="DefaultEndpointsProtocol=https;AccountName=..."
              className="mt-1 h-24 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Container name
            <input
              type="text"
              value={storage.azure?.container || ''}
              onChange={(e) => updateStorageAzure('container', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {storage.provider === 'GCP' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Bucket
            <input
              type="text"
              value={storage.gcp?.bucket || ''}
              onChange={(e) => updateStorageGcp('bucket', e.target.value)}
              placeholder="lms-demo-bucket"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Project ID
            <input
              type="text"
              value={storage.gcp?.projectId || ''}
              onChange={(e) => updateStorageGcp('projectId', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="md:col-span-2 block text-sm text-[var(--text)]">
            Service account JSON
            <textarea
              value={storage.gcp?.credentialsJson || ''}
              onChange={(e) => updateStorageGcp('credentialsJson', e.target.value)}
              placeholder='{ "type": "service_account", ... }'
              className="mt-1 h-32 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {storage.provider === 'ONEDRIVE' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Client ID
            <input
              type="text"
              value={storage.onedrive?.clientId || ''}
              onChange={(e) => updateStorageOnedrive('clientId', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Client secret
            <input
              type="password"
              value={storage.onedrive?.clientSecret || ''}
              onChange={(e) => updateStorageOnedrive('clientSecret', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Tenant ID
            <input
              type="text"
              value={storage.onedrive?.tenantId || ''}
              onChange={(e) => updateStorageOnedrive('tenantId', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-[var(--text)]">
            Drive ID
            <input
              type="text"
              value={storage.onedrive?.driveId || ''}
              onChange={(e) => updateStorageOnedrive('driveId', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
        </div>
      )}
    </section>
  );

  const renderSmtpSection = () => (
    <section id="smtp" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
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

      <div className="grid gap-4 md:grid-cols-3">
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
          <input type="checkbox" checked={Boolean(smtp?.secure)} onChange={(e) => updateSmtp('secure', e.target.checked)} />
          Use SSL/TLS
        </label>
        <input
          type="text"
          value={smtp?.user || ''}
          onChange={(e) => updateSmtp('user', e.target.value)}
          placeholder="SMTP user"
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
        />
        <input
          type="password"
          value={smtp?.password || ''}
          onChange={(e) => updateSmtp('password', e.target.value)}
          placeholder="SMTP password"
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
          placeholder="Send test email to…"
          className="min-w-[220px] flex-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleTestEmail}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30"
        >
          Send test
        </button>
      </div>
    </section>
  );

  const renderDirectorySection = () => (
    <section id="directory" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Directory & single sign-on</h2>
          <p className="text-sm text-[var(--textMuted)]">Provide connection details for your identity provider, then map default roles for inbound users.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--text)]">Directory provider</label>
          <select
            value={directory.provider || 'AZURE_AD'}
            onChange={(e) => updateDirectory('provider', e.target.value)}
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          >
            <option value="AZURE_AD">Azure AD</option>
            <option value="GOOGLE">Google Workspace</option>
            <option value="OKTA">Okta</option>
            <option value="SAML">Generic SAML</option>
          </select>
          <label className="block text-sm font-semibold text-[var(--text)]">Default role</label>
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
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          />
        </div>
      </div>
    </section>
  );

  const renderNotificationsSection = () => (
    <section id="notifications" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Event notifications</h2>
          <p className="text-sm text-[var(--textMuted)]">Define default reminder offsets for live sessions and closing summaries. Instructors can opt in or out when scheduling.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-[var(--text)]">
          Reminder before start (minutes)
          <input
            type="number"
            value={notifications.eventStartLeadMinutes ?? 30}
            onChange={(e) => updateNotifications('eventStartLeadMinutes', Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-[var(--text)]">
          Follow-up after end (minutes)
          <input
            type="number"
            value={notifications.eventEndLeadMinutes ?? 15}
            onChange={(e) => updateNotifications('eventEndLeadMinutes', Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          />
        </label>
      </div>
    </section>
  );

  const renderDatabaseSection = () => (
    <section id="database" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Database configuration</h2>
          <p className="text-sm text-[var(--textMuted)]">
            The LMS API connects to a local MongoDB instance. Update the <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-xs">MONGO_URI</code>
            {' '}and <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-xs">MONGO_DB</code> environment variables if you need to target a different
            database and restart the API service afterwards.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshDatabase}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30"
        >
          Check local database status
        </button>
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm">
          <h3 className="text-sm font-semibold text-[var(--text)]">Connection string</h3>
          <p className="mt-1 text-xs text-[var(--textMuted)]">Defined via the API server environment.</p>
          <code className="mt-3 block break-all rounded-xl bg-[var(--surface)]/70 px-3 py-2 text-xs text-[var(--text)]">
            {activeDatabase?.uri || database.uri || 'mongodb://127.0.0.1:27017'}
          </code>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Database name</h3>
            <p className="mt-1 text-xs text-[var(--textMuted)]">Configured with the <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-xs">MONGO_DB</code> variable.</p>
            <p className="mt-2 text-sm font-mono text-[var(--text)]">
              {activeDatabase?.dbName || database.dbName || 'lms'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Provider</h3>
            <p className="mt-1 text-xs text-[var(--textMuted)]">Dynamic switching is disabled to keep this deployment on the bundled database.</p>
            <p className="mt-2 text-sm font-medium text-[var(--text)]">Local MongoDB</p>
          </div>
        </div>
      </div>

      {overview?.database && (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm">
          <h3 className="text-sm font-semibold text-[var(--text)]">Current database footprint</h3>
          <dl className="mt-3 grid gap-2 text-xs text-[var(--textMuted)] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt>Collections</dt>
              <dd className="font-medium text-[var(--text)]">{overview.database.collections ?? 0}</dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd className="font-medium text-[var(--text)]">{overview.database.objects ?? 0}</dd>
            </div>
            <div>
              <dt>Data size (MB)</dt>
              <dd className="font-medium text-[var(--text)]">{overview.database.dataSizeMb ?? 0}</dd>
            </div>
            <div>
              <dt>Index size (MB)</dt>
              <dd className="font-medium text-[var(--text)]">{overview.database.indexSizeMb ?? 0}</dd>
            </div>
          </dl>
        </div>
      )}

      <p className="text-xs text-[var(--textMuted)]">
        To move to a different MongoDB deployment later, stop the API container, update the environment variables, ensure the new
        host allows local connections, and restart the stack.
      </p>
    </section>
  );

  const renderMonitoringSection = () => (
    <section id="monitoring" className="card space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Monitoring & logs</h2>
          <p className="text-sm text-[var(--textMuted)]">
            Control what telemetry the LMS collects and inspect the most recent audit entries.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 space-y-3 text-sm">
          <h3 className="text-sm font-semibold text-[var(--text)]">Observability toggles</h3>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={observability.enableStorageTelemetry !== false}
              onChange={(e) => updateObservabilityField('enableStorageTelemetry', e.target.checked)}
            />
            Track storage telemetry and quotas
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={observability.enableUserPresence !== false}
              onChange={(e) => updateObservabilityField('enableUserPresence', e.target.checked)}
            />
            Show live user presence to admins
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input
              type="checkbox"
              checked={observability.enableActivityStream !== false}
              onChange={(e) => updateObservabilityField('enableActivityStream', e.target.checked)}
            />
            Capture detailed activity logs for auditing
          </label>
          <label className="block text-xs text-[var(--text)]">
            Retain logs for (days)
            <input
              type="number"
              value={observability.retentionDays ?? 30}
              onChange={(e) => updateObservabilityField('retentionDays', Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-3 py-2 text-sm"
              min={7}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm">
          <h3 className="text-sm font-semibold text-[var(--text)]">Recent activity</h3>
          <p className="text-xs text-[var(--textMuted)]">Latest 25 events across the tenant.</p>
          <div className="mt-3 space-y-2">
            {overview?.recentLogs?.length ? (
              overview.recentLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/70 px-3 py-2 text-xs">
                  <p className="font-semibold text-[var(--text)]">{log.action.replaceAll('_', ' ')}</p>
                  <p className="text-[var(--textMuted)]">
                    {log.user ? `${log.user.name} (${log.user.role}) • ` : ''}
                    {log.occurredAt ? new Date(log.occurredAt).toLocaleString() : ''}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--textMuted)]">No audit events captured yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderDemoCourseSection = () => {
    const seededDemo = overview?.settings?.demoCourse;
    return (
      <section id="demo-course" className="card space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">Demo course experience</h2>
            <p className="text-sm text-[var(--textMuted)]">
              Keep a fully-loaded sandbox available for every new enrolment to explore quizzes, assignments, live sessions, and chat.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text)]">
            Course code
            <input
              type="text"
              value={demoCourse.code || ''}
              onChange={(e) => updateDemoCourseField('code', e.target.value)}
              placeholder="DEMO-COURSE"
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={demoCourse.autoEnroll !== false}
              onChange={(e) => updateDemoCourseField('autoEnroll', e.target.checked)}
            />
            Auto-enrol every new user into the demo course
          </label>
        </div>

        <label className="block text-sm text-[var(--text)]">
          Highlight message shown in dashboards
          <textarea
            value={demoCourse.highlight || ''}
            onChange={(e) => updateDemoCourseField('highlight', e.target.value)}
            placeholder="Showcase what learners should explore first."
            className="mt-1 h-28 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-2 text-sm"
          />
        </label>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/80 p-5 text-sm">
          <h3 className="text-sm font-semibold text-[var(--text)]">What the demo includes</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--textMuted)]">
            <li>Orientation module with embedded video, links, and PDF resources</li>
            <li>Rubric-based assignment with plagiarism checks and peer review</li>
            <li>Secure readiness quiz pulling from the rich question bank</li>
            <li>Live session placeholder with Teams integration metadata</li>
            <li>Announcements and chat lounge seeded with welcome messages</li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--textMuted)]">
            <span>Course ID: {seededDemo?.courseId || 'pending'}</span>
            <span>Quiz ID: {seededDemo?.quizId || 'pending'}</span>
            {seededDemo?.lastRefreshedAt && (
              <span>Refreshed {new Date(seededDemo.lastRefreshedAt).toLocaleString()}</span>
            )}
          </div>
          {seededDemo?.courseId && (
            <Link
              to={`/courses/${seededDemo.courseId}`}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] px-4 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
            >
              View demo course
            </Link>
          )}
        </div>
      </section>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[260px,1fr]">
        {renderNav()}
        <div className="space-y-10">
          {renderHeader()}
          {renderOverviewSection()}
          {renderManagementSection()}
          {renderBrandingSection()}
          {renderStorageSection()}
          {renderSmtpSection()}
          {renderDirectorySection()}
          {renderNotificationsSection()}
          {renderDatabaseSection()}
          {renderMonitoringSection()}
          {renderDemoCourseSection()}
        </div>
      </div>
    </Layout>
  );
}

