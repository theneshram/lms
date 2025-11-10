import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Palette = {
  id: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
  colorsDark?: Record<string, string>;
  colorsLight?: Record<string, string>;
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

  const fallback: Record<string, string> =
    mode === 'dark'
      ? {
          primary: '#6366F1',
          secondary: '#8B5CF6',
          accent: '#F59E0B',
          background: '#0F172A',
          surface: '#1E293B',
          muted: '#1F2937',
          text: '#F8FAFC',
          textMuted: '#CBD5F5',
          border: '#475569',
          'border-soft': 'rgba(100, 116, 139, 0.35)',
          'header-bg': 'rgba(15, 23, 42, 0.85)',
          'footer-bg': 'rgba(15, 23, 42, 0.82)',
          'nav-bg': 'rgba(30, 41, 59, 0.7)',
        }
      : {
          primary: '#6366F1',
          secondary: '#8B5CF6',
          accent: '#F59E0B',
          background: '#F8FAFC',
          surface: '#FFFFFF',
          muted: '#E2E8F0',
          text: '#0F172A',
          textMuted: '#475569',
          border: '#CBD5F5',
          'border-soft': 'rgba(148, 163, 184, 0.25)',
          'header-bg': 'rgba(255, 255, 255, 0.85)',
          'footer-bg': 'rgba(255, 255, 255, 0.82)',
          'nav-bg': 'rgba(255, 255, 255, 0.6)',
        };

  const palette = appearance?.palette;
  const baseColors = palette ? filterColorRecord(palette.colors) : {};
  const lightOverrides = filterColorRecord(palette?.colorsLight ?? {});
  const darkOverrides = filterColorRecord(palette?.colorsDark ?? {});
  const overrideColors = mode === 'dark' ? darkOverrides : lightOverrides;

  const protectedKeys = new Set([
    'background',
    'surface',
    'muted',
    'text',
    'textMuted',
    'header-bg',
    'footer-bg',
    'nav-bg',
    'border',
    'border-soft',
    'headerBg',
    'footerBg',
    'navBg',
    'text-muted',
    'text-muted-alt',
  ]);

  const finalColors: Record<string, string> = { ...fallback };
  Object.entries(baseColors).forEach(([key, value]) => {
    if (mode === 'dark' && protectedKeys.has(key) && !(key in darkOverrides)) {
      return;
    }
    finalColors[key] = value;
  });
  Object.entries(overrideColors).forEach(([key, value]) => {
    finalColors[key] = value;
  });

  // Ensure both camelCase and kebab-case aliases stay in sync
  if (finalColors.borderSoft && !finalColors['border-soft']) {
    finalColors['border-soft'] = finalColors.borderSoft;
  }
  if (finalColors['border-soft'] && !finalColors.borderSoft) {
    finalColors.borderSoft = finalColors['border-soft'];
  }
  if (finalColors.headerBg && !finalColors['header-bg']) {
    finalColors['header-bg'] = finalColors.headerBg;
  }
  if (finalColors.footerBg && !finalColors['footer-bg']) {
    finalColors['footer-bg'] = finalColors.footerBg;
  }
  if (finalColors.navBg && !finalColors['nav-bg']) {
    finalColors['nav-bg'] = finalColors.navBg;
  }

  Object.entries(finalColors).forEach(([key, value]) => {
    if (typeof value === 'string' && value) {
      setCssVariable(root, key, value);
    }
  });

  if (appearance?.typography?.heading) {
    setCssVariable(root, 'font-heading', `'${appearance.typography.heading}', sans-serif`);
  }
  if (appearance?.typography?.body) {
    setCssVariable(root, 'font-body', `'${appearance.typography.body}', sans-serif`);
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

function filterColorRecord(record: Record<string, string> | undefined) {
  if (!record) return {};
  return Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') acc[key] = value;
    return acc;
  }, {});
}

function setCssVariable(root: HTMLElement, key: string, value: string) {
  root.style.setProperty(`--${key}`, value);
  if (key.includes('-')) {
    const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    root.style.setProperty(`--${camelKey}`, value);
  } else if (/[A-Z]/.test(key)) {
    const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${kebabKey}`, value);
  }
}
