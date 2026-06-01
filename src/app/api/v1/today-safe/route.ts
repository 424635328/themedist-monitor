import { NextRequest, NextResponse } from 'next/server';
import { sanitizeObject, scanExtended } from '@/lib/security';
import { validateTodayJson } from '@/lib/validator';
import { fetchWithProxy } from '@/lib/fetch-proxy';
import { kvGet, kvSet, isKvConfigured } from '@/lib/kv';
import { logSecurityIncident } from '@/lib/security-logger';
import { isBlocked } from '@/lib/ip-blocker';
import { corsHeaders } from '@/lib/cors';

const KV_KEY_LAST_SAFE = 'theme:last_safe';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Block known malicious IPs
  if (await isBlocked(clientIp)) {
    return new NextResponse('Access Denied — security policy', { status: 403, headers: corsHeaders() });
  }

  const errors: string[] = [];
  let rawData: Record<string, unknown> | null = null;

  for (const platform of ['vercel', 'netlify'] as const) {
    const urls = {
      vercel: 'https://themedist.vercel.app/api/v1/today.json',
      netlify: 'https://themedist.netlify.app/api/v1/today.json',
    };

    try {
      const res = await fetchWithProxy(urls[platform], {
        headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
      });
      const data = await res.json();
      if (data && typeof data === 'object') {
        rawData = data as Record<string, unknown>;
        break;
      }
    } catch (err) {
      errors.push(`${platform}: ${(err as Error).message}`);
    }
  }

  if (!rawData) {
    // Both platforms failed — try last-known-safe fallback
    if (isKvConfigured()) {
      const fallback = await kvGet<string>(KV_KEY_LAST_SAFE, '');
      if (fallback) {
        try {
          const cached = JSON.parse(fallback);
          return NextResponse.json({
            ...cached,
            _meta: {
              sanitized: true,
              fallback: true,
              reason: 'Both platforms unreachable, serving last known safe theme',
              errors,
              timestamp: new Date().toISOString(),
            },
          }, { headers: corsHeaders() });
        } catch { /* corrupt cache, proceed to error */ }
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch from both platforms', errors },
      { status: 502, headers: corsHeaders() }
    );
  }

  // Scan RAW data for attacks (before sanitization weakens detection)
  const securityCheck = scanExtended(rawData as Record<string, unknown>);
  const sanitized = sanitizeObject(rawData);
  const validation = validateTodayJson(sanitized);

  // Return immediately on success and cache the safe version
  if (securityCheck.isSafe && validation.valid) {
    if (isKvConfigured()) {
      await kvSet(KV_KEY_LAST_SAFE, JSON.stringify(sanitized));
    }
    return NextResponse.json({
      ...sanitized,
      _meta: {
        sanitized: true,
        schemaValid: true,
        timestamp: new Date().toISOString(),
      },
    }, { headers: corsHeaders() });
  }

  // Log security incidents (attribute to upstream data source, not the client)
  for (const reason of securityCheck.flaggedReasons) {
    await logSecurityIncident({
      type: 'XSS_ATTACK',
      field: 'today-safe',
      payload: reason,
      ip: 'upstream-themedist',
    });
  }

  // Try last-known-safe fallback
  if (isKvConfigured()) {
    const fallback = await kvGet<string>(KV_KEY_LAST_SAFE, '');
    if (fallback) {
      try {
        const cached = JSON.parse(fallback);
        return NextResponse.json({
          ...cached,
          _meta: {
            sanitized: true,
            fallback: true,
            reason: `Current theme failed validation — serving last known safe. Security: ${securityCheck.isSafe ? 'pass' : 'FAIL'}, Schema: ${validation.valid ? 'pass' : 'FAIL'}`,
            flaggedReasons: securityCheck.flaggedReasons,
            schemaErrors: validation.valid ? undefined : validation.errors,
            timestamp: new Date().toISOString(),
          },
        }, { headers: corsHeaders() });
      } catch { /* corrupt cache, fall through */ }
    }
  }

  // No fallback available — return sanitized version with warnings
  return NextResponse.json({
    ...sanitized,
    _meta: {
      sanitized: true,
      schemaValid: validation.valid,
      schemaErrors: validation.valid ? undefined : validation.errors,
      securityWarning: securityCheck.flaggedReasons.length > 0 ? securityCheck.flaggedReasons : undefined,
      fallback: false,
      timestamp: new Date().toISOString(),
    },
  }, { headers: corsHeaders() });
}
