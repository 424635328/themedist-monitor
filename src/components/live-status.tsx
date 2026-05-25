'use client';

import { useEffect, useState } from 'react';
import { Activity, Globe, Database, RefreshCw } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/data');
      const data = await res.json();
      setVercel(data.status.vercel);
      setNetlify(data.status.netlify);
      setDb(data.status.db);
      setDbPending(data.status.dbPending ?? null);
      setDbApproved(data.status.dbApproved ?? null);
      setDataTimestamp(data.timestamp);
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

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('liveStatus.title')}</h2>
          {dataTimestamp && (
            <span className="text-[10px] text-zinc-600">{formatAgo(dataTimestamp)}</span>
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
        <div className={`flex items-center gap-3 p-3.5 rounded-lg bg-[#1a1a22] border border-transparent transition-shadow duration-500 ${cardGlow(vercel.status)}`}>
          <Globe className={`w-7 h-7 ${iconColor(vercel.status)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium">Vercel</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(vercel.status) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{statusLabel(vercel.status)}</span>
            </div>
            {vercel.latencyMs !== null && (
              <div className={`text-[11px] mt-0.5 font-mono ${latencyColor(vercel.latencyMs)}`}>{vercel.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-3 p-3.5 rounded-lg bg-[#1a1a22] border border-transparent transition-shadow duration-500 ${cardGlow(netlify.status)}`}>
          <Globe className={`w-7 h-7 ${iconColor(netlify.status)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium">Netlify</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(netlify.status) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{statusLabel(netlify.status)}</span>
            </div>
            {netlify.latencyMs !== null && (
              <div className={`text-[11px] mt-0.5 font-mono ${latencyColor(netlify.latencyMs)}`}>{netlify.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-3 p-3.5 rounded-lg bg-[#1a1a22] border border-transparent transition-shadow duration-500 ${cardGlow(db)}`}>
          <Database className={`w-7 h-7 ${iconColor(db)} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 font-medium">{t('liveStatus.database')}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(db) || ''}`} />
              <span className="text-sm font-semibold text-[var(--color-text,#fff)]">{dbLabel(db)}</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {dbPending !== null && dbApproved !== null
                ? `审核: ${dbPending} 待审 / ${dbApproved} 已批准`
                : t('liveStatus.redis')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
