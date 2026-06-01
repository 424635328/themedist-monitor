import { NextResponse } from 'next/server';
import { kvPush, kvHset, isKvConfigured } from '@/lib/kv';
import type { ProbeResult } from '@/types';

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET(request: Request) {
  const region = request.headers.get('x-vercel-ip-country') || 'unknown';
  const start = performance.now();

  const targets = [
    { platform: 'vercel', url: 'https://themedist.vercel.app/api/v1/today.json' },
    { platform: 'netlify', url: 'https://themedist.netlify.app/api/v1/today.json' },
  ];

  const results = await Promise.all(
    targets.map(async ({ platform, url }) => {
      const probeStart = performance.now();
      let tcpMs: number | undefined;
      let dnsMs: number | undefined;
      let tlsMs: number | undefined;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'ThemeDist-Probe/1.0' },
        });
        clearTimeout(timeout);

        const latencyMs = Math.round(performance.now() - probeStart);

        const result: ProbeResult = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          region,
          platform,
          endpoint: url,
          statusCode: response.status,
          latencyMs,
          tcpMs,
          dnsMs,
          tlsMs,
        };

        await kvPush('probe:results', result);
        return result;
      } catch (err) {
        const latencyMs = Math.round(performance.now() - probeStart);
        const result: ProbeResult = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          region,
          platform,
          endpoint: url,
          statusCode: 0,
          latencyMs,
          error: (err as Error).message,
        };
        await kvPush('probe:results', result);
        return result;
      }
    })
  );

  // Update status hash with probe latency so /api/v1/status stays fresh
  if (isKvConfigured()) {
    for (const r of results) {
      const isOk = r.statusCode === 200;
      await kvHset('hash:status', `${r.platform}:status`, isOk ? 'online' : 'outage');
      await kvHset('hash:status', `${r.platform}:latency`, String(r.latencyMs));
    }
    await kvHset('hash:status', 'checkedAt', new Date().toISOString());
  }

  return NextResponse.json({
    probe: { region, duration: Math.round(performance.now() - start) },
    results,
  });
}
