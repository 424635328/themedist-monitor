import type { PerformanceLog, HourlyAggregate, DailyAggregate } from '@/types';
import { getPerformanceLogs } from './store';
import { kvGet, kvSet, kvDelete, kvPush, kvList } from './kv';

const KV_KEY_HOURLY = 'aggregation:hourly';
const KV_KEY_DAILY = 'aggregation:daily';

function getHourKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcPercentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function aggregateLogs(logs: PerformanceLog[], hourKey: string): HourlyAggregate[] {
  const platforms = ['vercel', 'netlify'] as const;

  return platforms.map((platform) => {
    const platLogs = logs.filter((l) => l.platform === platform);
    const latencies = platLogs.map((l) => l.latencyMs).sort((a, b) => a - b);
    const okCount = platLogs.filter((l) => l.statusCode === 200).length;
    const hitCount = platLogs.filter((l) => l.cacheStatus === 'HIT').length;
    const cacheTotal = platLogs.filter((l) => l.cacheStatus !== 'UNKNOWN').length;

    return {
      hour: hourKey,
      platform,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      maxLatencyMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      minLatencyMs: latencies.length > 0 ? latencies[0] : 0,
      p95LatencyMs: calcPercentile(latencies, 95),
      requestCount: platLogs.length,
      availabilityPct: platLogs.length > 0 ? Math.round((okCount / platLogs.length) * 100) : 100,
      cacheHitRate: cacheTotal > 0 ? Math.round((hitCount / cacheTotal) * 100) : 0,
    };
  });
}

export async function runHourlyAggregation(): Promise<HourlyAggregate[]> {
  const logs = getPerformanceLogs();
  const hourKey = getHourKey(new Date());

  const existing = await kvGet<HourlyAggregate[]>(`${KV_KEY_HOURLY}:${hourKey}`, []);
  if (existing.length > 0) return existing; // already aggregated

  const aggregated = aggregateLogs(logs, hourKey);
  await kvSet(`${KV_KEY_HOURLY}:${hourKey}`, aggregated);

  // Clean up: keep only last 7 days of hourly data (168 entries)
  const hourlyKeys = await kvList<string>(`${KV_KEY_HOURLY}:index`, []);
  hourlyKeys.push(hourKey);
  const trimmedKeys = hourlyKeys.slice(-168);
  await kvSet(`${KV_KEY_HOURLY}:index`, trimmedKeys);

  return aggregated;
}

export async function runDailyAggregation(): Promise<DailyAggregate[]> {
  const now = new Date();
  const dateKey = getDateKey(now);
  const todayHourKeys: string[] = [];

  // Aggregate all hours of yesterday into a daily record
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = getDateKey(yesterday);

  // Get all hourly data for yesterday
  const allHourly = await kvGet<Record<string, HourlyAggregate[]>>(`${KV_KEY_HOURLY}:all`, {});
  const yHours = Object.entries(allHourly).filter(([k]) => k.startsWith(yKey));

  if (yHours.length === 0) return [];

  // Compute daily aggregates per platform
  const platforms = ['vercel', 'netlify'] as const;
  const dailyAggs: DailyAggregate[] = platforms.map((platform) => {
    const platHours = yHours
      .flatMap(([, vals]) => vals)
      .filter((h) => h.platform === platform);

    if (platHours.length === 0) {
      return { date: yKey, platform, avgLatencyMs: 0, maxLatencyMs: 0, minLatencyMs: 0, p95LatencyMs: 0, requestCount: 0, availabilityPct: 100, cacheHitRate: 0 };
    }

    return {
      date: yKey,
      platform,
      avgLatencyMs: Math.round(platHours.reduce((s, h) => s + h.avgLatencyMs, 0) / platHours.length),
      maxLatencyMs: Math.max(...platHours.map((h) => h.maxLatencyMs)),
      minLatencyMs: Math.min(...platHours.map((h) => h.minLatencyMs)),
      p95LatencyMs: Math.round(platHours.reduce((s, h) => s + h.p95LatencyMs, 0) / platHours.length),
      requestCount: platHours.reduce((s, h) => s + h.requestCount, 0),
      availabilityPct: Math.round(platHours.reduce((s, h) => s + h.availabilityPct, 0) / platHours.length),
      cacheHitRate: Math.round(platHours.reduce((s, h) => s + h.cacheHitRate, 0) / platHours.length),
    };
  });

  await kvSet(`${KV_KEY_DAILY}:${yKey}`, dailyAggs);

  // Retain only last 90 days of daily data
  const dailyKeys = await kvList<string>(`${KV_KEY_DAILY}:index`, []);
  dailyKeys.push(yKey);
  const trimmed = dailyKeys.slice(-90);
  await kvSet(`${KV_KEY_DAILY}:index`, trimmed);

  return dailyAggs;
}
