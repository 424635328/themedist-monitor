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

function isKvConfigured(): boolean {
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

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    await getClient().set(key, value);
  } catch {
    // silently fail if KV is unavailable
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
