import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Palette = {
  id: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
};

type AppearanceResponse = {
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  allowUserToggle: boolean;
  palette: Palette;
  palettes: Palette[];
  typography?: { heading?: string; body?: string };
  header?: { title?: string; applicationName?: string; logoUrl?: string };
  footer?: { organization?: string; legal?: string; customText?: string; showYear?: boolean };
};

type ThemeContextValue = {
  appearance?: AppearanceResponse;
  loading: boolean;
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
  refresh: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  loading: true,
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
  refresh: async () => {},
});

const USER_MODE_KEY = 'lms-theme-mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearance] = useState<AppearanceResponse>();
  const [loading, setLoading] = useState(true);
  const [userMode, setUserMode] = useState<'light' | 'dark' | null>(() => {
    const stored = localStorage.getItem(USER_MODE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  });

  const resolvedMode = useMemo(() => {
    if (userMode) return userMode;
    if (appearance?.themeMode === 'DARK') return 'dark';
    if (appearance?.themeMode === 'LIGHT') return 'light';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }, [appearance?.themeMode, userMode]);

  useEffect(() => {
    applyAppearance(appearance, resolvedMode);
    loadFont(appearance?.typography?.body);
    if (appearance?.typography?.heading && appearance.typography.heading !== appearance.typography.body) {
      loadFont(appearance.typography.heading);
    }
  }, [appearance, resolvedMode]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get<AppearanceResponse>('/public/appearance');
      setAppearance(data);
    } finally {
      setLoading(false);
    }
  }

  function setMode(mode: 'light' | 'dark') {
    localStorage.setItem(USER_MODE_KEY, mode);
    setUserMode(mode);
  }

  function toggleMode() {
    setMode(resolvedMode === 'light' ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ appearance, loading, mode: resolvedMode, setMode, toggleMode, refresh }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}

function applyAppearance(appearance: AppearanceResponse | undefined, mode: 'light' | 'dark') {
  const root = document.documentElement;
  root.dataset.theme = mode;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const palette = appearance?.palette;
  if (!palette) return;
  const colors = palette.colors || {};
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  if (mode === 'dark' && colors.background && colors.surface) {
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--text', colors.text ?? '#F8FAFC');
  }
  if (appearance?.typography?.heading) {
    root.style.setProperty('--font-heading', `'${appearance.typography.heading}', sans-serif`);
  }
  if (appearance?.typography?.body) {
    root.style.setProperty('--font-body', `'${appearance.typography.body}', sans-serif`);
  }
}

function loadFont(font?: string) {
  if (!font) return;
  const normalized = font.replace(/\s+/g, '-').toLowerCase();
  const id = `lms-font-${normalized}`;
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  const href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
