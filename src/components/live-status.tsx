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
  const [loading, setLoading] = useState(true);
  const [dataTimestamp, setDataTimestamp] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setVercel(data.status.vercel);
      setNetlify(data.status.netlify);
      setDb(data.status.db);
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
      checking: t('liveStatus.checking'),
      error: t('liveStatus.error'),
    };
    return map[s] ?? t('liveStatus.unknown');
  }

  function dbLabel(s: string): string {
    const map: Record<string, string> = {
      healthy: t('liveStatus.healthy'),
      degraded: t('liveStatus.degraded'),
      checking: t('liveStatus.checking'),
      error: t('liveStatus.error'),
    };
    return map[s] ?? t('liveStatus.unknown');
  }

  function statusDot(s: string): string {
    if (s === 'online' || s === 'healthy') return 'online';
    if (s === 'slow') return 'slow';
    if (s === 'outage' || s === 'error' || s === 'degraded') return 'outage';
    return '';
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a22]">
          <Globe className="w-8 h-8 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Vercel</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(vercel.status) || ''}`} />
              <span className="text-sm font-medium text-white">{statusLabel(vercel.status)}</span>
            </div>
            {vercel.latencyMs !== null && (
              <div className="text-xs text-zinc-500 mt-0.5">{vercel.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a22]">
          <Globe className="w-8 h-8 text-green-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Netlify</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(netlify.status) || ''}`} />
              <span className="text-sm font-medium text-white">{statusLabel(netlify.status)}</span>
            </div>
            {netlify.latencyMs !== null && (
              <div className="text-xs text-zinc-500 mt-0.5">{netlify.latencyMs}ms</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a22]">
          <Database className="w-8 h-8 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">{t('liveStatus.database')}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${statusDot(db) || ''}`} />
              <span className="text-sm font-medium text-white">{dbLabel(db)}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">{t('liveStatus.redis')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
