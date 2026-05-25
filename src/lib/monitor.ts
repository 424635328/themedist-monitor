import type { PerformanceLog, ThemeSnapshot, SystemAlert, TodayJsonResponse } from '@/types';
import { validateTodayJson } from './validator';
import { scanExtended, scanThemeEntry } from './security';
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
    const isDegraded = response.status !== 200 || (Array.isArray(data) && data.length === 0) || data === null;
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
        // Deduplicate: skip if unresolved OUTAGE already exists for this platform
        const existingAlerts = await getSystemAlerts();
        const alreadyAlerted = existingAlerts.some(
          (a) => !a.resolved && a.type === 'OUTAGE' && a.platform === result.platform
        );

        if (!alreadyAlerted) {
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
    }
    if (result.error) {
      const count = await trackFailure(result.platform, 'OUTAGE');
      if (count >= FAILURE_THRESHOLD) {
        // Deduplicate: skip if unresolved OUTAGE already exists for this platform
        const existingAlerts = await getSystemAlerts();
        const alreadyAlerted = existingAlerts.some(
          (a) => !a.resolved && a.type === 'OUTAGE' && a.platform === result.platform
        );

        if (!alreadyAlerted) {
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
      const detailStr = validation.errors.join('; ');

      // Deduplicate: skip if same unresolved alert already exists
      const existingAlerts = await getSystemAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'SCHEMA_MISMATCH' && a.details === detailStr
      );

      if (!alreadyAlerted) {
        for (const err of validation.errors) {
          await logSecurityIncident({
            type: 'SCHEMA_MISMATCH',
            field: 'schema',
            payload: err,
            ip: 'monitor-internal',
          });
        }

        const alert: SystemAlert = {
          id: generateId(), timestamp: now, type: 'SCHEMA_MISMATCH',
          platform: 'both',
          message: `Schema validation failed: ${validation.errors.length} error(s)`,
          details: [
            detailStr,
            '—',
            'Remediation: Check themedist /api/today.json response structure.',
            'Ensure all required fields (date, preset, presetName, cssVars) are present.',
          ].join('\n'),
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
    }

    // Auto-resolve security alerts when scan is clean (regardless of schema)
    if (securityCheck.isSafe) {
      const existingAlerts = await getSystemAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'SECURITY_BREACH') {
          await resolveAlert(alert.id);
        }
      }
    }

    // Auto-resolve schema alerts when validation passes (regardless of security)
    if (validation.valid) {
      const existingAlerts = await getSystemAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'SCHEMA_MISMATCH') {
          await resolveAlert(alert.id);
        }
      }
    }

    if (!securityCheck.isSafe) {
      const detailStr = securityCheck.flaggedReasons.join('\n');
      const summary = securityCheck.flaggedReasons.length === 1
        ? securityCheck.flaggedReasons[0]
        : `${securityCheck.flaggedReasons.length} issues detected`;

      // Deduplicate: skip if same unresolved alert already exists
      const existingAlerts = await getSystemAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'SECURITY_BREACH' && a.details === detailStr
      );

      if (!alreadyAlerted) {
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
          message: `XSS scan: ${summary}`,
          details: [
            detailStr,
            '—',
            'Remediation: Review flagged themes in themedist admin dashboard.',
            'If false positive (e.g., "alert(" in a theme name): rename the theme entry.',
            'If real threat: remove the malicious content from the theme data source.',
          ].join('\n'),
          resolved: false,
        };
        await addSystemAlert(alert);
        results.alerts.push(alert);

        const cooling = await isAlertCooling('SECURITY_BREACH');
        if (!cooling) {
          const sent = await notifyAlert(alert);
          if (sent) results.notificationsSent++;
          await setAlertCooldown('SECURITY_BREACH');
        }
      }
    }

  }

  // Scan community/DIY themes for XSS in CSS & extensions
  // Uses KV cache to avoid re-scanning themes already known to be clean.
  // Full re-scan forced every 24 hours or when the cache key is invalidated.
  // DIY endpoint returns { themes: [...], total, dbAvailable } — extract the array.
  const diyThemes: Record<string, unknown>[] = (() => {
    if (Array.isArray(diyResult.data)) return diyResult.data as Record<string, unknown>[];
    if (diyResult.data && typeof diyResult.data === 'object') {
      const obj = diyResult.data as Record<string, unknown>;
      const arr = obj.themes || obj.data;
      if (Array.isArray(arr)) return arr as Record<string, unknown>[];
    }
    return [];
  })();

  if (diyThemes.length > 0) {
    const CACHE_KEY = 'cache:scan:community';
    const CACHE_TTL_KEY = 'cache:scan:community:full';
    const CACHE_TTL_SECONDS = 24 * 3600; // 24h full re-scan

    let scanCache: Record<string, string> = {};

    // Read KV scan cache; skip if no KV (local dev without credentials)
    if (isKvConfigured()) {
      const rawCache = await kvGet<string>(CACHE_KEY, '');
      if (rawCache) {
        try { scanCache = JSON.parse(rawCache); } catch { scanCache = {}; }
      }

      // Force full re-scan if TTL key expired
      const ttlExists = await kvGet<string>(CACHE_TTL_KEY, '');
      if (!ttlExists) {
        scanCache = {}; // clear cache → full re-scan
        await kvSet(CACHE_TTL_KEY, String(Date.now()), { ex: CACHE_TTL_SECONDS });
      }
    }

    const findings: NonNullable<ReturnType<typeof scanThemeEntry>>[] = [];
    const updatedCache: Record<string, string> = {};

    for (const t of diyThemes) {
      // DIY themes use "id" as the unique key (not "preset")
      const themeId = (t.id as string) || (t.preset as string) || '';
      // Skip if already scanned and clean (in cache with "ok")
      if (scanCache[themeId] === 'ok') {
        updatedCache[themeId] = 'ok';
        continue;
      }

      const result = scanThemeEntry({
        id: themeId,
        name: t.name as string,
        author: t.author as string,
        status: t.status as string,
        customCss: t.customCss as string,
        cssVars: t.cssVars as Record<string, string>,
        extensions: t.extensions as Array<{ type?: string; html?: string }>,
        createdAt: t.createdAt as number,
      });

      if (result) {
        findings.push(result);
        updatedCache[themeId] = 'flag';
      } else {
        updatedCache[themeId] = 'ok';
      }
    }

    // Persist updated cache
    if (isKvConfigured()) {
      await kvSet(CACHE_KEY, JSON.stringify(updatedCache));
    }

    if (findings.length > 0) {
      const presetList = findings.map((f) => f.id).join(', ');
      const lines = findings.map((f) => {
        const attackTypes = new Set<string>();
        for (const r of f.flaggedReasons) {
          if (r.includes('cssVars')) attackTypes.add('CSS变量注入');
          else if (r.includes('customCss')) attackTypes.add('CSS注入');
          else if (r.includes('extensions')) attackTypes.add('HTML注入');
          else if (r.includes('author')) attackTypes.add('作者字段注入');
        }
        const types = [...attackTypes].join('+') || '未知';
        const bypassInfo = f.bypassedSanitizers.length > 0
          ? `  绕过清洗  :\n${f.bypassedSanitizers.map((s) => `    ⚠ ${s}`).join('\n')}\n`
          : '';
        const authorInfo = f.author ? `  作者      : ${f.author.slice(0, 60)}\n` : '';
        const statusLabel = f.status === 'approved' ? '已批准 (可被轮换激活)'
          : f.status === 'pending' ? '待审核 (尚未生效)'
          : f.status === 'rejected' ? '已拒绝'
          : `未知 (${f.status || 'N/A'})`;
        const statusRisk = f.status === 'approved' ? '⚠ 高风险：该主题可能已被激活'
          : f.status === 'pending' ? 'ℹ 低风险：尚未通过审核，但仍需关注'
          : f.status === 'rejected' ? '✓ 已拒绝，不会生效'
          : '';
        const createdAtStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('zh-CN') : '';
        const createdAtInfo = createdAtStr ? `  提交日期  : ${createdAtStr}\n` : '';
        const statusInfo = `  状态      : ${statusLabel}\n`;
        return [
          `━━━ ${f.name} ━━━`,
          `  Theme ID  : ${f.id}`,
          statusInfo,
          createdAtInfo,
          authorInfo,
          `  攻击类型  : ${types}`,
          statusRisk ? `  风险评估  : ${statusRisk}\n` : '',
          bypassInfo,
          `  详情      :`,
          ...f.flaggedReasons.map((r) => `    • ${r}`),
          '',
        ].join('\n');
      });
      const sanitizerSummary = (() => {
        const allBypassed = new Set<string>();
        for (const f of findings) for (const s of f.bypassedSanitizers) allBypassed.add(s);
        return allBypassed.size > 0
          ? ` | ${allBypassed.size} sanitizer rule(s) bypassed`
          : '';
      })();
      const detailStr = lines.join('\n');
      const summary = `${findings.length} community themes (${presetList}) contain XSS payloads${sanitizerSummary}`;

      // Deduplicate
      const existingAlerts = await getSystemAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'SECURITY_BREACH' && a.platform === 'community' && a.details === detailStr
      );

      if (!alreadyAlerted) {
        for (const f of findings) {
          for (const reason of f.flaggedReasons) {
            await logSecurityIncident({
              type: 'XSS_ATTACK',
              field: `community:${f.id}`,
              payload: reason,
              ip: 'monitor-internal',
            });
          }
        }

        const alert: SystemAlert = {
          id: generateId(), timestamp: now, type: 'SECURITY_BREACH',
          platform: 'community',
          message: `Community theme scan: ${summary}`,
          details: [
            detailStr,
            '—',
            'Remediation:',
            '  1. Delete these themes via themedist admin or Redis (see IDs above).',
            '  2. Fix themedist submission sanitizer — these payloads bypassed documented rules.',
            '  3. The /api/diy/submit.json endpoint should strip on* events, <script>,',
            '     <iframe>, javascript:, expression(), @import, and url(http) from all fields.',
            '  4. Add JS function-call detection to author field validation (fetch/eval blocked).',
          ].join('\n'),
          resolved: false,
        };
        await addSystemAlert(alert);
        results.alerts.push(alert);

        const cooling = await isAlertCooling('SECURITY_BREACH:community');
        if (!cooling) {
          const sent = await notifyAlert(alert);
          if (sent) results.notificationsSent++;
          await setAlertCooldown('SECURITY_BREACH:community');
        }
      }
    } else {
      // Auto-resolve old community security alerts when scan is clean
      const existingAlerts = await getSystemAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'SECURITY_BREACH' && alert.platform === 'community') {
          await resolveAlert(alert.id);
        }
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
      const existingAlerts = await getSystemAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'DB_DOWN'
      );

      if (!alreadyAlerted) {
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
  }

  if (diyResult.error) {
    const count = await trackFailure('system', 'DB_DOWN');
    if (count >= FAILURE_THRESHOLD) {
      const existingAlerts = await getSystemAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'DB_DOWN'
      );

      if (!alreadyAlerted) {
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
  for (const result of [vercelResult, netlifyResult]) {
    await addMetricsEntry(result.platform, {
      latencyMs: result.latencyMs,
      isAvailable: result.statusCode === 200,
      timestamp: now,
    });
  }

  return results;
}
