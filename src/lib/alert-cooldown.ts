import { kvGet, kvSet, isKvConfigured } from './kv';

const COOLDOWN_SECONDS = 3600; // 1 hour

export async function isAlertCooling(type: string): Promise<boolean> {
  if (!isKvConfigured()) return false; // no KV → always send (don't block)
  const key = `alert:cooldown:${type}`;
  const cooling = await kvGet<string>(key, '');
  return cooling === '1';
}

export async function setAlertCooldown(type: string): Promise<void> {
  if (!isKvConfigured()) return;
  const key = `alert:cooldown:${type}`;
  await kvSet(key, '1', { ex: COOLDOWN_SECONDS });
}
