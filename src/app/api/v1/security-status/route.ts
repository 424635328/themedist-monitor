import { NextResponse } from 'next/server';
import { getThemeSnapshots } from '@/lib/store';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshots = await getThemeSnapshots();
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (!latest) {
    return NextResponse.json({
      status: 'unknown',
      message: 'No theme data available yet',
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders() });
  }

  const isSafe = latest.securityStatus === 'safe';

  return NextResponse.json({
    status: isSafe ? 'safe' : 'unsafe',
    message: isSafe
      ? 'Current theme is safe to use'
      : 'Security issues detected — verify before deploying',
    securityStatus: latest.securityStatus,
    flaggedReasons: latest.flaggedReasons || [],
    schemaValid: latest.isValidSchema,
    themeName: latest.presetName,
    preset: latest.preset,
    dailyIsCommunity: latest.dailyIsCommunity ?? false,
    apiVersion: latest.apiVersion ?? null,
    layerContext: latest.layerContext ?? null,
    hasClickEffect: latest.clickEffect != null && Array.isArray(latest.clickEffect?.spawn) && latest.clickEffect.spawn.length > 0,
    clickEffectCount: latest.clickEffect?.spawn?.length ?? 0,
    checkedAt: latest.date,
    timestamp: new Date().toISOString(),
  }, { headers: corsHeaders() });
}
