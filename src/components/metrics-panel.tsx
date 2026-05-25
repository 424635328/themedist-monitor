'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { BarChart3, Timer, Layers } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface MetricsData {
  avgLatency24h: { vercel: number; netlify: number };
  cdnHitRate: number;
  themeCount: number;
  sla: { vercel: { d7: number; d30: number }; netlify: { d7: number; d30: number } };
}

interface PerfLog {
  timestamp: string;
  latencyMs: number;
  platform: string;
  cacheStatus: string;
}

interface ChartDataPoint {
  time: string;
  vercel?: number;
  netlify?: number;
}

export default function MetricsPanel() {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [logs, setLogs] = useState<PerfLog[]>([]);

  useEffect(() => {
    fetch('/api/v1/data')
      .then((r) => r.json())
      .then((data) => {
        setMetrics(data.metrics);
        setLogs(data.performanceLogs || []);
      })
      .catch(() => {});
  }, []);

  if (!metrics) {
    return (
      <div className="card animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{t('metrics.title')}</h2>
        </div>
        <div className="text-xs text-zinc-600 py-8 text-center">{t('metrics.loading')}</div>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = [];
  const timeBuckets = new Map<string, { vercel: number[]; netlify: number[] }>();

  for (const log of logs) {
    const date = new Date(log.timestamp);
    const key = `${date.getHours().toString().padStart(2, '0')}:${Math.floor(date.getMinutes() / 15) * 15}`;
    if (!timeBuckets.has(key)) timeBuckets.set(key, { vercel: [], netlify: [] });
    const bucket = timeBuckets.get(key)!;
    if (log.platform === 'vercel') bucket.vercel.push(log.latencyMs);
    else bucket.netlify.push(log.latencyMs);
  }

  const sortedKeys = Array.from(timeBuckets.keys()).sort();
  for (const key of sortedKeys) {
    const bucket = timeBuckets.get(key)!;
    const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    chartData.push({
      time: key,
      vercel: bucket.vercel.length > 0 ? avg(bucket.vercel) : undefined,
      netlify: bucket.netlify.length > 0 ? avg(bucket.netlify) : undefined,
    });
  }

  const pieData = [
    { name: 'HIT', value: metrics.cdnHitRate, color: '#22c55e' },
    { name: 'MISS', value: 100 - metrics.cdnHitRate, color: '#ef4444' },
  ];

  const themeHistory = logs
    .filter((l) => l.platform === 'vercel')
    .slice(-20)
    .map((l, i) => ({
      index: i,
      latency: l.latencyMs,
    }));

  return (
    <div className="card animate-fade-in animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">{t('metrics.title')}</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1a1a22] rounded-lg p-3 text-center">
          <Timer className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">
            {metrics.avgLatency24h.vercel || '-'}
            <span className="text-xs font-normal text-zinc-500">{t('metrics.ms')}</span>
          </div>
          <div className="text-xs text-zinc-500">{t('metrics.vercelAvg')}</div>
        </div>
        <div className="bg-[#1a1a22] rounded-lg p-3 text-center">
          <Timer className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">
            {metrics.avgLatency24h.netlify || '-'}
            <span className="text-xs font-normal text-zinc-500">{t('metrics.ms')}</span>
          </div>
          <div className="text-xs text-zinc-500">{t('metrics.netlifyAvg')}</div>
        </div>
        <div className="bg-[#1a1a22] rounded-lg p-3 text-center">
          <Layers className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-white">{metrics.themeCount}</div>
          <div className="text-xs text-zinc-500">{t('metrics.themes')}</div>
        </div>
      </div>

      {/* SLA Uptime */}
      <div className="mb-6">
        <div className="text-xs text-zinc-500 mb-3 font-medium tracking-wide uppercase">SLA 可用率</div>
        <div className="space-y-2.5">
          {(['vercel', 'netlify'] as const).map((platform) => {
            const d7 = metrics.sla[platform].d7;
            const d30 = metrics.sla[platform].d30;
            function slaHue(pct: number) { return Math.min((pct / 100) * 120, 120); }
            function slaBarBg(h: number, pct: number) {
              const s = pct >= 90 ? 65 : 75;
              const l = pct >= 90 ? 43 : 46;
              const gl = pct >= 90 ? 58 : 50;
              return { bg: `hsl(${h.toFixed(0)}, ${s}%, ${l}%)`, glow: `hsla(${h.toFixed(0)}, ${s}%, ${gl}%, 0.25)` };
            }
            function slaText(h: number, pct: number) {
              return `hsl(${h.toFixed(0)}, 80%, ${pct >= 90 ? 68 : 55}%)`;
            }
            return (
              <div key={platform} className="bg-[#1a1a22] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300 capitalize">{platform}</span>
                </div>
                {[{ label: '7 天', v: d7 }, { label: '30 天', v: d30 }].map(({ label, v }) => {
                  const h = slaHue(v);
                  const bar = slaBarBg(h, v);
                  return (
                  <div key={label} className="flex items-center gap-3 mb-1.5 last:mb-0">
                    <span className="text-[10px] text-zinc-500 w-8 text-right">{label}</span>
                    <div className="flex-1 h-2 bg-[#0d0d12] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(v, 100)}%`,
                          background: bar.bg,
                          boxShadow: v >= 90 ? `0 0 8px ${bar.glow}` : undefined,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono w-14" style={{ color: slaText(h, v) }}>{v}%</span>
                  </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-xs text-zinc-500 mb-2">{t('metrics.latencyTrend')}</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252530" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} unit="ms" />
              <Tooltip
                contentStyle={{
                  background: '#1a1a22',
                  border: '1px solid #252530',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e4e4e7',
                }}
              />
              <Line type="monotone" dataKey="vercel" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vercel" />
              <Line type="monotone" dataKey="netlify" stroke="#22c55e" strokeWidth={2} dot={false} name="Netlify" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-zinc-500 mb-2">{t('metrics.cdnHitRate')}</div>
          <div className="h-36 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1a1a22',
                    border: '1px solid #252530',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e4e4e7',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> {t('metrics.hit')} {metrics.cdnHitRate}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> {t('metrics.miss')} {100 - metrics.cdnHitRate}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-2">{t('metrics.responseTime')}</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={themeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252530" />
                <XAxis dataKey="index" tick={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} unit="ms" />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a22',
                    border: '1px solid #252530',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e4e4e7',
                  }}
                />
                <Area type="monotone" dataKey="latency" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
