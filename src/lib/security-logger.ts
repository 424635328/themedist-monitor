import { kvLpush, kvLtrim, kvLrange, isKvConfigured } from './kv';

export interface SecurityIncident {
  type: 'XSS_ATTACK' | 'SCHEMA_MISMATCH';
  field: string;
  payload: string;
  ip: string;
  timestamp: string;
}

export async function logSecurityIncident(incident: Omit<SecurityIncident, 'timestamp'>) {
  if (!isKvConfigured()) return;
  const entry: SecurityIncident = {
    ...incident,
    timestamp: new Date().toISOString(),
  };
  await kvLpush('security:incidents', JSON.stringify(entry));
  await kvLtrim('security:incidents', 0, 199);
}

export async function getRecentIncidents(limit = 50): Promise<SecurityIncident[]> {
  if (!isKvConfigured()) return [];
  const items = await kvLrange('security:incidents', 0, limit - 1);
  const incidents: SecurityIncident[] = [];
  for (const item of items) {
    try {
      incidents.push(JSON.parse(item) as SecurityIncident);
    } catch { /* skip corrupt entries */ }
  }
  return incidents;
}
