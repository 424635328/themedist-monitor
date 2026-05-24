import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceLogs, getThemeSnapshots, getSystemAlerts } from '@/lib/store';

function svgBadge(label: string, value: string, color: string): string {
  const labelWidth = label.length * 8 + 14;
  const valueWidth = value.length * 8 + 14;
  const totalWidth = labelWidth + valueWidth;
  // Unique suffix prevents SVG id collisions when multiple badges on same page
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { type } = params;
  const logs = await getPerformanceLogs();
  const snapshots = await getThemeSnapshots();
  const alerts = await getSystemAlerts();

  const latestLogs = logs.slice(-4);

  function lastStatus(platform: string): { ok: boolean; latency: number } {
    const log = [...latestLogs].reverse().find((l) => l.platform === platform);
    if (!log) return { ok: false, latency: 0 };
    return { ok: log.statusCode === 200, latency: log.latencyMs };
  }

  let label: string;
  let value: string;
  let color: string;

  switch (type) {
    case 'vercel': {
      const st = lastStatus('vercel');
      label = 'Vercel';
      value = st.ok ? `Online (${st.latency}ms)` : 'Offline';
      color = st.ok ? '#4c1' : '#e05d44';
      break;
    }
    case 'netlify': {
      const st = lastStatus('netlify');
      label = 'Netlify';
      value = st.ok ? `Online (${st.latency}ms)` : 'Offline';
      color = st.ok ? '#4c1' : '#e05d44';
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
      const dbDown = alerts.some((a) => a.type === 'DB_DOWN' && !a.resolved);
      label = 'Database';
      value = dbDown ? 'Degraded' : 'Healthy';
      color = dbDown ? '#e05d44' : '#4c1';
      break;
    }
    case 'uptime': {
      const vercelOk = lastStatus('vercel').ok;
      const netlifyOk = lastStatus('netlify').ok;
      const totalChecks = logs.length;
      const okChecks = logs.filter((l) => l.statusCode === 200).length;
      const uptime = totalChecks > 0 ? ((okChecks / totalChecks) * 100).toFixed(1) : 'N/A';
      label = 'Uptime';
      value = `${uptime}%`;
      color = parseFloat(uptime as string) > 99 ? '#4c1' : parseFloat(uptime as string) > 95 ? '#dfb317' : '#e05d44';
      break;
    }
    default: {
      const svg = svgBadge('Badge', 'Unknown Type', '#9f9f9f');
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, s-maxage=60',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  const svg = svgBadge(label, value, color);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1200',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
