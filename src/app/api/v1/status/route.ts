import { NextResponse } from 'next/server';
import {
  kvZrangebyscore, kvLrange, kvHgetall,
  isKvConfigured,
} from '@/lib/kv';

export const runtime = 'edge';

const KV_ZSET_PERF = 'zset:perf';
const KV_ZSET_THEME = 'zset:theme';
const KV_LIST_ALERTS = 'list:alerts';
const KV_HASH_STATUS = 'hash:status';

interface PerfLog { platform: string; statusCode: number; latencyMs: number; cacheStatus: string; timestamp: string; error?: string; }
interface ThemeSnap { date: string; presetName: string; themeCount: number; securityStatus: string; }

export async function GET() {
  if (!isKvConfigured()) {
    return NextResponse.json({
      overall: 'unknown' as const,
      platforms: {
        vercel: { status: 'unknown' as const, latencyMs: null, cacheStatus: 'UNKNOWN' },
        netlify: { status: 'unknown' as const, latencyMs: null, cacheStatus: 'UNKNOWN' },
      },
      theme: null,
      checkedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  const now = Date.now();
  const since = now - 24 * 60 * 60 * 1000;

  const [perfMembers, snapshotMembers, alerts, statusHash] = await Promise.all([
    kvZrangebyscore(KV_ZSET_PERF, since, now, 100),
    kvZrangebyscore(KV_ZSET_THEME, 0, now, 10),
    kvLrange(KV_LIST_ALERTS, 0, 50),
    kvHgetall<Record<string, string>>(KV_HASH_STATUS),
  ]);

  const perfLogs: PerfLog[] = [];
  for (const m of perfMembers) {
    try { perfLogs.push((typeof m === 'string' ? JSON.parse(m) : m) as PerfLog); } catch { /* skip */ }
  }
  const snapshots: ThemeSnap[] = [];
  for (const m of snapshotMembers) {
    try { snapshots.push((typeof m === 'string' ? JSON.parse(m) : m) as ThemeSnap); } catch { /* skip */ }
  }

  // Latest per platform
  const vercelLogs = perfLogs.filter(l => l.platform === 'vercel');
  const netlifyLogs = perfLogs.filter(l => l.platform === 'netlify');
  const vercelLatest = vercelLogs.length > 0 ? vercelLogs[vercelLogs.length - 1] : null;
  const netlifyLatest = netlifyLogs.length > 0 ? netlifyLogs[netlifyLogs.length - 1] : null;

  function platformStatus(log: PerfLog | null): 'online' | 'slow' | 'outage' | 'unknown' {
    if (!log || log.statusCode === 0) return 'outage';
    if (log.statusCode !== 200) return 'outage';
    if (log.latencyMs > 3500) return 'slow';
    return 'online';
  }

  const vercelStatus = platformStatus(vercelLatest);
  const netlifyStatus = platformStatus(netlifyLatest);

  let overall: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown';
  if (vercelStatus === 'outage' || netlifyStatus === 'outage') {
    overall = 'down';
  } else if (vercelStatus === 'slow' || netlifyStatus === 'slow') {
    overall = 'degraded';
  } else if (vercelStatus === 'online' && netlifyStatus === 'online') {
    overall = 'healthy';
  }

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // Theme freshness: flag if theme date is older than 3 days
  const themeAge = latestSnapshot?.date
    ? Math.floor((now - new Date(latestSnapshot.date + 'T00:00:00Z').getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const themeFresh = themeAge !== null && themeAge <= 3;

  // Extract Redis health details from status hash
  const dbRedis = statusHash?.['db:redis'] ?? 'unknown';
  const dbPending = statusHash?.['db:pending'] ? parseInt(statusHash['db:pending'], 10) : null;
  const dbApproved = statusHash?.['db:approved'] ? parseInt(statusHash['db:approved'], 10) : null;

  return NextResponse.json({
    overall,
    platforms: {
      vercel: {
        status: vercelStatus,
        latencyMs: vercelLatest?.latencyMs ?? null,
        cacheStatus: vercelLatest?.cacheStatus ?? 'UNKNOWN',
        error: vercelLatest?.error ?? null,
      },
      netlify: {
        status: netlifyStatus,
        latencyMs: netlifyLatest?.latencyMs ?? null,
        cacheStatus: netlifyLatest?.cacheStatus ?? 'UNKNOWN',
        error: netlifyLatest?.error ?? null,
      },
    },
    theme: latestSnapshot
      ? {
          date: latestSnapshot.date,
          presetName: latestSnapshot.presetName,
          themeCount: latestSnapshot.themeCount,
          isSafe: latestSnapshot.securityStatus === 'safe',
          ageDays: themeAge,
          isFresh: themeFresh,
        }
      : null,
    database: {
      status: dbRedis,
      pending: dbPending,
      approved: dbApproved,
    },
    endpoints: {
      events: statusHash?.['events:status'] ?? 'unknown',
      tokens: statusHash?.['tokens:status'] ?? 'unknown',
      weather: statusHash?.['weather:status'] ?? 'unknown',
      todaySafe: statusHash?.['today-safe:status'] ?? 'unknown',
      todayCss: statusHash?.['today-css:status'] ?? 'unknown',
      favicon: statusHash?.['favicon:status'] ?? 'unknown',
      fonts: statusHash?.['fonts:status'] ?? 'unknown',
      patterns: statusHash?.['patterns:status'] ?? 'unknown',
      colorSearch: statusHash?.['color-search:status'] ?? 'unknown',
    },
    checkedAt: vercelLatest?.timestamp ?? netlifyLatest?.timestamp ?? new Date().toISOString(),
    _edgeHash: statusHash,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
