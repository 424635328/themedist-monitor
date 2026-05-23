'use client';

import { useState } from 'react';
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
  const [message, setMessage] = useState('');
  const [isAlert, setIsAlert] = useState(false);

  async function runMonitor() {
    setRunning(true);
    setMessage('');
    setIsAlert(false);
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      setLastRun(new Date().toLocaleString());
      if (data.alerts?.length > 0) {
        setMessage(`${t('page.alertWith')} ${data.alerts.length} ${t('page.alertUnit')}`);
        setIsAlert(true);
      } else {
        setMessage(t('page.allPassed'));
      }
    } catch {
      setMessage(t('page.checkFailed'));
      setIsAlert(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-lg font-bold text-white">{t('page.title')}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t('page.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-zinc-600">{t('page.lastRun')}{lastRun}</span>
          )}
          <button
            onClick={runMonitor}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className={`text-xs px-4 py-2 rounded-lg animate-fade-in ${
          isAlert
            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            : 'bg-green-500/10 text-green-400 border border-green-500/20'
        }`}>
          {message}
        </div>
      )}

      <LiveStatus />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MetricsPanel />
        </div>
        <div>
          <ThemeAudit />
        </div>
      </div>

      <AlertsHistory />
      <FailoverGuide />
    </div>
  );
}
