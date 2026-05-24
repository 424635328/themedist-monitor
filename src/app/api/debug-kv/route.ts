import { NextResponse } from 'next/server';
import {
  isKvConfigured,
  kvSet, kvGet, kvZadd, kvZrangebyscore, kvLpush, kvLrange,
} from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {
    kvConfigured: isKvConfigured(),
  };

  if (!isKvConfigured()) {
    return NextResponse.json({ error: 'KV not configured', results });
  }

  // Test 1: String set/get
  try {
    await kvSet('debug:test', JSON.stringify({ hello: 'world', ts: Date.now() }));
    const val = await kvGet<string>('debug:test', '');
    results.stringGetSet = val ? 'OK' : 'FAIL (null)';
  } catch (e) {
    results.stringGetSet = `ERROR: ${(e as Error).message}`;
  }

  // Test 2: Zset add/range
  try {
    const testKey = 'debug:zset';
    const testMember = JSON.stringify({ test: true, ts: Date.now() });
    await kvZadd(testKey, testMember, Date.now());
    const members = await kvZrangebyscore(testKey, 0, Date.now() + 1000, 1);
    if (members.length > 0 && members[0].member) {
      results.zsetAddRange = `OK (member: ${members[0].member.slice(0, 50)})`;
    } else {
      results.zsetAddRange = `FAIL (got ${members.length} members, first: ${JSON.stringify(members[0] || 'none')})`;
    }
  } catch (e) {
    results.zsetAddRange = `ERROR: ${(e as Error).message}`;
  }

  // Test 3: Check actual perf zset
  try {
    const now = Date.now();
    const since = now - 7 * 24 * 60 * 60 * 1000;
    const perfMembers = await kvZrangebyscore('zset:perf', since, now, 5);
    results.perfZsetCount = perfMembers.length;
    if (perfMembers.length > 0) {
      results.perfZsetSample = perfMembers[0];
    }
  } catch (e) {
    results.perfZset = `ERROR: ${(e as Error).message}`;
  }

  return NextResponse.json(results);
}
