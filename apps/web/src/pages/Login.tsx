import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';

const highlights = [
  {
    title: 'Branded experience',
    description:
      'Upload your logo, rename headers and footers, and tailor copyright messaging directly from the admin console.',
  },
  {
    title: 'Curated color palettes',
    description:
      'Browse modern combinations from the Figma color resource library or save your own presets for light and dark mode.',
  },
  {
    title: 'Google Fonts support',
    description:
      'Pick any Google Font for headings and body copy—changes propagate instantly across the entire application.',
  },
  {
    title: 'Unified access',
    description:
      'Connect SSO and directory integrations so admins, teachers, TAs, and learners keep a single set of credentials.',
  },
];

export default function Login() {
  const { login } = useAuth();
  const { appearance } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const headerTitle = appearance?.header?.title || 'Learning Management System';
  const organization = appearance?.footer?.organization || 'Aathith Prime Business Private Limited';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-12 items-start">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-4 py-2 text-sm font-semibold">
            Welcome back to {headerTitle}
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight text-[var(--text)]">
              Sign in to continue learning with {organization}
            </h1>
            <p className="text-lg text-[var(--textMuted)] leading-relaxed max-w-2xl">
              Build immersive programs, schedule live sessions with automated notifications, and manage enrollment end-to-end in
              a single workspace. Personalize the experience with your brand colors, typography, and communication preferences.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {highlights.map((item) => (
              <div key={item.title} className="card p-5 space-y-2">
                <h3 className="text-base font-semibold text-[var(--text)]">{item.title}</h3>
                <p className="text-sm text-[var(--textMuted)] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <a
            href="https://www.figma.com/resource-library/color-combinations/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Explore the Figma color combinations we support ↗
          </a>
        </div>

        <div className="card p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[var(--text)]">Log in</h2>
            <p className="text-sm text-[var(--textMuted)]">
              Enter your credentials or sign in via your organization’s single sign-on provider.
            </p>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text)]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--text)] shadow-inner focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--text)] shadow-inner focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              className="w-full rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="text-sm text-[var(--textMuted)] space-y-2">
            <p>
              Need an account?{' '}
              <Link to="/register" className="text-[var(--primary)] font-semibold hover:underline">
                Create one now
              </Link>
            </p>
            <p>
              Having trouble? Reach out to your administrator or use the password reset link provided in your welcome email.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
