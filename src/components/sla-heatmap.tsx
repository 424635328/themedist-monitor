'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface DayCell {
  ok: number;
  total: number;
}

type DailyUptime = Record<'vercel' | 'netlify', Record<string, DayCell>>;

const DAYS = 30;

export default function SlaHeatmap() {
  const { t } = useLanguage();
  const [data, setData] = useState<DailyUptime | null>(null);

  useEffect(() => {
    fetch('/api/v1/data')
      .then((r) => r.json())
      .then((d) => setData(d.dailyUptime ?? null))
      .catch(() => {});
  }, []);

  const days: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }

  function cellClass(cell?: DayCell): string {
    if (!cell || cell.total === 0) return 'bg-zinc-800/70';
    const pct = (cell.ok / cell.total) * 100;
    if (pct >= 99.5) return 'bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.3)]';
    if (pct >= 90) return 'bg-orange-400/80 shadow-[0_0_6px_rgba(251,146,60,0.3)]';
    return 'bg-red-500/85 shadow-[0_0_6px_rgba(239,68,68,0.35)]';
  }

  function cellTitle(day: string, cell?: DayCell): string {
    if (!cell || cell.total === 0) return `${day} · ${t('heatmap.noData')}`;
    const pct = Math.round((cell.ok / cell.total) * 10000) / 100;
    return `${day} · ${pct}% (${cell.ok}/${cell.total})`;
  }

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('heatmap.title')}</h2>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500/80" /> {t('heatmap.legend.good')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-orange-400/80" /> {t('heatmap.legend.warn')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-red-500/85" /> {t('heatmap.legend.bad')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-zinc-800/70" /> {t('heatmap.noData')}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {(['vercel', 'netlify'] as const).map((platform) => (
          <div key={platform} className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider w-14 shrink-0">
              {platform}
            </span>
            <div className="flex flex-wrap gap-[3px]">
              {days.map((day) => {
                const cell = data?.[platform]?.[day];
                return (
                  <span
                    key={day}
                    title={cellTitle(day, cell)}
                    className={`w-3 h-3 rounded-[3px] transition-colors duration-300 ${cellClass(cell)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
