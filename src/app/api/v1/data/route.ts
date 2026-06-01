import { NextResponse } from 'next/server';
import { getPerformanceLogs, getThemeSnapshots, getSystemAlerts, getMetricsHistory, getStatusHash } from '@/lib/store';
import { getRecentIncidents } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = await getPerformanceLogs();
  const snapshots = await getThemeSnapshots();
  const alerts = await getSystemAlerts();

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // Current status determination — filter per platform, take latest
  const vercelLogs = logs.filter((l) => l.platform === 'vercel');
  const netlifyLogs = logs.filter((l) => l.platform === 'netlify');
  const vercelLatest = vercelLogs.length > 0 ? vercelLogs[vercelLogs.length - 1] : null;
  const netlifyLatest = netlifyLogs.length > 0 ? netlifyLogs[netlifyLogs.length - 1] : null;

  const hasAnyData = logs.length > 0;

  function getPlatformStatus(log: typeof vercelLatest): 'online' | 'slow' | 'outage' | 'no_data' {
    if (!log && !hasAnyData) return 'no_data';
    if (!log || log.statusCode === 0) return 'outage';
    if (log.statusCode !== 200) return 'outage';
    if (log.latencyMs > 3500) return 'slow';
    return 'online';
  }

  // CDN hit rate
  const todayLogs = logs.filter((l) =>
    l.timestamp.startsWith(new Date().toISOString().slice(0, 10))
  );
  const hits = todayLogs.filter((l) => l.cacheStatus === 'HIT').length;
  const total = todayLogs.filter((l) => l.cacheStatus !== 'UNKNOWN').length;
  const cdnHitRate = total > 0 ? Math.round((hits / total) * 100) : 0;

  // Average latency per platform for last 24h
  const last24h = logs.filter(
    (l) => Date.now() - new Date(l.timestamp).getTime() < 24 * 60 * 60 * 1000
  );
  function avgLatency(platform: string) {
    const platLogs = last24h.filter((l) => l.platform === platform);
    if (platLogs.length === 0) return 0;
    return Math.round(
      platLogs.reduce((sum, l) => sum + l.latencyMs, 0) / platLogs.length
    );
  }

  // DB health — read from status hash (written by monitor.ts)
  // Returns null when the monitor hasn't run yet — no guessing.
  const statusHash = await getStatusHash();
  const dbStatus = statusHash?.['db:status'] ?? null;
  const dbRedis = statusHash?.['db:redis'] ?? null;
  const dbPending: number | null = statusHash?.['db:pending'] ? parseInt(statusHash['db:pending'], 10) : null;
  const dbApproved: number | null = statusHash?.['db:approved'] ? parseInt(statusHash['db:approved'], 10) : null;

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const recentAlerts = alerts.slice(0, 20);

  // SLA calculation: 7-day and 30-day
  function calcSla(platform: string, days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const platLogs = logs.filter((l) => l.platform === platform && new Date(l.timestamp).getTime() > cutoff);
    if (platLogs.length === 0) return 100;
    const okCount = platLogs.filter((l) => l.statusCode === 200).length;
    return Math.round((okCount / platLogs.length) * 10000) / 100; // 2 decimal places
  }

  const sla = {
    vercel: { d7: calcSla('vercel', 7), d30: calcSla('vercel', 30) },
    netlify: { d7: calcSla('netlify', 7), d30: calcSla('netlify', 30) },
  };

  // Fetch metrics history from sorted sets (last 24h)
  const metricsSince = Date.now() - 24 * 60 * 60 * 1000;
  const [vercelMetrics, netlifyMetrics, securityIncidents] = await Promise.all([
    getMetricsHistory('vercel', metricsSince),
    getMetricsHistory('netlify', metricsSince),
    getRecentIncidents(50),
  ]);

  return NextResponse.json({
    status: {
      vercel: { status: getPlatformStatus(vercelLatest), latencyMs: vercelLatest?.latencyMs ?? null },
      netlify: { status: getPlatformStatus(netlifyLatest), latencyMs: netlifyLatest?.latencyMs ?? null },
      db: dbStatus,
      dbRedis,
      dbPending,
      dbApproved,
    },
    metrics: {
      avgLatency24h: { vercel: avgLatency('vercel'), netlify: avgLatency('netlify') },
      cdnHitRate,
      themeCount: latestSnapshot?.themeCount ?? 0,
      sla,
    },
    metricsHistory: {
      vercel: vercelMetrics,
      netlify: netlifyMetrics,
    },
    performanceLogs: last24h.slice(-100),
    latestSnapshot,
    alerts: {
      unresolved: unresolvedAlerts,
      recent: recentAlerts,
    },
    securityIncidents,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
