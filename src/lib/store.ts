import type { PerformanceLog, ThemeSnapshot, SystemAlert } from '@/types';
import fs from 'fs';
import path from 'path';
import {
  kvList, kvPush, kvZadd, kvZrangebyscore, kvZremrangebyscore,
  kvLpush, kvLtrim, kvLrange, kvDelete,
  kvHset, kvHgetall,
  isKvConfigured,
} from './kv';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'performance-logs.json');
const THEME_FILE = path.join(DATA_DIR, 'theme-snapshots.json');
const ALERTS_FILE = path.join(DATA_DIR, 'system-alerts.json');

// KV keys for new storage structure
const KV_ZSET_PERF = 'zset:perf';
const KV_ZSET_THEME = 'zset:theme';
const KV_LIST_ALERTS = 'list:alerts';
const KV_HASH_STATUS = 'hash:status';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // ignore corrupt files
  }
  return fallback;
}

function writeJSON<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Performance Logs ---

export async function getPerformanceLogs(): Promise<PerformanceLog[]> {
  if (isKvConfigured()) {
    // Sorted Set by timestamp score
    const now = Date.now();
    const since = now - 7 * 24 * 60 * 60 * 1000; // last 7 days
    const members = await kvZrangebyscore(KV_ZSET_PERF, since, now, 500);
    const logs: PerformanceLog[] = [];
    for (const m of members) {
      try {
        logs.push(JSON.parse(m.member) as PerformanceLog);
      } catch { /* skip corrupt entries */ }
    }
    return logs;
  }
  return readJSON<PerformanceLog[]>(PERF_FILE, []);
}

export async function addPerformanceLog(log: PerformanceLog) {
  if (isKvConfigured()) {
    const member = JSON.stringify(log);
    const score = new Date(log.timestamp).getTime();
    await kvZadd(KV_ZSET_PERF, member, score);
    return;
  }
  const logs = readJSON<PerformanceLog[]>(PERF_FILE, []);
  logs.push(log);
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  writeJSON(PERF_FILE, logs);
}

// --- Theme Snapshots ---

export async function getThemeSnapshots(): Promise<ThemeSnapshot[]> {
  if (isKvConfigured()) {
    // Sorted Set by date timestamp
    const members = await kvZrangebyscore(KV_ZSET_THEME, 0, Date.now(), 200);
    const snapshots: ThemeSnapshot[] = [];
    for (const m of members) {
      try {
        snapshots.push(JSON.parse(m.member) as ThemeSnapshot);
      } catch { /* skip corrupt entries */ }
    }
    return snapshots;
  }
  return readJSON<ThemeSnapshot[]>(THEME_FILE, []);
}

export async function addThemeSnapshot(snapshot: ThemeSnapshot) {
  if (isKvConfigured()) {
    const member = JSON.stringify(snapshot);
    const score = new Date(snapshot.date).getTime();
    await kvZadd(KV_ZSET_THEME, member, score);
    return;
  }
  const snapshots = readJSON<ThemeSnapshot[]>(THEME_FILE, []);
  snapshots.push(snapshot);
  if (snapshots.length > 200) snapshots.splice(0, snapshots.length - 200);
  writeJSON(THEME_FILE, snapshots);
}

// --- System Alerts ---

export async function getSystemAlerts(): Promise<SystemAlert[]> {
  if (isKvConfigured()) {
    const items = await kvLrange(KV_LIST_ALERTS, 0, 200);
    const alerts: SystemAlert[] = [];
    for (const item of items) {
      try {
        alerts.push(JSON.parse(item) as SystemAlert);
      } catch { /* skip corrupt entries */ }
    }
    return alerts;
  }
  return readJSON<SystemAlert[]>(ALERTS_FILE, []);
}

export async function addSystemAlert(alert: SystemAlert) {
  if (isKvConfigured()) {
    await kvLpush(KV_LIST_ALERTS, JSON.stringify(alert));
    // Cap at 200 entries
    await kvLtrim(KV_LIST_ALERTS, 0, 199);
    return;
  }
  const alerts = readJSON<SystemAlert[]>(ALERTS_FILE, []);
  alerts.push(alert);
  if (alerts.length > 200) alerts.splice(0, alerts.length - 200);
  writeJSON(ALERTS_FILE, alerts);
}

export async function resolveAlert(alertId: string) {
  if (isKvConfigured()) {
    // With List storage, we need to rebuild with resolved flag
    const items = await kvLrange(KV_LIST_ALERTS, 0, 199);
    const updated: string[] = [];
    for (const item of items) {
      try {
        const alert = JSON.parse(item) as SystemAlert;
        if (alert.id === alertId) alert.resolved = true;
        updated.push(JSON.stringify(alert));
      } catch {
        updated.push(item);
      }
    }
    // Rebuild list: delete and re-push
    await kvDelete(KV_LIST_ALERTS);
    for (let i = updated.length - 1; i >= 0; i--) {
      await kvLpush(KV_LIST_ALERTS, updated[i]);
    }
    await kvLtrim(KV_LIST_ALERTS, 0, 199);
    return;
  }
  const alerts = readJSON<SystemAlert[]>(ALERTS_FILE, []);
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx !== -1) {
    alerts[idx].resolved = true;
    writeJSON(ALERTS_FILE, alerts);
  }
}

// --- Status Hash (for fast edge reads) ---

export async function setStatusHash(data: Record<string, string>) {
  if (!isKvConfigured()) return;
  for (const [field, value] of Object.entries(data)) {
    await kvHset(KV_HASH_STATUS, field, value);
  }
}

export async function getStatusHash(): Promise<Record<string, string> | null> {
  return kvHgetall<Record<string, string>>(KV_HASH_STATUS);
}

// --- Metrics Sorted Sets (historical trends) ---

export interface MetricsEntry {
  latencyMs: number;
  isAvailable: boolean;
  timestamp: string;
}

const METRICS_ZSET_PREFIX = 'metrics';

const METRICS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function addMetricsEntry(platform: string, entry: MetricsEntry) {
  if (!isKvConfigured()) return;
  const key = `${METRICS_ZSET_PREFIX}:${platform}`;
  const score = new Date(entry.timestamp).getTime();
  await kvZadd(key, JSON.stringify(entry), score);

  // Clean up entries older than 7 days
  const cutoff = Date.now() - METRICS_RETENTION_MS;
  await kvZremrangebyscore(key, 0, cutoff);
}

export async function getMetricsHistory(
  platform: string,
  sinceMs: number,
  untilMs?: number
): Promise<MetricsEntry[]> {
  if (!isKvConfigured()) return [];
  const key = `${METRICS_ZSET_PREFIX}:${platform}`;
  const members = await kvZrangebyscore(key, sinceMs, untilMs ?? Date.now(), 500);
  const entries: MetricsEntry[] = [];
  for (const m of members) {
    try {
      entries.push(JSON.parse(m.member) as MetricsEntry);
    } catch { /* skip corrupt entries */ }
  }
  return entries;
}
