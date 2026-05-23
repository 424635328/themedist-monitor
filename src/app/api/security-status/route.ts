import { NextResponse } from 'next/server';
import { getThemeSnapshots } from '@/lib/store';

export const revalidate = 300; // 5 min CDN cache

export async function GET() {
  const snapshots = getThemeSnapshots();
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  if (!latest) {
    return NextResponse.json({
      status: 'unknown',
      message: 'No theme data available yet',
      timestamp: new Date().toISOString(),
    });
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
    checkedAt: latest.date,
    timestamp: new Date().toISOString(),
  });
}
