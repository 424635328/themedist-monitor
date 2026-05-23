import { NextRequest, NextResponse } from 'next/server';
import { kvPush } from '@/lib/kv';
import type { TelemetryEntry } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const duration = body.duration as number;

    if (typeof duration !== 'number' || duration < 0 || duration > 60000) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const entry: TelemetryEntry = {
      timestamp: new Date().toISOString(),
      durationMs: Math.round(duration),
      platform: body.platform,
      region: request.headers.get('x-vercel-ip-country') || undefined,
      userAgent: request.headers.get('user-agent')?.slice(0, 100) || undefined,
    };

    // Don't await — fire and forget to minimize impact on the client
    kvPush<TelemetryEntry>('rum:telemetry', entry);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
