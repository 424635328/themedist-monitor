'use client';

import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, AlertTriangle, Palette, User, CheckCircle, CircleX, Layers, MousePointerClick, Users, Code2, Wrench } from 'lucide-react';
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
        <div className="space-y-3">
          <div className="h-5 rounded-lg bg-[#1a1a22] animate-shimmer w-3/4" />
          <div className="h-5 rounded-lg bg-[#1a1a22] animate-shimmer w-1/2" />
          <div className="h-5 rounded-lg bg-[#1a1a22] animate-shimmer w-2/3" />
        </div>
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
          {snapshot.dailyIsCommunity !== undefined && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('theme.source')}</div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                <Users className="w-3 h-3" />
                {snapshot.dailyIsCommunity ? t('theme.community') : t('theme.preset')}
              </div>
            </div>
          )}
          {snapshot.apiVersion && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('theme.apiVersion')}</div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-300 font-mono">
                <Code2 className="w-3 h-3" /> {snapshot.apiVersion}
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-500 mb-3">{t('theme.date')}{snapshot.date}</div>

        {(snapshot.logoText || (snapshot.logoColors && snapshot.logoColors.length > 0)) && (
          <div className="flex items-center gap-3 mb-3 p-2.5 bg-zinc-800/30 rounded-lg">
            {snapshot.logoColors && snapshot.logoColors.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {snapshot.logoColors.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-md border border-zinc-700/50 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
            {snapshot.logoText && (
              <span className="text-xs font-semibold text-zinc-300 tracking-wider truncate">
                {snapshot.logoText}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            {snapshot.autoFixedSchema ? (
              <><Wrench className="w-3.5 h-3.5 text-yellow-400" /><span className="text-yellow-400">Schema已修复</span></>
            ) : isSchemaValid ? (
              <><CheckCircle className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">{t('theme.schemaValid')}</span></>
            ) : (
              <><CircleX className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">{t('theme.schemaInvalid')}</span></>
            )}
          </div>
        </div>

        {snapshot.autoFixedSchema && snapshot.autoFixedDetails && snapshot.autoFixedDetails.length > 0 && (
          <div className="mb-3">
            <ul className="space-y-0.5">
              {snapshot.autoFixedDetails.map((d, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                  <span className="text-yellow-400 mt-0.5">
                    {d.action === 'sanitized' ? '!' : d.action === 'derived' ? '~' : '+'}
                  </span>
                  <span className="font-mono">{d.key}</span>
                  <span className="text-zinc-500">— {d.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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

        {snapshot.layerContext && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
              <Layers className="w-3.5 h-3.5" />
              {t('theme.layerContext')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-zinc-500">{t('theme.particleDensity')}:</span>{' '}
                <span className="text-zinc-300">{snapshot.layerContext.particleDensity}</span>
              </div>
              <div>
                <span className="text-zinc-500">{t('theme.backgroundOverlay')}:</span>{' '}
                <span className={snapshot.layerContext.hasBackgroundOverlay ? 'text-yellow-400' : 'text-zinc-400'}>
                  {snapshot.layerContext.hasBackgroundOverlay ? t('theme.yes') : t('theme.no')}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">{t('theme.interactive')}:</span>{' '}
                <span className={snapshot.layerContext.hasInteractiveElements ? 'text-yellow-400' : 'text-zinc-400'}>
                  {snapshot.layerContext.hasInteractiveElements ? t('theme.yes') : t('theme.no')}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">{t('theme.weatherZIndex')}:</span>{' '}
                <span className="text-zinc-300 font-mono">{snapshot.layerContext.safeWeatherZIndex}</span>
              </div>
            </div>
          </div>
        )}

        {snapshot.clickEffect && snapshot.clickEffect.spawn && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
              <MousePointerClick className="w-3.5 h-3.5" />
              {t('theme.clickEffects')} ({snapshot.clickEffect.spawn.length})
            </div>
            <div className="space-y-1">
              {snapshot.clickEffect.spawn.map((s, i) => (
                <div key={i} className="text-xs font-mono text-zinc-400 bg-zinc-800/30 rounded px-2 py-1">
                  .{s.className} — {s.duration}ms
                  {s.count ? ` x${s.count}` : ''}
                  {s.angleSpread ? ` ${s.angleSpread}°` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
