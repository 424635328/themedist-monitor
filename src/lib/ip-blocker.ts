import { kvIncr, kvExpire, kvSet, kvExists, isKvConfigured } from './kv';

const BREACH_THRESHOLD = 5;    // breaches within the window → block
const BREACH_WINDOW_S = 3600;  // 1 hour sliding window
const BLOCK_DURATION_S = 86400; // 24 hour block

export async function recordBreach(ip: string): Promise<void> {
  if (!isKvConfigured() || !ip) return;
  const breachKey = `ip:breach_count:${ip}`;
  const count = await kvIncr(breachKey);
  if (count === 1) {
    await kvExpire(breachKey, BREACH_WINDOW_S);
  }
  if (count >= BREACH_THRESHOLD) {
    await kvSet(`ip:blocked:${ip}`, '1', { ex: BLOCK_DURATION_S });
  }
}

export async function isBlocked(ip: string): Promise<boolean> {
  if (!isKvConfigured() || !ip) return false;
  return kvExists(`ip:blocked:${ip}`);
}
