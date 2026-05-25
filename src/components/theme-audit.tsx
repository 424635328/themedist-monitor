'use client';

import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, AlertTriangle, Palette, User, CheckCircle, CircleX } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import type { ThemeSnapshot } from '@/types';

export default function ThemeAudit() {
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<ThemeSnapshot | null>(null);

  useEffect(() => {
    fetch('/api/v1/data')
      .then((r) => r.json())
      .then((data) => setSnapshot(data.latestSnapshot))
      .catch(() => {});
  }, []);

  if (!snapshot) {
    return (
      <div className="card animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('theme.title')}</h2>
        </div>
        <div className="text-xs text-zinc-600 py-8 text-center">{t('theme.noData')}</div>
      </div>
    );
  }

  const isUnsafe = snapshot.securityStatus === 'unsafe';
  const isSchemaValid = snapshot.isValidSchema;

  return (
    <div className="card animate-fade-in animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('theme.auditTitle')}</h2>
        </div>
        <span className={`${isUnsafe ? 'badge-unsafe' : 'badge-safe'} text-xs`}>
          {isUnsafe ? (
            <><ShieldAlert className="w-3 h-3" /> {t('theme.unsafe')}</>
          ) : (
            <><Shield className="w-3 h-3" /> {t('theme.securityPassed')}</>
          )}
        </span>
      </div>

      <div className={`rounded-lg p-4 ${isUnsafe ? 'bg-red-500/5 border border-red-500/20' : 'bg-[#1a1a22]'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">{t('theme.presetName')}</div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isUnsafe ? 'text-red-400' : 'text-white'}`}>
                {snapshot.presetName}
              </span>
              {isUnsafe && (
                <span className="text-xs text-red-400 animate-pulse">{t('theme.malicious')}</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">{t('theme.presetId')}</div>
            <div className="text-sm text-zinc-300 font-mono">{snapshot.preset}</div>
          </div>
          {snapshot.author && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('theme.author')}</div>
              <div className="flex items-center gap-1 text-sm text-zinc-300">
                <User className="w-3 h-3" /> {snapshot.author}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-zinc-500 mb-1">{t('theme.themeCount')}</div>
            <div className="text-sm text-zinc-300">{snapshot.themeCount} {t('theme.available')}</div>
          </div>
        </div>

        <div className="text-xs text-zinc-500 mb-3">{t('theme.date')}{snapshot.date}</div>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            {isSchemaValid ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <CircleX className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={isSchemaValid ? 'text-green-400' : 'text-red-400'}>
              {isSchemaValid ? t('theme.schemaValid') : t('theme.schemaInvalid')}
            </span>
          </div>
        </div>

        {snapshot.validationErrors && snapshot.validationErrors.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-red-400 mb-1">{t('theme.schemaErrors')}</div>
            <ul className="space-y-0.5">
              {snapshot.validationErrors.map((err, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">•</span> {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {snapshot.flaggedReasons && snapshot.flaggedReasons.length > 0 && (
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('theme.flaggedIssues')}
            </div>
            <ul className="space-y-1">
              {snapshot.flaggedReasons.map((reason, i) => (
                <li key={i} className="text-xs text-red-300 font-mono bg-red-500/5 rounded px-2 py-1">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
