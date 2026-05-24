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
    fetch('/api/data')
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
        <div className="text-xs text-zinc-500 mb-2">SLA 可用率</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a22] rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Vercel</div>
            <div className="flex items-end gap-3">
              <div>
                <div className="text-[10px] text-zinc-600">7 天</div>
                <div className={`text-lg font-bold ${metrics.sla.vercel.d7 >= 99.9 ? 'text-green-400' : metrics.sla.vercel.d7 >= 99 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.sla.vercel.d7}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-600">30 天</div>
                <div className={`text-lg font-bold ${metrics.sla.vercel.d30 >= 99.9 ? 'text-green-400' : metrics.sla.vercel.d30 >= 99 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.sla.vercel.d30}%
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a22] rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Netlify</div>
            <div className="flex items-end gap-3">
              <div>
                <div className="text-[10px] text-zinc-600">7 天</div>
                <div className={`text-lg font-bold ${metrics.sla.netlify.d7 >= 99.9 ? 'text-green-400' : metrics.sla.netlify.d7 >= 99 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.sla.netlify.d7}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-600">30 天</div>
                <div className={`text-lg font-bold ${metrics.sla.netlify.d30 >= 99.9 ? 'text-green-400' : metrics.sla.netlify.d30 >= 99 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.sla.netlify.d30}%
                </div>
              </div>
            </div>
          </div>
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
