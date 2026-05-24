import { NextResponse } from 'next/server';
import { getPerformanceLogs, getThemeSnapshots, getSystemAlerts } from '@/lib/store';

function svgBadge(label: string, value: string, color: string): string {
  const labelWidth = label.length * 8 + 14;
  const valueWidth = value.length * 8 + 14;
  const totalWidth = labelWidth + valueWidth;
  const uid = Math.random().toString(36).slice(2, 8);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b-${uid}" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r-${uid}">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r-${uid})">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#b-${uid})"/>
  </g>
  <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3" text-anchor="middle">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14" text-anchor="middle">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3" text-anchor="middle">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" text-anchor="middle">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const statusColor: Record<string, string> = {
  online: '#4c1',
  slow: '#dfb317',
  outage: '#e05d44',
  no_data: '#9f9f9f',
  unhealthy: '#e05d44',
};

export async function GET(
  request: Request,
  { params }: { params: { type: string } }
) {
  const { type } = params;
  const isDebug = new URL(request.url).searchParams.has('debug');

  const [logs, snapshots, alerts] = await Promise.all([
    getPerformanceLogs(),
    getThemeSnapshots(),
    getSystemAlerts(),
  ]);

  if (isDebug) {
    return new Response(JSON.stringify({
      type,
      logsCount: logs.length,
      latestVercel: [...logs].reverse().find((l: { platform: string }) => l.platform === 'vercel') || null,
      latestNetlify: [...logs].reverse().find((l: { platform: string }) => l.platform === 'netlify') || null,
      snapshotsCount: snapshots.length,
      latestSnapshot: snapshots.length > 0 ? snapshots[snapshots.length - 1].presetName : null,
      alertsCount: alerts.length,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const latestVercel = [...logs].reverse().find((l: { platform: string }) => l.platform === 'vercel');
  const latestNetlify = [...logs].reverse().find((l: { platform: string }) => l.platform === 'netlify');

  function platformStatus(log: typeof latestVercel): string {
    if (!log) return 'no_data';
    if (log.statusCode === 200) return 'online';
    return 'outage';
  }

  let label: string;
  let value: string;
  let color: string;

  switch (type) {
    case 'vercel': {
      const st = platformStatus(latestVercel);
      label = 'Vercel';
      value = st === 'online'
        ? `Online (${latestVercel?.latencyMs ?? '?'}ms)`
        : st === 'outage' ? 'Offline' : 'No Data';
      color = statusColor[st] ?? '#9f9f9f';
      break;
    }
    case 'netlify': {
      const st = platformStatus(latestNetlify);
      label = 'Netlify';
      value = st === 'online'
        ? `Online (${latestNetlify?.latencyMs ?? '?'}ms)`
        : st === 'outage' ? 'Offline' : 'No Data';
      color = statusColor[st] ?? '#9f9f9f';
      break;
    }
    case 'theme': {
      const snap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      label = 'Theme';
      if (!snap) {
        value = 'No Data';
        color = '#9f9f9f';
      } else if (snap.securityStatus === 'unsafe') {
        value = `${snap.presetName || 'Unknown'} (Unsafe)`;
        color = '#e05d44';
      } else {
        value = snap.presetName || 'Unknown';
        color = '#4c1';
      }
      break;
    }
    case 'database': {
      const dbDown = alerts.some((a: { type: string; resolved: boolean }) => a.type === 'DB_DOWN' && !a.resolved);
      label = 'Database';
      value = dbDown ? 'Degraded' : 'Healthy';
      color = dbDown ? '#e05d44' : '#4c1';
      break;
    }
    case 'uptime': {
      const totalChecks = logs.length;
      const okChecks = logs.filter((l: { statusCode: number }) => l.statusCode === 200).length;
      const uptime = totalChecks > 0 ? ((okChecks / totalChecks) * 100).toFixed(1) : 'N/A';
      label = 'Uptime';
      value = `${uptime}%`;
      color = parseFloat(uptime as string) > 99 ? '#4c1'
        : parseFloat(uptime as string) > 95 ? '#dfb317'
        : '#e05d44';
      break;
    }
    default: {
      return new NextResponse(svgBadge('Badge', 'Unknown Type', '#9f9f9f'), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, s-maxage=60',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return new NextResponse(svgBadge(label, value, color), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
