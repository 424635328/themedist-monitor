export interface PerformanceLog {
  id: string;
  timestamp: string;
  platform: 'vercel' | 'netlify';
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  dnsMs?: number;
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS' | 'UNKNOWN';
  cacheControl?: string;
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
  rawData?: Record<string, unknown>;
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  type: 'OUTAGE' | 'SECURITY_BREACH' | 'DB_DOWN' | 'SCHEMA_MISMATCH';
  platform: 'vercel' | 'netlify' | 'both' | 'system';
  message: string;
  details: string;
  resolved: boolean;
}

export interface TodayJsonResponse {
  date?: string;
  preset?: string;
  presetName?: string;
  author?: string;
  available?: number;
  cssVars?: Record<string, string>;
  directory?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
