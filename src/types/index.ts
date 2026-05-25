export interface PerformanceLog {
  id: string;
  timestamp: string;
  platform: 'vercel' | 'netlify';
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  dnsMs?: number;
  region?: string;
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS' | 'UNKNOWN';
  cacheControl?: string;
  error?: string;
}

export interface ThemeSnapshot {
  id: string;
  date: string;
  preset: string;
  presetName: string;
  author?: string;
  themeCount: number;
  isValidSchema: boolean;
  validationErrors?: string[];
  securityStatus: 'safe' | 'warning' | 'unsafe';
  flaggedReasons?: string[];
  dailyIsCommunity?: boolean;
  apiVersion?: string;
  rawData?: Record<string, unknown>;
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  type: 'OUTAGE' | 'SECURITY_BREACH' | 'DB_DOWN' | 'SCHEMA_MISMATCH';
  platform: 'vercel' | 'netlify' | 'both' | 'system' | 'community';
  message: string;
  details: string;
  resolved: boolean;
}

export interface TodayJsonResponse {
  apiVersion?: string;
  date?: string;
  generatedAt?: string;
  preset?: string;
  presetName?: string;
  author?: string;
  available?: number;
  dailyIsCommunity?: boolean;
  cssVars?: Record<string, string>;
  customCss?: string;
  extensions?: Array<Record<string, unknown>>;
  logoText?: string;
  logoColors?: string[];
  directory?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IndexDataResponse {
  apiVersion?: string;
  pool?: string[];
  poolLength?: number;
  totalThemes?: number;
  gregorianHolidays?: Record<string, string>;
  lunarHolidays?: Record<string, string>;
  directory?: Array<Record<string, unknown>>;
}

export interface TrendingEntry {
  preset: string;
  likes: number;
  usage: number;
  hotness: number;
}

export interface AdminHealthResponse {
  redis?: string;
  pending?: number;
  approved?: number;
  apiVersion?: string;
}

export interface ProbeResult {
  id: string;
  timestamp: string;
  region: string;
  platform: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  tcpMs?: number;
  dnsMs?: number;
  tlsMs?: number;
  error?: string;
}

export interface TelemetryEntry {
  timestamp: string;
  durationMs: number;
  platform?: string;
  region?: string;
  userAgent?: string;
}

export interface HourlyAggregate {
  hour: string;
  platform: string;
  avgLatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  p95LatencyMs: number;
  requestCount: number;
  availabilityPct: number;
  cacheHitRate: number;
}

export interface DailyAggregate extends Omit<HourlyAggregate, 'hour'> {
  date: string;
}

export type AlertType = SystemAlert['type'];
