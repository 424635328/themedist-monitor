import { kvGet, kvSet } from './kv';

const COOLDOWNS: Record<string, number> = {
  monitor: 5 * 60 * 1000,    // 5 minutes
  diagnose: 2 * 60 * 1000,   // 2 minutes
};

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const cooldown = COOLDOWNS[key];
  if (!cooldown) return { allowed: true };

  const kvKey = `ratelimit:${key}`;
  const lastRun = await kvGet<string>(kvKey, '');

  if (lastRun) {
    const elapsed = Date.now() - Number(lastRun);
    if (elapsed < cooldown) {
      return { allowed: false, retryAfter: Math.ceil((cooldown - elapsed) / 1000) };
    }
  }

  await kvSet(kvKey, String(Date.now()));
  return { allowed: true };
}
