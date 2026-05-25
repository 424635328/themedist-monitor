'use client';

import { useState, useRef } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import LiveStatus from '@/components/live-status';
import MetricsPanel from '@/components/metrics-panel';
import ThemeAudit from '@/components/theme-audit';
import AlertsHistory from '@/components/alerts-history';
import FailoverGuide from '@/components/failover-guide';

export default function Home() {
  const { t } = useLanguage();
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [isAlert, setIsAlert] = useState(false);
  const debounceRef = useRef(0);

  async function runMonitor() {
    const now = Date.now();
    if (running || now - debounceRef.current < 3000) return;
    debounceRef.current = now;
    setRunning(true);
    setMessage('');
    setIsAlert(false);
    try {
      const res = await fetch('/api/v1/monitor');
      const data = await res.json();
      setLastRun(new Date().toLocaleString());
      if (data.alerts?.length > 0) {
        setMessage(`${t('page.alertWith')} ${data.alerts.length} ${t('page.alertUnit')}`);
        setIsAlert(true);
      } else {
        setMessage(t('page.allPassed'));
      }
      setRefreshKey((k) => k + 1); // force child components to re-fetch
    } catch {
      setMessage(t('page.checkFailed'));
      setIsAlert(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text,#fff)] tracking-tight">{t('page.title')}</h1>
          <p className="text-xs text-[var(--color-text-muted,#71717a)] mt-1 max-w-lg leading-relaxed">
            {t('page.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {lastRun && (
            <span className="text-[11px] text-zinc-600 font-mono hidden md:inline">{t('page.lastRun')}{lastRun}</span>
          )}
          <button
            onClick={runMonitor}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            {running ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {running ? t('page.running') : t('page.runMonitor')}
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-lg animate-fade-in ${
          isAlert
            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-orange-400' : 'bg-emerald-400'}`} />
          {message}
        </div>
      )}

      <LiveStatus />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MetricsPanel />
        </div>
        <div>
          <ThemeAudit key={refreshKey} />
        </div>
      </div>

      <AlertsHistory key={refreshKey} />
      <FailoverGuide />
    </div>
  );
}
