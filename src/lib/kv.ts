import { createClient } from '@vercel/kv';

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (client) return client;
  client = createClient({
    url: process.env.KV_REST_API_URL || '',
    token: process.env.KV_REST_API_TOKEN || '',
  });
  return client;
}

export function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  if (!isKvConfigured()) return fallback;
  try {
    const val = await getClient().get<T>(key);
    return val ?? fallback;
  } catch {
    return fallback;
  }
}

interface KvSetOptions { nx?: boolean; ex?: number; }

export async function kvSet<T>(key: string, value: T, options?: KvSetOptions): Promise<boolean> {
  if (!isKvConfigured()) return false;
  try {
    const result: unknown = await getClient().set(key, value, options as Record<string, unknown>);
    // NX option returns null when key already exists
    return result !== null;
  } catch {
    return false;
  }
}

export async function kvPush<T>(key: string, item: T): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    const arr = await getClient().get<T[]>(key);
    const updated = [...(arr || []), item];
    // Keep only last 1000 entries per key to limit memory
    const trimmed = updated.length > 1000 ? updated.slice(-1000) : updated;
    await getClient().set(key, trimmed);
  } catch {
    // silently fail
  }
}

export async function kvList<T>(key: string, fallback: T[] = []): Promise<T[]> {
  return kvGet<T[]>(key, fallback);
}

export async function kvDelete(key: string): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().del(key);
  } catch {
    // silently fail
  }
}

// --- Hash operations ---

export async function kvHget<T>(key: string, field: string): Promise<T | null> {
  if (!isKvConfigured()) return null;
  try {
    return await getClient().hget<T>(key, field);
  } catch {
    return null;
  }
}

export async function kvHgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
  if (!isKvConfigured()) return null;
  try {
    return await getClient().hgetall<T>(key);
  } catch {
    return null;
  }
}

export async function kvHset(key: string, field: string, value: unknown): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().hset(key, { [field]: value });
  } catch {
    // silently fail
  }
}

export async function kvHincrby(key: string, field: string, increment: number): Promise<number> {
  if (!isKvConfigured()) return increment;
  try {
    return await getClient().hincrby(key, field, increment);
  } catch {
    return increment;
  }
}

// --- Sorted Set operations ---

export async function kvZadd(key: string, member: string, score: number): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().zadd(key, { score, member });
  } catch {
    // silently fail
  }
}

export async function kvZrangebyscore(key: string, min: number, max: number, limit = 200): Promise<string[]> {
  if (!isKvConfigured()) return [];
  try {
    const result = await getClient().zrange(key, min, max, { byScore: true, offset: 0, count: limit });
    if (!Array.isArray(result)) return [];
    return result as string[];
  } catch {
    return [];
  }
}

// --- List operations (capped logs) ---

export async function kvLpush(key: string, value: string): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().lpush(key, value);
  } catch {
    // silently fail
  }
}

export async function kvLtrim(key: string, start: number, stop: number): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().ltrim(key, start, stop);
  } catch {
    // silently fail
  }
}

export async function kvLrange(key: string, start: number, stop: number): Promise<string[]> {
  if (!isKvConfigured()) return [];
  try {
    // Use raw fetch — @upstash/redis v1.38 client.lrange() returns empty
    // in the Next.js bundled context (while REST API works fine).
    const token = process.env.KV_REST_API_TOKEN || '';
    const baseUrl = (process.env.KV_REST_API_URL || '').replace(/\/$/, '');
    const url = `${baseUrl}/lrange/${key}/${start}/${stop}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json() as { result?: string[] };
    if (Array.isArray(json.result)) return json.result;
    return [];
  } catch {
    return [];
  }
}

// --- Counter & TTL operations (IP blocking, alert cooldown) ---

export async function kvIncr(key: string): Promise<number> {
  if (!isKvConfigured()) return 1;
  try {
    return await getClient().incr(key);
  } catch {
    return 1;
  }
}

export async function kvExpire(key: string, seconds: number): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().expire(key, seconds);
  } catch {
    // silently fail
  }
}

export async function kvExists(key: string): Promise<boolean> {
  if (!isKvConfigured()) return false;
  try {
    return (await getClient().exists(key)) === 1;
  } catch {
    return false;
  }
}

// --- Sorted Set cleanup ---

export async function kvZremrangebyscore(key: string, min: number, max: number): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().zremrangebyscore(key, min, max);
  } catch {
    // silently fail
  }
}
