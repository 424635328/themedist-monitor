'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles, Undo2, Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [intentionalNative, setIntentionalNative] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const extRefs = useRef<HTMLElement[]>([]);
  const retryCount = useRef(0);

  const cleanupTheme = useCallback(() => {
    const root = document.documentElement;
    const allKeys = new Set([
      ...Object.keys(NATIVE_THEME),
      ...Array.from(root.style).filter((k) => k.startsWith('--')),
    ]);
    for (const key of allKeys) {
      root.style.removeProperty(key);
    }
    for (const [key, val] of Object.entries(NATIVE_THEME)) {
      root.style.setProperty(key, val);
    }
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }
    for (const el of extRefs.current) {
      el.remove();
    }
    extRefs.current = [];
  }, []);

  const applyTheme = useCallback((data: ThemeData) => {
    const root = document.documentElement;

    for (const [key, val] of Object.entries(data.cssVars)) {
      root.style.setProperty(key, val as string);
    }

    if (data.customCss) {
      const style = document.createElement('style');
      style.setAttribute('data-td-theme', '1');
      style.textContent = data.customCss;
      document.head.appendChild(style);
      styleRef.current = style;
    }

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
    setLoading(false);
    localStorage.setItem(STORAGE_KEY, 'applied');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/v1/today-safe');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.cssVars?.['--color-primary']) throw new Error('Invalid schema');
      applyTheme(data as ThemeData);
      retryCount.current = 0;
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`[ThemeDist] Failed: ${msg}`);

      // Auto-retry once after a short delay (proxy may be slow to start)
      if (retryCount.current < 1) {
        retryCount.current++;
        setTimeout(() => load(), 3000);
        return; // keep showing loading state
      }

      // Both attempts failed — show error
      for (const [key, val] of Object.entries(NATIVE_THEME)) {
        document.documentElement.style.setProperty(key, val);
      }
      setLoading(false);
      setApplied(false);
      setError(true);
    }
  }, [applyTheme]);

  const toggle = useCallback(() => {
    if (applied) {
      cleanupTheme();
      setApplied(false);
      setPresetName('');
      setError(false);
      setIntentionalNative(true);
      localStorage.setItem(STORAGE_KEY, 'native');
    } else {
      setIntentionalNative(false);
      retryCount.current = 0;
      load();
    }
  }, [applied, cleanupTheme, load]);

  // On mount: auto-apply unless user explicitly chose native
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'native') {
      setIntentionalNative(true);
      for (const [key, val] of Object.entries(NATIVE_THEME)) {
        document.documentElement.style.setProperty(key, val);
      }
      setLoading(false);
    } else {
      // Auto-apply on first visit or when previously applied
      load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-zinc-500 bg-zinc-800/50">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">加载主题…</span>
        <span className="sm:hidden">…</span>
      </span>
    );
  }

  return (
    <button
      onClick={error ? load : toggle}
      title={
        error ? '点击重试加载 ThemeDist 主题'
        : applied ? `当前主题: ${presetName} — 点击恢复原生`
        : '点击加载 ThemeDist 主题'
      }
      className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
        applied
          ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:border-purple-400/50'
          : error
            ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 border border-amber-500/25 hover:border-amber-400/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]'
            : 'bg-gradient-to-r from-zinc-700/50 to-zinc-600/50 text-zinc-300 border border-zinc-600/30 hover:border-zinc-500/50 hover:text-white hover:shadow-[0_0_12px_rgba(161,161,170,0.1)]'
      }`}
    >
      {applied ? (
        <>
          <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span className="max-w-[130px] truncate">{presetName}</span>
          <span className="w-px h-3 bg-purple-400/30" />
          <Undo2 className="w-3 h-3 text-purple-400/70 group-hover:text-purple-300 transition-colors" />
        </>
      ) : (
        <>
          <Sparkles className={`w-3.5 h-3.5 ${error ? 'text-amber-400' : ''}`} />
          <span>{error ? '点击重试' : '主题加载失败'}</span>
        </>
      )}
    </button>
  );
}
