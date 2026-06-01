'use client';

import { useEffect, useState } from 'react';
import { Activity, Globe, Database, RefreshCw, Wifi, Palette, Cloud, ShieldCheck, FileCode2, Image, Type, Layers, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface StatusInfo {
  status: string;
  latencyMs: number | null;
}

export default function LiveStatus() {
  const { t } = useLanguage();
  const [vercel, setVercel] = useState<StatusInfo>({ status: 'checking', latencyMs: null });
  const [netlify, setNetlify] = useState<StatusInfo>({ status: 'checking', latencyMs: null });
  const [db, setDb] = useState<string>('checking');
  const [dbPending, setDbPending] = useState<number | null>(null);
  const [dbApproved, setDbApproved] = useState<number | null>(null);
  const [endpointStatuses, setEndpointStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/status');
      const data = await res.json();
      setVercel(data.platforms.vercel);
      setNetlify(data.platforms.netlify);
      setDb(data.database?.status ?? 'unknown');
      setDbPending(data.database?.pending ?? null);
      setDbApproved(data.database?.approved ?? null);
      setEndpointStatuses(data.endpoints ?? {});
      setDataTimestamp(data.checkedAt);
    } catch {
      setVercel({ status: 'error', latencyMs: null });
      setNetlify({ status: 'error', latencyMs: null });
      setDb('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000); // poll every 5 min
    return () => clearInterval(interval);
  }, []);

  function statusLabel(s: string): string {
    const map: Record<string, string> = {
      online: t('liveStatus.online'),
      slow: t('liveStatus.slow'),
      outage: t('liveStatus.outage'),
      no_data: t('liveStatus.no_data'),
      checking: t('liveStatus.checking'),
      error: t('liveStatus.error'),
    };
    return map[s] ?? t('liveStatus.unknown');
  }

  function dbLabel(s: string): string {
    const map: Record<string, string> = {
      healthy: t('liveStatus.healthy'),
      degraded: t('liveStatus.degraded'),
      no_data: t('liveStatus.no_data'),
      checking: t('liveStatus.checking'),
      error: t('liveStatus.error'),
    };
    return map[s] ?? t('liveStatus.unknown');
  }

  function cardGlow(s: string): string {
    if (s === 'online' || s === 'healthy') return 'shadow-[0_0_12px_rgba(34,197,94,0.08)] border-emerald-500/20';
    if (s === 'slow') return 'shadow-[0_0_12px_rgba(249,115,22,0.08)] border-orange-500/20';
    if (s === 'outage' || s === 'error' || s === 'degraded') return 'shadow-[0_0_12px_rgba(239,68,68,0.08)] border-red-500/20';
    return '';
  }

  function statusDot(s: string): string {
    if (s === 'online' || s === 'healthy') return 'online';
    if (s === 'slow') return 'slow';
    if (s === 'outage' || s === 'error' || s === 'degraded') return 'outage';
    if (s === 'no_data') return 'no_data';
    return '';
  }

  function latencyColor(ms: number | null): string {
    if (ms === null) return 'text-zinc-500';
    if (ms < 1000) return 'text-emerald-400';
    if (ms < 2000) return 'text-yellow-400';
    return 'text-orange-400';
  }

  function iconColor(s: string): string {
    if (s === 'online') return 'text-emerald-400';
    if (s === 'slow') return 'text-orange-400';
    if (s === 'outage' || s === 'error') return 'text-red-400';
    if (s === 'healthy') return 'text-emerald-400';
    if (s === 'degraded') return 'text-orange-400';
    return 'text-zinc-500';
  }

  function formatAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return t('liveStatus.justNow');
    if (minutes < 60) return `${minutes}${t('liveStatus.minAgo')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${t('liveStatus.hourAgo')}`;
    return `${Math.floor(hours / 24)}${t('liveStatus.dayAgo')}`;
  }

  function endpointLabel(s: string): string {
    return s === 'ok' ? t('liveStatus.online') : s === 'stale' ? t('liveStatus.slow') : t('liveStatus.unknown');
  }

  const ENDPOINT_META = [
    { key: 'events', label: t('liveStatus.endpoint.events'), icon: Wifi },
    { key: 'tokens', label: t('liveStatus.endpoint.tokens'), icon: Palette },
    { key: 'weather', label: t('liveStatus.endpoint.weather'), icon: Cloud },
    { key: 'todaySafe', label: t('liveStatus.endpoint.todaySafe'), icon: ShieldCheck },
    { key: 'todayCss', label: t('liveStatus.endpoint.todayCss'), icon: FileCode2 },
    { key: 'favicon', label: t('liveStatus.endpoint.favicon'), icon: Image },
    { key: 'fonts', label: t('liveStatus.endpoint.fonts'), icon: Type },
    { key: 'patterns', label: t('liveStatus.endpoint.patterns'), icon: Layers },
    { key: 'colorSearch', label: t('liveStatus.endpoint.colorSearch'), icon: Search },
  ];

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('liveStatus.title')}</h2>
          {dataTimestamp && (
            <span className="text-[10px] text-zinc-600 font-mono">{formatAgo(dataTimestamp)}</span>
          )}
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {t('liveStatus.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#1a1a22] border border-transparent transition-all duration-500 ${cardGlow(vercel.status)}`}>
          <Globe className={`w-7 h-7 ${iconColor(vercel.status)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Vercel</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`status-dot ${statusDot(vercel.status) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{statusLabel(vercel.status)}</span>
            </div>
            {vercel.latencyMs !== null && (
              <div className={`text-[11px] mt-0.5 font-mono ${latencyColor(vercel.latencyMs)}`}>{vercel.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#1a1a22] border border-transparent transition-all duration-500 ${cardGlow(netlify.status)}`}>
          <Globe className={`w-7 h-7 ${iconColor(netlify.status)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Netlify</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`status-dot ${statusDot(netlify.status) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{statusLabel(netlify.status)}</span>
            </div>
            {netlify.latencyMs !== null && (
              <div className={`text-[11px] mt-0.5 font-mono ${latencyColor(netlify.latencyMs)}`}>{netlify.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-3 p-4 rounded-xl bg-[#1a1a22] border border-transparent transition-all duration-500 ${cardGlow(db)}`}>
          <Database className={`w-7 h-7 ${iconColor(db)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{t('liveStatus.database')}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`status-dot ${statusDot(db) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{dbLabel(db)}</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {dbPending !== null && dbApproved !== null
                ? `${t('liveStatus.review')}: ${dbPending} ${t('liveStatus.pending')} / ${dbApproved} ${t('liveStatus.approved')}`
                : t('liveStatus.redis')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
        {ENDPOINT_META.map(({ key, label, icon: Icon }) => {
          const s = endpointStatuses[key] ?? 'unknown';
          return (
            <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1a22] border border-transparent transition-all duration-500 ${cardGlow(s === 'ok' ? 'online' : s === 'stale' ? 'slow' : 'unknown')}`}>
              <Icon className={`w-4 h-4 ${s === 'ok' ? 'text-emerald-400' : s === 'stale' ? 'text-orange-400' : 'text-zinc-500'} shrink-0`} />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 font-medium">{label}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`status-dot ${s === 'ok' ? 'online' : s === 'stale' ? 'outage' : ''}`} />
                  <span className="text-xs font-medium text-zinc-300">{endpointLabel(s)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
