import { describe, expect, it } from 'vitest';
import { latencyPercentiles, percentile } from '../src/lib/latency-stats';

describe('percentile', () => {
  it('returns 0 for an empty sample', () => {
    expect(percentile([], 95)).toBe(0);
  });

  it('returns the single value for a one-element sample', () => {
    expect(percentile([420], 50)).toBe(420);
    expect(percentile([420], 99)).toBe(420);
  });

  it('computes nearest-rank percentiles on unsorted input', () => {
    const values = [100, 300, 200, 500, 400, 600, 700, 900, 800, 1000];
    expect(percentile(values, 50)).toBe(500);
    expect(percentile(values, 95)).toBe(1000);
    expect(percentile(values, 90)).toBe(900);
  });

  it('p99 exposes the long tail hidden by the average', () => {
    // 98 fast requests and two 5s outliers: avg ≈ 198ms but p99 = 5000ms
    const values = [...Array.from({ length: 98 }, () => 100), 5000, 5000];
    expect(percentile(values, 99)).toBe(5000);
    expect(percentile(values, 50)).toBe(100);
  });

  it('does not mutate the input array', () => {
    const values = [3, 1, 2];
    percentile(values, 95);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('latencyPercentiles', () => {
  it('bundles p50/p95/p99', () => {
    const stats = latencyPercentiles([100, 200, 300]);
    expect(stats).toEqual({ p50: 200, p95: 300, p99: 300 });
  });
});
