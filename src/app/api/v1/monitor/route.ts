import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runAllChecks } from '@/lib/monitor';
import { checkRateLimit } from '@/lib/rate-limit';
import { kvSet, isKvConfigured } from '@/lib/kv';

const LOCK_KEY = 'lock:monitor';
const LOCK_TTL = 60; // seconds

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function isCronOrAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured — allow all (backward compatible)
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

async function acquireLock(): Promise<boolean> {
  if (!isKvConfigured()) return true; // no KV = no lock, allow
  try {
    // SET NX (only set if not exists) with TTL
    return await kvSet(LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });
  } catch {
    return true; // if KV fails, allow execution
  }
}

async function releaseLock() {
  if (!isKvConfigured()) return;
  try {
    const { kvDelete } = await import('@/lib/kv');
    await kvDelete(LOCK_KEY);
  } catch { /* ignore */ }
}

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit('monitor');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const acquired = await acquireLock();
  if (!acquired) {
    return NextResponse.json(
      { error: 'Monitor is already running', retryAfter: LOCK_TTL },
      { status: 429 }
    );
  }

  try {
    const results = await runAllChecks();
    return NextResponse.json({
      message: 'Monitor check complete',
      timestamp: new Date().toISOString(),
      ...results,
    });
  } finally {
    await releaseLock();
  }
}

export async function POST(request: NextRequest) {
  if (!isCronOrAuthorized(request)) return unauthorized();

  const rl = await checkRateLimit('monitor');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const acquired = await acquireLock();
  if (!acquired) {
    return NextResponse.json(
      { error: 'Monitor is already running', retryAfter: LOCK_TTL },
      { status: 429 }
    );
  }

  try {
    const results = await runAllChecks();
    return NextResponse.json({
      message: 'Monitor check complete',
      timestamp: new Date().toISOString(),
      ...results,
    });
  } finally {
    await releaseLock();
  }
}

export async function DELETE(request: NextRequest) {
  if (!isCronOrAuthorized(request)) return unauthorized();

  const dataDir = process.env.VERCEL
    ? path.join('/tmp', 'data')
    : path.join(process.cwd(), 'data');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return NextResponse.json({ message: 'All monitoring data cleared' });
}
