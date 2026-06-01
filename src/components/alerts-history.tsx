'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, AlertTriangle, ServerCrash, Database, FileWarning, Copy, Check, X, Clock, Tag, Globe, Info, Maximize2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import type { SystemAlert } from '@/types';

const alertIcons: Record<string, React.ReactNode> = {
  OUTAGE: <ServerCrash className="w-3.5 h-3.5 text-red-400" />,
  SECURITY_BREACH: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  DB_DOWN: <Database className="w-3.5 h-3.5 text-orange-400" />,
  SCHEMA_MISMATCH: <FileWarning className="w-3.5 h-3.5 text-orange-400" />,
};

const alertIconLg: Record<string, React.ReactNode> = {
  OUTAGE: <ServerCrash className="w-9 h-9 text-red-400" />,
  SECURITY_BREACH: <AlertTriangle className="w-9 h-9 text-red-400" />,
  DB_DOWN: <Database className="w-9 h-9 text-orange-400" />,
  SCHEMA_MISMATCH: <FileWarning className="w-9 h-9 text-orange-400" />,
};

const alertTheme: Record<string, { accent: string; glow: string; bg: string; border: string; dot: string }> = {
  OUTAGE:       { accent: 'from-red-500 to-rose-500',   glow: 'shadow-[0_0_40px_rgba(239,68,68,0.15)]',   bg: 'bg-red-500/5',   border: 'border-red-500/15',  dot: 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]' },
  SECURITY_BREACH: { accent: 'from-red-500 to-pink-500', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.2)]',  bg: 'bg-red-500/5',   border: 'border-red-500/15',  dot: 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]' },
  DB_DOWN:       { accent: 'from-orange-500 to-amber-500', glow: 'shadow-[0_0_40px_rgba(249,115,22,0.12)]', bg: 'bg-orange-500/5', border: 'border-orange-500/15', dot: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
  SCHEMA_MISMATCH: { accent: 'from-yellow-500 to-amber-500', glow: 'shadow-[0_0_40px_rgba(234,179,8,0.1)]', bg: 'bg-yellow-500/5', border: 'border-yellow-500/15', dot: 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]' },
};

function AlertModal({ alert, onClose }: { alert: SystemAlert; onClose: () => void }) {
  const { t } = useLanguage();
  const thm = alertTheme[alert.type] || alertTheme.SCHEMA_MISMATCH;
  const severityMap: Record<string, { label: string; cls: string }> = {
    OUTAGE:           { label: t('alerts.severity.critical'), cls: 'text-red-400 bg-red-500/15 border-red-500/25' },
    SECURITY_BREACH:  { label: t('alerts.severity.critical'), cls: 'text-red-400 bg-red-500/15 border-red-500/25' },
    DB_DOWN:          { label: t('alerts.severity.warning'),  cls: 'text-orange-400 bg-orange-500/15 border-orange-500/25' },
    SCHEMA_MISMATCH:  { label: t('alerts.severity.notice'),   cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' },
  };
  const sev = severityMap[alert.type] || { label: '?', cls: '' };
  const detailLines = alert.details.split('\n');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050508]/85 backdrop-blur-md animate-fade-in" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#0c0c14] border ${thm.border} rounded-2xl ${thm.glow} overflow-hidden animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top accent bar ── */}
        <div className={`h-1 bg-gradient-to-r ${thm.accent}`} />

        {/* ── Header ── */}
        <div className="flex items-start gap-4 p-5 pb-4">
          <div className={`shrink-0 w-11 h-11 rounded-2xl ${thm.bg} border ${thm.border} flex items-center justify-center`}>
            {alertIconLg[alert.type] || <Info className="w-9 h-9 text-zinc-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-white leading-snug break-words">{alert.message}</div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sev.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${thm.dot}`} />
                {sev.label}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">{alert.type}</span>
              {alert.resolved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" />
                  {t('alerts.resolved')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {t('alerts.unresolved')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-xl bg-[#18181f] border border-[#252530] text-zinc-500 hover:text-zinc-200 hover:bg-[#252530] hover:border-zinc-600 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-5 pb-5 space-y-4">
          {/* Meta cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: <Clock className="w-3.5 h-3.5" />, label: t('alerts.modal.time'), value: new Date(alert.timestamp).toLocaleString(undefined, { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
              { icon: <Globe className="w-3.5 h-3.5" />, label: t('alerts.modal.platform'), value: alert.platform, mono: true },
              { icon: <Tag className="w-3.5 h-3.5" />, label: t('alerts.modal.type'), value: alert.type, mono: true },
              { icon: <Info className="w-3.5 h-3.5" />, label: t('alerts.modal.status'), value: alert.resolved ? t('alerts.resolved') : t('alerts.unresolved'), colored: true, active: !alert.resolved },
            ].map((m, i) => (
              <div key={i} className="bg-[#111118] rounded-xl p-3 border border-[#1c1c26]">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1.5">
                  {m.icon} {m.label}
                </div>
                <div className={`text-xs font-semibold truncate ${m.mono ? 'font-mono text-zinc-300' : m.colored ? (m.active ? 'text-red-400' : 'text-emerald-400') : 'text-zinc-200'}`}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Details section */}
          <div className="bg-[#111118] rounded-xl border border-[#1c1c26] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c1c26]">
              <span className={`w-1 h-3 rounded-full bg-gradient-to-b ${thm.accent}`} />
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">{t('alerts.modal.details')}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">{detailLines.length} {t('alerts.modal.lines')}</span>
            </div>
            <div className="p-4 space-y-2 max-h-[340px] overflow-y-auto">
              {detailLines.map((line, i) => {
                const trimmed = line.trim();
                if (trimmed === '—') {
                  return <div key={i} className="flex items-center gap-2 my-3"><div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#252530] to-transparent" /></div>;
                }
                const isRemediation = trimmed.startsWith('Remediation');
                const isStep = /^\d+\./.test(trimmed);
                const isThemeHeader = /^━━━/.test(trimmed);
                const isPresetId = /^\s*preset ID\s*:/.test(line) || /^\s*Theme ID\s*:/.test(line);
                const isAttackType = /^\s*攻击类型\s*:/.test(line) || /^\s*绕过清洗\s*:/.test(line);
                const isBypassedRule = /^\s+⚠/.test(line);

                return (
                  <div
                    key={i}
                    className={`${
                      isRemediation
                        ? 'text-xs font-bold text-yellow-300 pt-2 flex items-center gap-1.5'
                        : isStep
                          ? 'text-[11px] text-zinc-300 pl-3 border-l-2 border-yellow-500/25 leading-relaxed'
                          : isThemeHeader
                            ? 'text-xs font-bold text-purple-300 pt-3 first:pt-0 font-mono'
                            : isPresetId
                              ? 'text-[11px] text-zinc-400 font-mono pl-2'
                              : isAttackType
                                ? 'text-[11px] text-red-400/80 font-semibold pl-2'
                                : isBypassedRule
                                  ? 'text-[10px] text-amber-400/80 pl-2 italic'
                                  : 'text-[11px] text-zinc-400 font-mono leading-relaxed break-words pl-2'
                    }`}
                  >
                    {isRemediation ? <><span className="text-yellow-500">◆</span> {line}</> : line}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw JSON */}
          <details className="group bg-[#111118] rounded-xl border border-[#1c1c26] overflow-hidden">
            <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[10px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors">
              <span className="w-1 h-3 rounded-full bg-zinc-700 group-hover:bg-zinc-500 transition-colors" />
              {t('alerts.modal.raw')}
              <span className="ml-auto text-zinc-700 text-[9px]">{Math.round(JSON.stringify(alert).length / 1024)} KB</span>
            </summary>
            <pre className="text-[11px] text-zinc-400 font-mono bg-[#08080e] p-4 border-t border-[#1c1c26] overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(alert, null, 2)}
            </pre>
          </details>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c1c26] bg-[#0a0a10]">
          <span className="text-[10px] text-zinc-600 font-mono">ID: {alert.id.slice(0, 8)}…</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-400 bg-[#18181f] hover:bg-[#252530] hover:text-white border border-[#252530] hover:border-zinc-600 transition-all"
          >
            {t('alerts.modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsHistory() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<SystemAlert | null>(null);

  useEffect(() => {
    fetch('/api/v1/data')
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts?.recent || []))
      .catch(() => {});
  }, []);

  const displayed = showResolved ? alerts : alerts.filter((a) => !a.resolved);

  const resolveOne = useCallback(async (alertId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/v1/alerts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts?.recent || []);
    } catch (err) {
      console.error('[AlertsHistory] Failed to resolve alert:', err);
    }
  }, []);

  const resolveAll = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/alerts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts?.recent || []);
    } catch (err) {
      console.error('[AlertsHistory] Failed to resolve all alerts:', err);
    }
  }, []);

  async function copyAlerts() {
    const text = displayed
      .map((a) => `[${a.type}] ${a.platform} — ${a.message}\n${a.details}\n${new Date(a.timestamp).toLocaleString()}${a.resolved ? ' (resolved)' : ''}`)
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const alertTypeLabelShort: Record<string, string> = {
    OUTAGE: t('alerts.outage'),
    SECURITY_BREACH: t('alerts.security'),
    DB_DOWN: t('alerts.database'),
    SCHEMA_MISMATCH: t('alerts.schema'),
  };

  const alertTypeColorShort: Record<string, string> = {
    OUTAGE: 'bg-red-500/10 text-red-400',
    SECURITY_BREACH: 'bg-red-500/10 text-red-400',
    DB_DOWN: 'bg-orange-500/10 text-orange-400',
    SCHEMA_MISMATCH: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <>
      <div className="card animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">{t('alerts.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {displayed.length > 0 && (
              <>
                {!showResolved && (
                  <button
                    onClick={resolveAll}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    title="Resolve all"
                  >
                    <X className="w-3 h-3" />
                    {t('alerts.resolveAll')}
                  </button>
                )}
                <button
                  onClick={copyAlerts}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? t('alerts.copied') : t('alerts.copy')}
              </button>
              </>
            )}
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {showResolved ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              {showResolved ? t('alerts.all') : t('alerts.unresolved')}
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="text-xs text-zinc-600 py-8 text-center">
            <BellOff className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
            {showResolved ? t('alerts.noAlerts') : t('alerts.allClear')}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.slice(0, 20).map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelected(alert)}
                className={`group flex items-start gap-3 p-3.5 rounded-xl text-xs cursor-pointer transition-all duration-200 border border-transparent hover:border-zinc-600/40 hover:bg-[#15151e] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] ${
                  alert.resolved ? 'bg-[#1a1a22] opacity-60' : 'bg-[#1a1a22]'
                }`}
              >
                <div className="mt-0.5 shrink-0">{alertIcons[alert.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-zinc-300">{alert.message}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${alertTypeColorShort[alert.type] || ''}`}>
                      {alertTypeLabelShort[alert.type] || alert.type}
                    </span>
                    {alert.resolved && (
                      <span className="text-green-500 text-[10px]">{t('alerts.resolved')}</span>
                    )}
                    <span className="ml-auto shrink-0 text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400 transition-all">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                    {!alert.resolved && (
                      <button
                        onClick={(e) => resolveOne(alert.id, e)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        title={t('alerts.dismiss')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-zinc-500 truncate">{alert.details}</div>
                  <div className="text-zinc-600 mt-0.5">
                    {new Date(alert.timestamp).toLocaleString()}
                    <span className="ml-2">[{alert.platform}]</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <AlertModal alert={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
