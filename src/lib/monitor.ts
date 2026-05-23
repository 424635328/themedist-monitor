import type { PerformanceLog, ThemeSnapshot, SystemAlert, TodayJsonResponse } from '@/types';
import { validateTodayJson } from './validator';
import { scanExtended } from './security';
import { addPerformanceLog, addThemeSnapshot, addSystemAlert } from './store';
import { notifyAlert } from './notifier';
import { fetchWithProxy } from './fetch-proxy';

const ENDPOINTS = {
  vercel: 'https://themedist.vercel.app/api/today.json',
  netlify: 'https://themedist.netlify.app/api/today.json',
  diy: 'https://themedist.netlify.app/api/diy/themes.json?sort=new&page=1&size=20',
};

interface FetchResult {
  platform: 'vercel' | 'netlify';
  statusCode: number;
  latencyMs: number;
  cacheStatus: PerformanceLog['cacheStatus'];
  cacheControl?: string;
  data: unknown;
  error?: string;
}

interface DiyFetchResult {
  statusCode: number;
  latencyMs: number;
  data: unknown;
  isDegraded: boolean;
  error?: string;
}

async function checkEndpoint(platform: 'vercel' | 'netlify'): Promise<FetchResult> {
  const url = ENDPOINTS[platform];
  const start = performance.now();

  try {
    const response = await fetchWithProxy(url, {
      headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
    });
    const latencyMs = Math.round(performance.now() - start);
    const cacheControl = response.headers.get('cache-control') || undefined;

    let cacheStatus: PerformanceLog['cacheStatus'] = 'UNKNOWN';
    const vercelCache = response.headers.get('x-vercel-cache');
    if (vercelCache) {
      cacheStatus = vercelCache.toUpperCase() as PerformanceLog['cacheStatus'];
    }
    const nfCache = response.headers.get('x-nf-request-id');
    if (nfCache) {
      cacheStatus = response.headers.get('age') ? 'HIT' : 'MISS';
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return { platform, statusCode: response.status, latencyMs, cacheStatus, cacheControl, data };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { platform, statusCode: 0, latencyMs, cacheStatus: 'UNKNOWN', error: (err as Error).message, data: null };
  }
}

async function checkDiyEndpoint(): Promise<DiyFetchResult> {
  const start = performance.now();
  try {
    const response = await fetchWithProxy(ENDPOINTS.diy, {
      headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
    });
    const latencyMs = Math.round(performance.now() - start);
    let data: unknown;
    try { data = await response.json(); } catch { data = null; }
    const isDegraded = response.status !== 200 || (Array.isArray(data) && data.length === 0);
    return { statusCode: response.status, latencyMs, data, isDegraded };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { statusCode: 0, latencyMs, data: null, isDegraded: true, error: (err as Error).message };
  }
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function runAllChecks() {
  const now = new Date().toISOString();
  const results: {
    performanceLogs: PerformanceLog[];
    themeSnapshot: ThemeSnapshot | null;
    alerts: SystemAlert[];
    notificationsSent: number;
  } = { performanceLogs: [], themeSnapshot: null, alerts: [], notificationsSent: 0 };

  const [vercelResult, netlifyResult, diyResult] = await Promise.all([
    checkEndpoint('vercel'),
    checkEndpoint('netlify'),
    checkDiyEndpoint(),
  ]);

  // Store performance logs
  for (const result of [vercelResult, netlifyResult]) {
    const log: PerformanceLog = {
      id: generateId(),
      timestamp: now,
      platform: result.platform,
      endpoint: ENDPOINTS[result.platform],
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      cacheStatus: result.cacheStatus,
      cacheControl: result.cacheControl,
    };
    addPerformanceLog(log);
    results.performanceLogs.push(log);

    if (result.statusCode !== 200 && result.statusCode !== 0) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'OUTAGE',
        platform: result.platform,
        message: `${result.platform} returned status ${result.statusCode}`,
        details: `Endpoint: ${ENDPOINTS[result.platform]}, Response Time: ${result.latencyMs}ms`,
        resolved: false,
      };
      addSystemAlert(alert);
      results.alerts.push(alert);
      const sent = await notifyAlert(alert);
      if (sent) results.notificationsSent++;
    }
    if (result.error) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'OUTAGE',
        platform: result.platform,
        message: `${result.platform} unreachable: ${result.error}`,
        details: `Endpoint: ${ENDPOINTS[result.platform]}`,
        resolved: false,
      };
      addSystemAlert(alert);
      results.alerts.push(alert);
      const sent = await notifyAlert(alert);
      if (sent) results.notificationsSent++;
    }
  }

  // Validate and audit Vercel data (primary)
  const primaryData = vercelResult.data || netlifyResult.data;
  if (primaryData) {
    const validation = validateTodayJson(primaryData);
    const securityCheck = scanExtended(primaryData as Record<string, unknown>);

    const themeData = primaryData as TodayJsonResponse;
    const snapshot: ThemeSnapshot = {
      id: generateId(),
      date: themeData.date || new Date().toISOString().split('T')[0],
      preset: themeData.preset || 'unknown',
      presetName: themeData.presetName || 'Unknown',
      author: themeData.author,
      themeCount: themeData.available ?? 0,
      isValidSchema: validation.valid,
      validationErrors: validation.valid ? undefined : validation.errors,
      securityStatus: securityCheck.isSafe ? 'safe' : 'unsafe',
      flaggedReasons: securityCheck.isSafe ? undefined : securityCheck.flaggedReasons,
      rawData: primaryData as Record<string, unknown>,
    };
    addThemeSnapshot(snapshot);
    results.themeSnapshot = snapshot;

    if (!validation.valid) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'SCHEMA_MISMATCH',
        platform: 'both',
        message: 'Schema validation failed for /api/today.json',
        details: validation.errors.join('; '),
        resolved: false,
      };
      addSystemAlert(alert);
      results.alerts.push(alert);
    }

    if (!securityCheck.isSafe) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'SECURITY_BREACH',
        platform: 'both',
        message: "Security threat detected in today's theme!",
        details: securityCheck.flaggedReasons.join('; '),
        resolved: false,
      };
      addSystemAlert(alert);
      results.alerts.push(alert);
      const sent = await notifyAlert(alert);
      if (sent) results.notificationsSent++;
    }
  }

  // Check DB health via DIY endpoint
  if (diyResult.isDegraded && diyResult.statusCode === 200) {
    const alert: SystemAlert = {
      id: generateId(), timestamp: now, type: 'DB_DOWN',
      platform: 'system',
      message: 'DIY themes endpoint returned empty results — possible Redis degradation',
      details: `Status: ${diyResult.statusCode}, Latency: ${diyResult.latencyMs}ms`,
      resolved: false,
    };
    addSystemAlert(alert);
    results.alerts.push(alert);
    const sent = await notifyAlert(alert);
    if (sent) results.notificationsSent++;
  }

  if (diyResult.error) {
    const alert: SystemAlert = {
      id: generateId(), timestamp: now, type: 'DB_DOWN',
      platform: 'system',
      message: 'DIY themes endpoint unreachable',
      details: diyResult.error,
      resolved: false,
    };
    addSystemAlert(alert);
    results.alerts.push(alert);
    const sent = await notifyAlert(alert);
    if (sent) results.notificationsSent++;
  }

  return results;
}
