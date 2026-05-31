'use client';

import { useState } from 'react';
import { Shield, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function FailoverGuide() {
  const { t } = useLanguage();
  const [copiedVanilla, setCopiedVanilla] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);
  const [copiedBadges, setCopiedBadges] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  const vanillaCode = `// ThemeDist Failover — Vanilla JS (full integration)
async function loadTheme() {
  const FALLBACK = {
    "--color-primary": "#3b82f6",
    "--color-bg": "#ffffff",
    "--color-text": "#111827"
  };

  try {
    const res = await fetch(
      "https://themedist-monitor.vercel.app/api/v1/today-safe"
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    if (!data.cssVars || !data.cssVars["--color-primary"])
      throw new Error("Invalid schema");

    // 1. CSS vars → :root
    const root = document.documentElement;
    for (const [k, v] of Object.entries(data.cssVars))
      root.style.setProperty(k, v);

    // 2. customCss → <style> (safe: textContent)
    if (data.customCss) {
      let s = document.getElementById("td-css");
      if (!s) { s = document.createElement("style");
        s.id = "td-css"; document.head.appendChild(s); }
      s.textContent = data.customCss;
    }

    // 3. extensions → safe DOM (floating + decorative)
    if (data.extensions?.length) renderExts(data.extensions);

    // 4. Cache
    localStorage.setItem("td", JSON.stringify({
      date: data.date, cssVars: data.cssVars,
      customCss: data.customCss, exts: data.extensions
    }));
  } catch (err) {
    const fb = JSON.parse(localStorage.getItem("td") || "null");
    if (fb) { /* apply cached theme */ }
  }
}

function renderExts(exts) {
  const c = document.createElement("div");
  c.id = "td-exts"; document.body.prepend(c);
  exts.slice(0, 20).forEach(ext => {
    if (ext.type === "floating" && ext.char) {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;pointer-events:none"
        + (ext.top ? ";top:"+ext.top : "")
        + (ext.left ? ";left:"+ext.left : "")
        + (ext.fontSize ? ";font-size:"+ext.fontSize : "")
        + (ext.animation ? ";animation:"+ext.animation : "")
        + (ext.opacity != null ? ";opacity:"+ext.opacity : "");
      el.textContent = String(ext.char).slice(0, 4);
      c.appendChild(el);
    } else if (ext.type === "decorative" && ext.html) {
      const t = document.createElement("template");
      t.innerHTML = ext.html;
      const f = t.content.cloneNode(true);
      f.querySelectorAll("*").forEach(n =>
        [...n.attributes].forEach(a =>
          /^on/i.test(a.name) && n.removeAttribute(a.name)));
      c.appendChild(f);
    }
  });
}

loadTheme();`;

  const reactCode = `// ThemeDist Failover — React Hook (full integration)
import { useState, useEffect } from "react";

export function useThemeDist() {
  const [theme, setTheme] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          "https://themedist-monitor.vercel.app/api/v1/today-safe"
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (!data.cssVars?.["--color-primary"])
          throw new Error("Invalid schema");
        if (!cancelled) {
          setTheme(data);
          setStatus("safe");
        }
      } catch (err) {
        const fb = JSON.parse(
          localStorage.getItem("td") || "null"
        );
        if (!cancelled) {
          setTheme(fb);
          setStatus("fallback");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Apply CSS vars + customCss
  useEffect(() => {
    if (!theme?.cssVars) return;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.cssVars))
      root.style.setProperty(k, v);

    if (theme.customCss) {
      let s = document.getElementById("td-css");
      if (!s) { s = document.createElement("style");
        s.id = "td-css"; document.head.appendChild(s); }
      s.textContent = theme.customCss;
    }

    return () => {
      for (const k of Object.keys(theme.cssVars))
        root.style.removeProperty(k);
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

  // 定义徽章数据源
  const badgeList = [
    { id: 'vercel', label: 'Vercel Status', url: 'https://themedist-monitor.vercel.app/api/v1/badges/vercel' },
    { id: 'netlify', label: 'Netlify Status', url: 'https://themedist-monitor.vercel.app/api/v1/badges/netlify' },
    { id: 'theme', label: 'Theme Safety', url: 'https://themedist-monitor.vercel.app/api/v1/badges/theme' },
    { id: 'database', label: 'Database', url: 'https://themedist-monitor.vercel.app/api/v1/badges/database' },
    { id: 'uptime', label: 'Uptime', url: 'https://themedist-monitor.vercel.app/api/v1/badges/uptime' },
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

  // 辅助函数：更新对应徽章的复制状态
  const setBadgeCopiedState = (id: string, value: boolean) => {
    setCopiedBadges((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="card animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Shield className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white flex-1">{t('failover.title')}</h2>
        <span className="text-[10px] text-zinc-600">{t('failover.bestPractices')}</span>
      </button>

      {expanded && (
      <div className="space-y-4 mt-4">
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

        {/* 修复并重构后的徽章展示区域 */}
        <div className="bg-[#1a1a22] rounded-lg p-4">
          <div className="text-xs font-medium text-zinc-300 mb-3">{t('failover.badges')}</div>
          <div className="space-y-3">
            {badgeList.map((badge) => {
              // 修正后的 Markdown：带实时 SVG 图像并链接回监控站主页
              const markdownSnippet = `[![${badge.label}](${badge.url})](https://themedist-monitor.vercel.app)`;
              const isCopied = !!copiedBadges[badge.id];

              return (
                <div 
                  key={badge.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d12] rounded-lg p-3 border border-[#252530]"
                >
                  {/* 左侧：徽章名称与实时 SVG 显示 */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-400 font-medium min-w-[90px]">{badge.label}</span>
                    <img
                      src={badge.url}
                      alt={badge.label}
                      className="h-5 object-contain"
                    />
                  </div>

                  {/* 右侧：Markdown 代码预览与复制按钮 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <code className="text-[11px] text-zinc-500 truncate bg-[#16161f] px-2.5 py-1.5 rounded border border-[#22222e] font-mono flex-1 min-w-0 select-all">
                      {markdownSnippet}
                    </code>
                    <button
                      onClick={() => copyToClipboard(markdownSnippet, (v) => setBadgeCopiedState(badge.id, v))}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 shrink-0 px-2 py-1 bg-[#16161f] hover:bg-[#1e1e2a] rounded border border-[#22222e]"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span className="hidden md:inline">{isCopied ? t('failover.copied') : t('failover.copy')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}