'use client';

import { useState } from 'react';
import { Shield, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function FailoverGuide() {
  const { t } = useLanguage();
  const [copiedVanilla, setCopiedVanilla] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);

  const vanillaCode = `// ThemeDist Failover — Vanilla JS
async function loadTheme() {
  const FALLBACK_THEME = {
    "--color-primary": "#3b82f6",
    "--color-bg": "#ffffff",
    "--color-text": "#111827"
  };

  try {
    const res = await fetch(
      "https://themedist-monitor.vercel.app/api/today-safe"
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    // Sanity check
    if (!data.cssVars || !data.cssVars["--color-primary"]) {
      throw new Error("Invalid schema");
    }

    // Apply theme
    const root = document.documentElement;
    for (const [key, val] of Object.entries(data.cssVars)) {
      root.style.setProperty(key, val);
    }
    console.log("[ThemeDist] Theme applied successfully");
  } catch (err) {
    console.warn("[ThemeDist] Falling back to default theme:", err.message);
    const root = document.documentElement;
    for (const [key, val] of Object.entries(FALLBACK_THEME)) {
      root.style.setProperty(key, val);
    }
  }
}

loadTheme();`;

  const reactCode = `// ThemeDist Failover — React Hook
import { useState, useEffect } from "react";

const FALLBACK_THEME = {
  "--color-primary": "#3b82f6",
  "--color-bg": "#ffffff",
  "--color-text": "#111827"
};

export function useThemeDist() {
  const [theme, setTheme] = useState(FALLBACK_THEME);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          "https://themedist-monitor.vercel.app/api/today-safe"
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        if (!data.cssVars || !data.cssVars["--color-primary"]) {
          throw new Error("Invalid schema");
        }

        if (!cancelled) {
          setTheme(data.cssVars);
          setStatus("safe");
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[ThemeDist] Fallback triggered:", err.message);
          setStatus("fallback");
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Apply CSS vars
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(theme)) {
      root.style.setProperty(key, val);
    }
    return () => {
      for (const key of Object.keys(theme)) {
        root.style.removeProperty(key);
      }
    };
  }, [theme]);

  return { status, theme };
}`;

  const tips = [
    t('failover.tip1'),
    t('failover.tip2'),
    t('failover.tip3'),
    t('failover.tip4'),
    t('failover.tip5'),
  ];

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setter(true);
      setTimeout(() => setter(false), 2000);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">{t('failover.title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-[#1a1a22] rounded-lg p-4">
          <div className="text-xs font-medium text-zinc-300 mb-2">{t('failover.bestPractices')}</div>
          <ul className="space-y-2 text-xs text-zinc-500">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">{i + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: tip }} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-300">{t('failover.vanillaJs')}</span>
            <button
              onClick={() => copyToClipboard(vanillaCode, setCopiedVanilla)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {copiedVanilla ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copiedVanilla ? t('failover.copied') : t('failover.copy')}
            </button>
          </div>
          <pre className="text-xs text-zinc-400 bg-[#0d0d12] rounded-lg p-4 overflow-x-auto border border-[#252530]"><code>{vanillaCode}</code></pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-300">{t('failover.reactHook')}</span>
            <button
              onClick={() => copyToClipboard(reactCode, setCopiedReact)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {copiedReact ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copiedReact ? t('failover.copied') : t('failover.copy')}
            </button>
          </div>
          <pre className="text-xs text-zinc-400 bg-[#0d0d12] rounded-lg p-4 overflow-x-auto border border-[#252530]"><code>{reactCode}</code></pre>
        </div>

        <div className="bg-[#1a1a22] rounded-lg p-4">
          <div className="text-xs font-medium text-zinc-300 mb-3">{t('failover.badges')}</div>
          <div className="space-y-2">
            <code className="text-xs text-zinc-400 block bg-[#0d0d12] rounded px-3 py-2 border border-[#252530]">
              [![Vercel Status]](https://themedist-monitor.vercel.app/api/badges/vercel)
            </code>
            <code className="text-xs text-zinc-400 block bg-[#0d0d12] rounded px-3 py-2 border border-[#252530]">
              [![Netlify Status]](https://themedist-monitor.vercel.app/api/badges/netlify)
            </code>
            <code className="text-xs text-zinc-400 block bg-[#0d0d12] rounded px-3 py-2 border border-[#252530]">
              [![Theme Safety]](https://themedist-monitor.vercel.app/api/badges/theme)
            </code>
            <code className="text-xs text-zinc-400 block bg-[#0d0d12] rounded px-3 py-2 border border-[#252530]">
              [![Database]](https://themedist-monitor.vercel.app/api/badges/database)
            </code>
            <code className="text-xs text-zinc-400 block bg-[#0d0d12] rounded px-3 py-2 border border-[#252530]">
              [![Uptime]](https://themedist-monitor.vercel.app/api/badges/uptime)
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
