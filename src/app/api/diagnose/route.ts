import { NextResponse } from 'next/server';

interface ProbeResult {
  url: string;
  ok: boolean;
  ms: number;
  status?: number;
  error?: string;
}

export async function GET() {
  const probeResults: ProbeResult[] = [];

  // Test urls: themedist + a known-good Chinese site + httpbin
  const testUrls = [
    'https://themedist.vercel.app/api/today.json',
    'https://www.baidu.com',
  ];

  for (const url of testUrls) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - start);
      probeResults.push({
        url: url.replace(/https?:\/\//, ''),
        ok: true,
        status: res.status,
        ms: elapsed,
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      probeResults.push({
        url: url.replace(/https?:\/\//, ''),
        ok: false,
        ms: elapsed,
        error: (err as Error).message.slice(0, 120),
      });
    }
  }

  const allOk = probeResults.every((p) => p.ok);

  return NextResponse.json({
    env: {
      HTTPS_PROXY: process.env.HTTPS_PROXY ? 'set' : 'not set',
      HTTP_PROXY: process.env.HTTP_PROXY ? 'set' : 'not set',
    },
    probes: probeResults,
    summary: allOk ? 'All reachable' : 'Some unreachable',
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 502 });
}
