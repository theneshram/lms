import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', protected: true },
  { to: '/courses', label: 'Courses', protected: true },
  { to: '/admin', label: 'Admin', roles: ['ADMIN', 'SUPER_ADMIN'] as const },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { appearance, mode, toggleMode } = useTheme();
  const header = appearance?.header;
  const footer = appearance?.footer;
  const appTitle = header?.applicationName || 'Learning Management System';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text)] transition-colors">
      <header className="backdrop-blur-sm bg-[var(--header-bg)] border-b border-[var(--border-soft)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {header?.logoUrl ? (
              <img src={header.logoUrl} alt={header.title || appTitle} className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-semibold">
                {(appTitle || 'LMS').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[var(--textMuted)]">{header?.title || 'Learning Management System'}</p>
              <p className="text-xl font-semibold text-[var(--text)]">{appTitle}</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--textMuted)]">
            {navLinks.map(({ to, label, protected: requiresAuth, roles }) => {
              if (requiresAuth && !user) return null;
              if (roles && (!user || !roles.includes(user.role as any))) return null;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `transition hover:text-[var(--text)] ${isActive ? 'text-[var(--text)] font-semibold' : ''}`
                  }
                >
                  {label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMode}
              disabled={appearance?.allowUserToggle === false}
              className="h-10 w-10 rounded-full border border-[var(--border-soft)] flex items-center justify-center text-sm shadow-sm bg-[var(--surface)]/80 disabled:opacity-40"
              title="Toggle theme"
            >
              {mode === 'light' ? '🌞' : '🌙'}
            </button>
            {user ? (
              <>
                <div className="hidden sm:flex flex-col text-xs text-right leading-tight">
                  <span className="text-[var(--text)] font-semibold">{user.name}</span>
                  <span className="uppercase tracking-widest text-[var(--textMuted)]">{user.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/30 hover:opacity-90"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-semibold text-[var(--text)]">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/30"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/10" />
        <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col">
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-soft)] bg-[var(--footer-bg)]">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-[var(--textMuted)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-center sm:text-left">
            <p className="font-medium text-[var(--text)]">{footer?.organization || 'Aathith Prime Business Private Limited'}</p>
            <p>{footer?.customText || header?.title || 'Learning experiences crafted for every learner.'}</p>
          </div>
          <div className="text-xs uppercase tracking-widest text-[var(--textMuted)]">
            © {footer?.showYear === false ? '' : new Date().getFullYear() + ' '}
            {footer?.organization || 'Aathith Prime Business Private Limited'}. {footer?.legal || 'All rights reserved.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
