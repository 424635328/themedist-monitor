'use client';

import { useEffect } from 'react';

const FALLBACK_THEME: Record<string, string> = {
  '--color-primary': '#3b82f6',
  '--color-bg': '#0a0a0f',
  '--color-surface': '#14141a',
  '--color-text': '#e4e4e7',
  '--color-muted': '#71717a',
  '--color-border': '#252530',
  '--color-accent': '#818cf8',
};

export default function ThemeDistTheme() {
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/today-safe');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.cssVars || !data.cssVars['--color-primary']) {
          throw new Error('Invalid schema');
        }
        if (cancelled) return;
        const root = document.documentElement;
        for (const [key, val] of Object.entries(data.cssVars as Record<string, string>)) {
          root.style.setProperty(key, val);
        }
        console.log('[ThemeDist] Theme applied to dashboard');
      } catch {
        if (cancelled) return;
        // Fallback: keep default dark theme
        console.log('[ThemeDist] Using default theme');
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Component renders nothing — it's side-effect only
  return null;
}
