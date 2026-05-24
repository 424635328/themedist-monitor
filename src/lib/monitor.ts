import type { PerformanceLog, ThemeSnapshot, SystemAlert, TodayJsonResponse } from '@/types';
import { validateTodayJson } from './validator';
import { scanExtended } from './security';
import { addPerformanceLog, addThemeSnapshot, addSystemAlert, addMetricsEntry } from './store';
import { notifyAlert } from './notifier';
import { fetchWithProxy } from './fetch-proxy';
import { resolveAlert, getSystemAlerts } from './store';
import { kvGet, kvSet, kvHset, isKvConfigured } from './kv';
import { logSecurityIncident } from './security-logger';
import { isAlertCooling, setAlertCooldown } from './alert-cooldown';

const FAILURE_THRESHOLD = 3; // consecutive failures before alerting

async function trackFailure(platform: string, alertType: string): Promise<number> {
  if (!isKvConfigured()) return FAILURE_THRESHOLD; // no KV = always alert
  const key = `failure:${platform}:${alertType}`;
  const count = await kvGet<number>(key, 0);
  const next = count + 1;
  await kvSet(key, next);
  return next;
}

async function resetFailure(platform: string, alertType: string) {
  if (!isKvConfigured()) return;
  await kvSet(`failure:${platform}:${alertType}`, 0);
}

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
  const bustUrl = `${ENDPOINTS[platform]}?t=${Date.now()}`;
  const start = performance.now();

  try {
    const response = await fetchWithProxy(bustUrl, {
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
    const errorMsg = (err as Error).message;
    console.error(`[monitor] ${platform} fetch failed (${latencyMs}ms): ${errorMsg} | url=${bustUrl}`);
    return { platform, statusCode: 0, latencyMs, cacheStatus: 'UNKNOWN', error: errorMsg, data: null };
  }
}

async function checkDiyEndpoint(): Promise<DiyFetchResult> {
  const start = performance.now();
  try {
    const response = await fetchWithProxy(`${ENDPOINTS.diy}&t=${Date.now()}`, {
      headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
    });
    const latencyMs = Math.round(performance.now() - start);
    let data: unknown;
    try { data = await response.json(); } catch { data = null; }
    const isDegraded = response.status !== 200 || (Array.isArray(data) && data.length === 0);
    return { statusCode: response.status, latencyMs, data, isDegraded };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const errorMsg = (err as Error).message;
    console.error(`[monitor] diy fetch failed (${latencyMs}ms): ${errorMsg} | url=${ENDPOINTS.diy}`);
    return { statusCode: 0, latencyMs, data: null, isDegraded: true, error: errorMsg };
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
      error: result.error,
    };
    await addPerformanceLog(log);
    results.performanceLogs.push(log);

    // Auto-resolve old alerts when platform recovers
    if (result.statusCode === 200) {
      const existingAlerts = await getSystemAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'OUTAGE' && alert.platform === result.platform) {
          await resolveAlert(alert.id);
        }
      }
    }

    if (result.statusCode !== 200 && result.statusCode !== 0) {
      const count = await trackFailure(result.platform, 'OUTAGE');
      if (count >= FAILURE_THRESHOLD) {
        const alert: SystemAlert = {
          id: generateId(), timestamp: now, type: 'OUTAGE',
          platform: result.platform,
          message: `${result.platform} returned status ${result.statusCode} (failure #${count})`,
          details: `Endpoint: ${ENDPOINTS[result.platform]}, Response Time: ${result.latencyMs}ms`,
          resolved: false,
        };
        await addSystemAlert(alert);
        results.alerts.push(alert);
        const cooling = await isAlertCooling(`OUTAGE:${result.platform}`);
        if (!cooling) {
          const sent = await notifyAlert(alert);
          if (sent) results.notificationsSent++;
          await setAlertCooldown(`OUTAGE:${result.platform}`);
        }
      }
    }
    if (result.error) {
      const count = await trackFailure(result.platform, 'OUTAGE');
      if (count >= FAILURE_THRESHOLD) {
        const alert: SystemAlert = {
          id: generateId(), timestamp: now, type: 'OUTAGE',
          platform: result.platform,
          message: `${result.platform} unreachable: ${result.error} (failure #${count})`,
          details: `Endpoint: ${ENDPOINTS[result.platform]}`,
          resolved: false,
        };
        await addSystemAlert(alert);
        results.alerts.push(alert);
        const cooling = await isAlertCooling(`OUTAGE:${result.platform}`);
        if (!cooling) {
          const sent = await notifyAlert(alert);
          if (sent) results.notificationsSent++;
          await setAlertCooldown(`OUTAGE:${result.platform}`);
        }
      }
    }
    // Reset failure counter on successful response
    if (result.statusCode === 200) {
      await resetFailure(result.platform, 'OUTAGE');
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
    await addThemeSnapshot(snapshot);
    results.themeSnapshot = snapshot;

    if (!validation.valid) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'SCHEMA_MISMATCH',
        platform: 'both',
        message: 'Schema validation failed for /api/today.json',
        details: validation.errors.join('; '),
        resolved: false,
      };
      await addSystemAlert(alert);
      results.alerts.push(alert);
      const cooling = await isAlertCooling('SCHEMA_MISMATCH');
      if (!cooling) {
        const sent = await notifyAlert(alert);
        if (sent) results.notificationsSent++;
        await setAlertCooldown('SCHEMA_MISMATCH');
      }
    }

    // Auto-resolve old security/schema alerts when safe
    if (securityCheck.isSafe && validation.valid) {
      const existingAlerts = await getSystemAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && (alert.type === 'SECURITY_BREACH' || alert.type === 'SCHEMA_MISMATCH')) {
          await resolveAlert(alert.id);
        }
      }
    }

    if (!securityCheck.isSafe) {
      // Log each flagged reason as a security incident
      for (const reason of securityCheck.flaggedReasons) {
        await logSecurityIncident({
          type: 'XSS_ATTACK',
          field: 'root',
          payload: reason,
          ip: 'monitor-internal',
        });
      }

      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'SECURITY_BREACH',
        platform: 'both',
        message: "Security threat detected in today's theme!",
        details: securityCheck.flaggedReasons.join('; '),
        resolved: false,
      };
      await addSystemAlert(alert);
      results.alerts.push(alert);

      // Alert cooldown — don't spam the same security alert within 1 hour
      const cooling = await isAlertCooling('SECURITY_BREACH');
      if (!cooling) {
        const sent = await notifyAlert(alert);
        if (sent) results.notificationsSent++;
        await setAlertCooldown('SECURITY_BREACH');
      }
    }

    if (!validation.valid) {
      for (const err of validation.errors) {
        await logSecurityIncident({
          type: 'SCHEMA_MISMATCH',
          field: 'schema',
          payload: err,
          ip: 'monitor-internal',
        });
      }
    }
  }

  // Auto-resolve old DB_DOWN alerts when DIY endpoint is healthy
  if (!diyResult.isDegraded && !diyResult.error) {
    const existingAlerts = await getSystemAlerts();
    for (const alert of existingAlerts) {
      if (!alert.resolved && alert.type === 'DB_DOWN') {
        await resolveAlert(alert.id);
      }
    }
    await resetFailure('system', 'DB_DOWN');
  }

  // Check DB health via DIY endpoint
  if (diyResult.isDegraded && diyResult.statusCode === 200) {
    const count = await trackFailure('system', 'DB_DOWN');
    if (count >= FAILURE_THRESHOLD) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'DB_DOWN',
        platform: 'system',
        message: 'DIY themes endpoint returned empty results — possible Redis degradation',
        details: `Status: ${diyResult.statusCode}, Latency: ${diyResult.latencyMs}ms (failure #${count})`,
        resolved: false,
      };
      await addSystemAlert(alert);
      results.alerts.push(alert);
      const cooling = await isAlertCooling('DB_DOWN');
      if (!cooling) {
        const sent = await notifyAlert(alert);
        if (sent) results.notificationsSent++;
        await setAlertCooldown('DB_DOWN');
      }
    }
  }

  if (diyResult.error) {
    const count = await trackFailure('system', 'DB_DOWN');
    if (count >= FAILURE_THRESHOLD) {
      const alert: SystemAlert = {
        id: generateId(), timestamp: now, type: 'DB_DOWN',
        platform: 'system',
        message: 'DIY themes endpoint unreachable',
        details: diyResult.error + ` (failure #${count})`,
        resolved: false,
      };
      await addSystemAlert(alert);
      results.alerts.push(alert);
      const cooling = await isAlertCooling('DB_DOWN');
      if (!cooling) {
        const sent = await notifyAlert(alert);
        if (sent) results.notificationsSent++;
        await setAlertCooldown('DB_DOWN');
      }
    }
  }

  // Write status to Hash for fast Edge reads
  if (isKvConfigured()) {
    const hash: Record<string, string> = {};
    for (const result of [vercelResult, netlifyResult]) {
      hash[`${result.platform}:status`] = result.error ? 'outage' : result.statusCode === 200 ? 'online' : 'outage';
      hash[`${result.platform}:latency`] = String(result.latencyMs);
      hash[`${result.platform}:cache`] = result.cacheStatus;
    }
    hash['db:status'] = diyResult.isDegraded || diyResult.error ? 'degraded' : 'healthy';
    hash['checkedAt'] = now;
    for (const [field, value] of Object.entries(hash)) {
      await kvHset('hash:status', field, value);
    }
  }

  // Store metrics in Sorted Sets for historical trend queries
  const metricsTimestamp = Date.now();
  for (const result of [vercelResult, netlifyResult]) {
    await addMetricsEntry(result.platform, {
      latencyMs: result.latencyMs,
      isAvailable: result.statusCode === 200,
      timestamp: now,
    });
  }

  return results;
}
