import { kvGet, kvSet } from './kv';

const COOLDOWNS: Record<string, number> = {
  monitor: 5 * 60 * 1000,    // 5 minutes
  diagnose: 2 * 60 * 1000,   // 2 minutes
};

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const cooldown = COOLDOWNS[key];
  if (!cooldown) return { allowed: true };

  const kvKey = `ratelimit:${key}`;

  // Atomic: NX+EX ensures only the first request in the cooldown window wins
  const acquired = await kvSet(kvKey, String(Date.now()), { nx: true, ex: Math.ceil(cooldown / 1000) });
  if (acquired) return { allowed: true };

  // Key already exists — rate limited
  const lastRun = await kvGet<string>(kvKey, '');
  const elapsed = lastRun ? Date.now() - Number(lastRun) : cooldown;
  const remaining = Math.max(0, cooldown - elapsed);
  return { allowed: false, retryAfter: Math.ceil(remaining / 1000) || 1 };
}
