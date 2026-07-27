// Nearest-rank percentile. Values need not be pre-sorted.
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[idx];
}

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export function latencyPercentiles(values: number[]): LatencyPercentiles {
  return {
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
  };
}
