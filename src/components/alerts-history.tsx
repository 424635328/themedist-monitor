'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertTriangle, ServerCrash, Database, FileWarning } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import type { SystemAlert } from '@/types';

const alertIcons: Record<string, React.ReactNode> = {
  OUTAGE: <ServerCrash className="w-3.5 h-3.5 text-red-400" />,
  SECURITY_BREACH: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  DB_DOWN: <Database className="w-3.5 h-3.5 text-orange-400" />,
  SCHEMA_MISMATCH: <FileWarning className="w-3.5 h-3.5 text-orange-400" />,
};

export default function AlertsHistory() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts?.recent || []))
      .catch(() => {});
  }, []);

  const displayed = showResolved ? alerts : alerts.filter((a) => !a.resolved);

  const alertTypeLabel: Record<string, string> = {
    OUTAGE: t('alerts.outage'),
    SECURITY_BREACH: t('alerts.security'),
    DB_DOWN: t('alerts.database'),
    SCHEMA_MISMATCH: t('alerts.schema'),
  };

  const alertTypeColor: Record<string, string> = {
    OUTAGE: 'bg-red-500/10 text-red-400',
    SECURITY_BREACH: 'bg-red-500/10 text-red-400',
    DB_DOWN: 'bg-orange-500/10 text-orange-400',
    SCHEMA_MISMATCH: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('alerts.title')}</h2>
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          {showResolved ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
          {showResolved ? t('alerts.all') : t('alerts.unresolved')}
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-xs text-zinc-600 py-6 text-center">
          {showResolved ? t('alerts.noAlerts') : t('alerts.allClear')}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.slice(0, 20).map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg text-xs ${
                alert.resolved ? 'bg-[#1a1a22] opacity-60' : 'bg-[#1a1a22]'
              }`}
            >
              <div className="mt-0.5 shrink-0">{alertIcons[alert.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-zinc-300">{alert.message}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${alertTypeColor[alert.type] || ''}`}>
                    {alertTypeLabel[alert.type] || alert.type}
                  </span>
                  {alert.resolved && (
                    <span className="text-green-500 text-[10px]">{t('alerts.resolved')}</span>
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
  );
}
