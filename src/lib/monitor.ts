import type { PerformanceLog, ThemeSnapshot, SystemAlert, TodayJsonResponse, IndexDataResponse, TrendingEntry, AdminHealthResponse } from '@/types';
import { validateTodayJson, autoFixCssVars } from './validator';
import { scanExtended, scanThemeEntry } from './security';
import { addPerformanceLog, addThemeSnapshot, addSystemAlert, addMetricsEntry } from './store';
import { notifyAlert } from './notifier';
import { fetchWithProxy } from './fetch-proxy';
import { resolveAlert, getSystemAlerts } from './store';
import { kvGet, kvSet, kvHset, kvIncr, kvExpire, isKvConfigured } from './kv';
import { logSecurityIncident } from './security-logger';
import { isAlertCooling, setAlertCooldown } from './alert-cooldown';

const FAILURE_THRESHOLD = 3; // consecutive failures before alerting

async function trackFailure(platform: string, alertType: string): Promise<number> {
  if (!isKvConfigured()) return FAILURE_THRESHOLD; // no KV = always alert
  const key = `failure:${platform}:${alertType}`;
  const count = await kvIncr(key);
  await kvExpire(key, 3600); // 1 hour TTL to prevent stale counters
  return count;
}

async function resetFailure(platform: string, alertType: string) {
  if (!isKvConfigured()) return;
  await kvSet(`failure:${platform}:${alertType}`, 0);
}

const ENDPOINTS = {
  vercel: 'https://themedist.vercel.app/api/v1/today.json',
  netlify: 'https://themedist.netlify.app/api/v1/today.json',
  diy: 'https://themedist.netlify.app/api/v1/diy/themes.json?sort=new&page=1&size=20',
  indexData: 'https://themedist.netlify.app/api/v1/index-data.json',
  trending: 'https://themedist.netlify.app/api/v1/trending.json',
  adminHealth: 'https://themedist.netlify.app/api/v1/admin/health.json',
  events: 'https://themedist.netlify.app/api/v1/events',
  tokens: 'https://themedist.netlify.app/api/v1/tokens.json',
  weatherTheme: 'https://themedist.netlify.app/api/v1/weather-theme.json',
  todaySafe: 'https://themedist-monitor.vercel.app/api/v1/today-safe',
  todayCss: 'https://themedist.netlify.app/api/v1/today.css',
  favicon: 'https://themedist.netlify.app/api/v1/today/favicon.svg',
  fonts: 'https://themedist.netlify.app/api/v1/today/fonts.css',
  patterns: 'https://themedist.netlify.app/api/v1/today/pattern.css',
  colorSearch: 'https://themedist.netlify.app/api/v1/search/color.json?hex=ff8fa3&limit=5',
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

async function checkEndpoint(platform: 'vercel' | 'netlify'): Promise<FetchResult> {
  const bustUrl = `${ENDPOINTS[platform]}?t=${Date.now()}`;
  const start = performance.now();

  try {
    const response = await fetchWithProxy(bustUrl, {
      headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
      timeout: 10000,
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

interface SimpleFetchResult {
  statusCode: number;
  latencyMs: number;
  data: unknown;
  isDegraded?: boolean;
  error?: string;
}

async function checkSimpleEndpoint(url: string, opts?: { computeDegraded?: boolean }): Promise<SimpleFetchResult> {
  const start = performance.now();
  try {
    const response = await fetchWithProxy(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
      timeout: 10000,
    });
    const latencyMs = Math.round(performance.now() - start);
    let data: unknown;
    try { data = await response.json(); } catch { data = null; }
    const result: SimpleFetchResult = { statusCode: response.status, latencyMs, data };
    if (opts?.computeDegraded) {
      result.isDegraded = response.status !== 200 || (Array.isArray(data) && data.length === 0) || data === null;
    }
    return result;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const errorMsg = (err as Error).message;
    console.error(`[monitor] fetch failed (${latencyMs}ms): ${errorMsg} | url=${url}`);
    const result: SimpleFetchResult = { statusCode: 0, latencyMs, data: null, error: errorMsg };
    if (opts?.computeDegraded) result.isDegraded = true;
    return result;
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

  // Cache alerts for the duration of this run to avoid ~20 redundant KV round-trips
  let _alertsCache: SystemAlert[] | null = null;
  async function cachedAlerts(): Promise<SystemAlert[]> {
    if (!_alertsCache) _alertsCache = await getSystemAlerts();
    return _alertsCache;
  }

  const [vercelResult, netlifyResult, diyResult, indexResult, trendingResult, healthResult, eventsResult, tokensResult, weatherResult, todaySafeResult, todayCssResult, faviconResult, fontsResult, patternsResult, colorSearchResult] = await Promise.all([
    checkEndpoint('vercel'),
    checkEndpoint('netlify'),
    checkSimpleEndpoint(ENDPOINTS.diy, { computeDegraded: true }),
    checkSimpleEndpoint(ENDPOINTS.indexData),
    checkSimpleEndpoint(ENDPOINTS.trending),
    checkSimpleEndpoint(ENDPOINTS.adminHealth),
    checkSimpleEndpoint(ENDPOINTS.events),
    checkSimpleEndpoint(ENDPOINTS.tokens),
    checkSimpleEndpoint(ENDPOINTS.weatherTheme),
    checkSimpleEndpoint(ENDPOINTS.todaySafe),
    checkSimpleEndpoint(ENDPOINTS.todayCss),
    checkSimpleEndpoint(ENDPOINTS.favicon),
    checkSimpleEndpoint(ENDPOINTS.fonts),
    checkSimpleEndpoint(ENDPOINTS.patterns),
    checkSimpleEndpoint(ENDPOINTS.colorSearch),
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
      const existingAlerts = await cachedAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'OUTAGE' && alert.platform === result.platform) {
          await resolveAlert(alert.id);
        }
      }
    }

    // Detect outage: any non-200 status or fetch error
    const isOutage = result.statusCode !== 200 || !!result.error;
    if (isOutage) {
      const count = await trackFailure(result.platform, 'OUTAGE');
      if (count >= FAILURE_THRESHOLD) {
        const existingAlerts = await cachedAlerts();
        const alreadyAlerted = existingAlerts.some(
          (a) => !a.resolved && a.type === 'OUTAGE' && a.platform === result.platform
        );
        if (!alreadyAlerted) {
          const msg = result.error
            ? `${result.platform} unreachable: ${result.error} (failure #${count})`
            : `${result.platform} returned status ${result.statusCode} (failure #${count})`;
          const details = result.error
            ? `Endpoint: ${ENDPOINTS[result.platform]}`
            : `Endpoint: ${ENDPOINTS[result.platform]}, Response Time: ${result.latencyMs}ms`;
          const alert: SystemAlert = {
            id: generateId(), timestamp: now, type: 'OUTAGE',
            platform: result.platform, message: msg, details, resolved: false,
          };
          await addSystemAlert(alert);
          _alertsCache = null; // invalidate cache
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
    // Auto-fix cssVars when count is below MIN: sanitize values, derive missing vars, pad to threshold
    let autoFixed = false;
    let autoFixDetails: Array<{ key: string; action: string; detail: string }> | undefined;
    let dataForValidation = primaryData as TodayJsonResponse;
    if (dataForValidation.cssVars && typeof dataForValidation.cssVars === 'object') {
      const result = autoFixCssVars(dataForValidation);
      autoFixed = result.fixed;
      autoFixDetails = result.details;
      if (result.fixed) dataForValidation = result.data;
      for (const d of result.details) {
        if (d.action === 'sanitized') {
          await logSecurityIncident({
            type: 'XSS_ATTACK',
            field: `cssVars[${d.key}]`,
            payload: d.detail,
            ip: 'monitor-internal',
          });
        }
      }
    }

    const validation = validateTodayJson(dataForValidation);
    const securityCheck = scanExtended(primaryData as Record<string, unknown>);

    const themeData = primaryData as TodayJsonResponse;
    const snapshot: ThemeSnapshot = {
      id: generateId(),
      date: themeData.date || new Date().toISOString().split('T')[0],
      preset: themeData.preset || 'unknown',
      presetName: themeData.presetName || 'Unknown',
      author: themeData.author,
      themeCount: themeData.available ?? 0,
      isValidSchema: validation.valid || autoFixed,
      autoFixedSchema: autoFixed,
      autoFixedDetails: autoFixDetails,
      validationErrors: validation.valid ? undefined : validation.errors,
      securityStatus: securityCheck.isSafe ? 'safe' : 'unsafe',
      flaggedReasons: securityCheck.isSafe ? undefined : securityCheck.flaggedReasons,
      dailyIsCommunity: themeData.dailyIsCommunity ?? false,
      apiVersion: themeData.apiVersion,
      logoText: themeData.logoText ?? null,
      logoColors: themeData.logoColors ?? null,
      layerContext: themeData.layerContext,
      clickEffect: themeData.clickEffect ?? null,
      rawData: primaryData as Record<string, unknown>,
    };
    await addThemeSnapshot(snapshot);
    results.themeSnapshot = snapshot;

    if (!validation.valid) {
      // When auto-fixed, filter out cssVars-related errors — those were silently repaired
      const effectiveErrors = autoFixed
        ? validation.errors.filter((e) => !e.includes('cssVars'))
        : validation.errors;

      if (effectiveErrors.length > 0) {
        const detailStr = effectiveErrors.join('; ');

        // Deduplicate: skip if same unresolved alert already exists
        const existingAlerts = await cachedAlerts();
        const alreadyAlerted = existingAlerts.some(
          (a) => !a.resolved && a.type === 'SCHEMA_MISMATCH' && a.details === detailStr
        );

        if (!alreadyAlerted) {
          for (const err of effectiveErrors) {
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
            message: `Schema validation failed: ${effectiveErrors.length} error(s)`,
            details: [
              detailStr,
              '—',
              'Remediation: Check themedist /api/v1/today.json response structure.',
              'Ensure all required fields (date, preset, presetName, cssVars) are present.',
            ].join('\n'),
            resolved: false,
          };
          await addSystemAlert(alert);
          _alertsCache = null;
          results.alerts.push(alert);
          const cooling = await isAlertCooling('SCHEMA_MISMATCH');
          if (!cooling) {
            const sent = await notifyAlert(alert);
            if (sent) results.notificationsSent++;
            await setAlertCooldown('SCHEMA_MISMATCH');
          }
        }
      }
    }

    // Auto-resolve security alerts when scan is clean (regardless of schema)
    if (securityCheck.isSafe) {
      const existingAlerts = await cachedAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'SECURITY_BREACH') {
          await resolveAlert(alert.id);
        }
      }
    }

    // Auto-resolve schema alerts when validation passes (regardless of security)
    if (validation.valid) {
      const existingAlerts = await cachedAlerts();
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
      const existingAlerts = await cachedAlerts();
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
        _alertsCache = null;
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
        clickEffect: t.clickEffect as Record<string, unknown> | null | undefined,
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
      const existingAlerts = await cachedAlerts();
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
            '  3. The /api/v1/diy/submit.json endpoint should strip on* events, <script>,',
            '     <iframe>, javascript:, expression(), @import, and url(http) from all fields.',
            '  4. Add JS function-call detection to author field validation (fetch/eval blocked).',
          ].join('\n'),
          resolved: false,
        };
        await addSystemAlert(alert);
        _alertsCache = null;
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
      const existingAlerts = await cachedAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'SECURITY_BREACH' && alert.platform === 'community') {
          await resolveAlert(alert.id);
        }
      }
    }
  }

  // Process index-data.json probe
  const indexData = (indexResult.data && typeof indexResult.data === 'object')
    ? indexResult.data as IndexDataResponse : null;

  // Process admin/health.json probe — direct Redis status
  const healthData = (healthResult.data && typeof healthResult.data === 'object')
    ? healthResult.data as AdminHealthResponse : null;
  const redisConnected = healthData?.redis === 'connected';
  const redisPending = healthData?.pending ?? null;
  const redisApproved = healthData?.approved ?? null;

  // Process trending.json probe — confirms Redis write path
  let trendingOk = false;
  if (trendingResult.data && typeof trendingResult.data === 'object') {
    const t = trendingResult.data as { trending?: TrendingEntry[] };
    trendingOk = Array.isArray(t.trending) && t.trending.length > 0;
  }

  // Redis health alert: admin/health says redis !== "connected"
  if (healthResult.statusCode === 200 && healthData && !redisConnected) {
    const count = await trackFailure('system', 'DB_DOWN');
    if (count >= FAILURE_THRESHOLD) {
      const existingAlerts = await cachedAlerts();
      const alreadyAlerted = existingAlerts.some(
        (a) => !a.resolved && a.type === 'DB_DOWN'
      );
      if (!alreadyAlerted) {
        const alert: SystemAlert = {
          id: generateId(), timestamp: now, type: 'DB_DOWN',
          platform: 'system',
          message: `Redis disconnected (admin/health: "${healthData?.redis || 'N/A'}")`,
          details: `Redis status: ${healthData?.redis || 'N/A'}, Pending: ${redisPending ?? 'N/A'}, Approved: ${redisApproved ?? 'N/A'} (failure #${count})`,
          resolved: false,
        };
        await addSystemAlert(alert);
        _alertsCache = null;
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

  // Auto-resolve DB_DOWN when all three Redis signals are healthy
  const dbAllHealthy = !diyResult.isDegraded && !diyResult.error && redisConnected && trendingOk;
  if (dbAllHealthy) {
    const existingAlerts = await cachedAlerts();
    for (const alert of existingAlerts) {
      if (!alert.resolved && alert.type === 'DB_DOWN') {
        await resolveAlert(alert.id);
      }
    }
    await resetFailure('system', 'DB_DOWN');
  }

  // Theme freshness alert: fires after 3 consecutive stale-theme checks
  if (results.themeSnapshot?.date && /^\d{4}-\d{2}-\d{2}$/.test(results.themeSnapshot.date)) {
    const themeAge = Math.floor(
      (Date.now() - new Date(results.themeSnapshot.date + 'T00:00:00Z').getTime()) / (24 * 60 * 60 * 1000)
    );
    if (!Number.isFinite(themeAge) || themeAge > 3) {
      const count = await trackFailure('theme', 'THEME_STALE');
      if (count >= FAILURE_THRESHOLD) {
        const existingAlerts = await cachedAlerts();
        const alreadyAlerted = existingAlerts.some(
          (a) => !a.resolved && a.type === 'THEME_STALE'
        );
        if (!alreadyAlerted) {
          const alert: SystemAlert = {
            id: generateId(), timestamp: now, type: 'THEME_STALE',
            platform: 'system',
            message: `Theme is ${themeAge} days old (date: ${results.themeSnapshot.date})`,
            details: `Theme rotation has been stale for ${themeAge} days. Last known date: ${results.themeSnapshot.date}. Check themedist daily rotation cron.`,
            resolved: false,
          };
          await addSystemAlert(alert);
          _alertsCache = null;
          results.alerts.push(alert);
          const cooling = await isAlertCooling('THEME_STALE');
          if (!cooling) {
            const sent = await notifyAlert(alert);
            if (sent) results.notificationsSent++;
            await setAlertCooldown('THEME_STALE');
          }
        }
      }
    } else {
      // Theme is fresh — auto-resolve and reset counter
      await resetFailure('theme', 'THEME_STALE');
      const existingAlerts = await cachedAlerts();
      for (const alert of existingAlerts) {
        if (!alert.resolved && alert.type === 'THEME_STALE') {
          await resolveAlert(alert.id);
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
    const dbHealthy = !diyResult.isDegraded && !diyResult.error && redisConnected;
    hash['db:status'] = dbHealthy ? 'healthy' : 'degraded';
    hash['db:redis'] = healthData?.redis || 'unknown';
    if (redisPending !== null) hash['db:pending'] = String(redisPending);
    if (redisApproved !== null) hash['db:approved'] = String(redisApproved);
    hash['db:trending'] = trendingOk ? 'ok' : 'empty';
    hash['index:status'] = indexResult.statusCode === 200 && indexData?.pool ? 'ok' : 'stale';
    hash['index:totalThemes'] = indexData?.totalThemes ? String(indexData.totalThemes) : '0';
    hash['events:status'] = eventsResult.statusCode === 200 ? 'ok' : 'stale';
    hash['tokens:status'] = tokensResult.statusCode === 200 ? 'ok' : 'stale';
    hash['weather:status'] = weatherResult.statusCode === 200 ? 'ok' : 'stale';
    hash['today-safe:status'] = todaySafeResult.statusCode === 200 ? 'ok' : 'stale';
    hash['today-css:status'] = todayCssResult.statusCode === 200 ? 'ok' : 'stale';
    hash['favicon:status'] = faviconResult.statusCode === 200 ? 'ok' : 'stale';
    hash['fonts:status'] = fontsResult.statusCode === 200 ? 'ok' : 'stale';
    hash['patterns:status'] = patternsResult.statusCode === 200 ? 'ok' : 'stale';
    hash['color-search:status'] = colorSearchResult.statusCode === 200 ? 'ok' : 'stale';
    // Theme freshness
    const themeDate = results.themeSnapshot?.date || '';
    const themeAgeDays = themeDate
      ? Math.floor((Date.now() - new Date(themeDate + 'T00:00:00Z').getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const themeFresh = themeAgeDays !== null && themeAgeDays <= 3;
    if (themeDate) hash['theme:date'] = themeDate;
    if (themeAgeDays !== null) hash['theme:age'] = String(themeAgeDays);
    hash['theme:fresh'] = themeFresh ? 'ok' : 'stale';
    if (results.themeSnapshot) {
      hash['theme:presetName'] = results.themeSnapshot.presetName || 'Unknown';
      hash['theme:safe'] = results.themeSnapshot.securityStatus === 'safe' ? 'true' : 'false';
    }
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
