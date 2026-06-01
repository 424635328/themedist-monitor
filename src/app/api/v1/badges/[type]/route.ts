import { NextResponse } from 'next/server';
import { getStatusHash, getPerformanceLogs } from '@/lib/store';

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

  // Read from status hash (single KV call) instead of fetching all data
  const hash = await getStatusHash();

  let label: string;
  let value: string;
  let color: string;

  switch (type) {
    case 'vercel': {
      const st = hash?.['vercel:status'] || 'no_data';
      const latency = hash?.['vercel:latency'];
      label = 'Vercel';
      value = st === 'online'
        ? `Online (${latency ?? '?'}ms)`
        : st === 'outage' ? 'Offline' : 'No Data';
      color = statusColor[st] ?? '#9f9f9f';
      break;
    }
    case 'netlify': {
      const st = hash?.['netlify:status'] || 'no_data';
      const latency = hash?.['netlify:latency'];
      label = 'Netlify';
      value = st === 'online'
        ? `Online (${latency ?? '?'}ms)`
        : st === 'outage' ? 'Offline' : 'No Data';
      color = statusColor[st] ?? '#9f9f9f';
      break;
    }
    case 'theme': {
      const presetName = hash?.['theme:presetName'];
      const isSafe = hash?.['theme:safe'] !== 'false';
      label = 'Theme';
      if (!presetName) {
        value = 'No Data';
        color = '#9f9f9f';
      } else if (!isSafe) {
        value = `${presetName} (Unsafe)`;
        color = '#e05d44';
      } else {
        value = presetName;
        color = '#4c1';
      }
      break;
    }
    case 'database': {
      const dbStatus = hash?.['db:status'] || 'unknown';
      label = 'Database';
      value = dbStatus === 'healthy' ? 'Healthy' : dbStatus === 'degraded' ? 'Degraded' : 'Unknown';
      color = dbStatus === 'healthy' ? '#4c1' : '#e05d44';
      break;
    }
    case 'uptime': {
      // Uptime requires historical data — fall back to full fetch
      const logs = await getPerformanceLogs();
      const totalChecks = logs.length;
      const okChecks = logs.filter((l) => l.statusCode === 200).length;
      const uptime = totalChecks > 0 ? ((okChecks / totalChecks) * 100).toFixed(1) : 'N/A';
      label = 'Uptime';
      value = `${uptime}%`;
      color = parseFloat(uptime) > 99 ? '#4c1'
        : parseFloat(uptime) > 95 ? '#dfb317'
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
