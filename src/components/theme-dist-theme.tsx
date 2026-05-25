'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Palette, Undo2 } from 'lucide-react';

const STORAGE_KEY = 'td-monitor-theme';
const NATIVE_THEME: Record<string, string> = {
  '--color-primary': '#3b82f6',
  '--color-bg': '#0a0a0f',
  '--color-surface': '#14141a',
  '--color-text': '#e4e4e7',
  '--color-text-muted': '#71717a',
  '--color-border': '#252530',
  '--color-accent': '#818cf8',
  '--color-secondary': '#6366f1',
};

interface ThemeData {
  cssVars: Record<string, string>;
  customCss?: string | null;
  extensions?: Array<Record<string, unknown>> | null;
  presetName?: string;
  preset?: string;
}

export default function ThemeDistTheme() {
  const [applied, setApplied] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [loading, setLoading] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const extRefs = useRef<HTMLElement[]>([]);

  const cleanupTheme = useCallback(() => {
    // Remove CSS variables
    const root = document.documentElement;
    const allKeys = new Set([
      ...Object.keys(NATIVE_THEME),
      ...Array.from(root.style).filter((k) => k.startsWith('--')),
    ]);
    for (const key of allKeys) {
      root.style.removeProperty(key);
    }
    // Restore native vars
    for (const [key, val] of Object.entries(NATIVE_THEME)) {
      root.style.setProperty(key, val);
    }
    // Remove custom CSS style tag
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }
    // Remove floating elements
    for (const el of extRefs.current) {
      el.remove();
    }
    extRefs.current = [];
  }, []);

  const applyTheme = useCallback((data: ThemeData) => {
    const root = document.documentElement;

    // Inject CSS variables
    for (const [key, val] of Object.entries(data.cssVars)) {
      root.style.setProperty(key, val as string);
    }

    // Inject custom CSS (animations, theme-specific styles)
    if (data.customCss) {
      const style = document.createElement('style');
      style.setAttribute('data-td-theme', '1');
      style.textContent = data.customCss;
      document.head.appendChild(style);
      styleRef.current = style;
    }

    // Render floating extensions
    const fragment = document.createDocumentFragment();
    if (Array.isArray(data.extensions)) {
      for (const ext of data.extensions) {
        if (ext.type === 'floating' && typeof ext.char === 'string') {
          const el = document.createElement('div');
          const cssParts: string[] = ['position:fixed', 'pointer-events:none', 'z-index:0'];
          if (typeof ext.top === 'string') cssParts.push(`top:${ext.top}`);
          if (typeof ext.left === 'string') cssParts.push(`left:${ext.left}`);
          if (typeof ext.right === 'string') cssParts.push(`right:${ext.right}`);
          if (typeof ext.bottom === 'string') cssParts.push(`bottom:${ext.bottom}`);
          if (typeof ext.fontSize === 'string') cssParts.push(`font-size:${ext.fontSize}`);
          if (typeof ext.animation === 'string') cssParts.push(`animation:${ext.animation}`);
          const opacity = Number(ext.opacity);
          if (!Number.isNaN(opacity)) cssParts.push(`opacity:${Math.max(0, Math.min(1, opacity))}`);
          el.setAttribute('data-td-ext', '1');
          el.style.cssText = cssParts.join(';');
          el.textContent = String(ext.char).slice(0, 4);
          fragment.appendChild(el);
          extRefs.current.push(el);
        }
      }
    }
    if (fragment.childNodes.length > 0) {
      document.body.prepend(fragment);
    }

    setPresetName(data.presetName || '');
    setApplied(true);
    localStorage.setItem(STORAGE_KEY, 'applied');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/today-safe');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!data.cssVars?.['--color-primary']) throw new Error('Invalid schema');
      applyTheme(data as ThemeData);
    } catch {
      console.log('[ThemeDist] Fallback to native theme');
      localStorage.setItem(STORAGE_KEY, 'native');
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  const toggle = useCallback(() => {
    if (applied) {
      cleanupTheme();
      setApplied(false);
      setPresetName('');
      localStorage.setItem(STORAGE_KEY, 'native');
    } else {
      load();
    }
  }, [applied, cleanupTheme, load]);

  // On mount: apply if user previously chose ThemeDist
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'applied') {
      load();
    } else {
      // Ensure native theme is set
      for (const [key, val] of Object.entries(NATIVE_THEME)) {
        document.documentElement.style.setProperty(key, val);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={applied ? `当前: ${presetName} — 点击恢复原生主题` : '应用今日 ThemeDist 主题到仪表盘'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        applied
          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/25'
          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
      } disabled:opacity-50`}
    >
      {applied ? (
        <>
          <Undo2 className="w-3 h-3" />
          <span className="max-w-[120px] truncate">{presetName}</span>
        </>
      ) : (
        <>
          <Palette className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          应用主题
        </>
      )}
    </button>
  );
}
