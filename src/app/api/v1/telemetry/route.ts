import { NextRequest, NextResponse } from 'next/server';
import { kvHincrby, isKvConfigured } from '@/lib/kv';

const KEY_TOTAL_REQUESTS = 'rum:counters';
const KEY_LATENCY_BINS = 'rum:latency_bins';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getLatencyBin(ms: number): string {
  if (ms <= 100) return '0-100';
  if (ms <= 250) return '101-250';
  if (ms <= 500) return '251-500';
  if (ms <= 1000) return '501-1000';
  if (ms <= 2000) return '1001-2000';
  return '2001+';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const duration = body.duration as number;

    if (typeof duration !== 'number' || duration < 0 || duration > 60000) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    if (!isKvConfigured()) {
      return NextResponse.json({ ok: true });
    }

    const ALLOWED_PLATFORMS = ['vercel', 'netlify', 'unknown'];
    const platform = ALLOWED_PLATFORMS.includes(body.platform) ? body.platform : 'unknown';
    const latencyBin = getLatencyBin(Math.round(duration));
    const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Atomic increments — no raw entry storage, minimal KV ops
    await Promise.all([
      kvHincrby(KEY_TOTAL_REQUESTS, `${platform}:${dateKey}:total`, 1),
      kvHincrby(KEY_TOTAL_REQUESTS, `${platform}:${dateKey}:ok`, duration < 2000 ? 1 : 0),
      kvHincrby(KEY_TOTAL_REQUESTS, `${platform}:${dateKey}:sum_latency`, Math.round(duration)),
      kvHincrby(KEY_LATENCY_BINS, `${platform}:${dateKey}:${latencyBin}`, 1),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
