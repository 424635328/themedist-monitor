import type { PerformanceLog, ThemeSnapshot, SystemAlert } from '@/types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'performance-logs.json');
const THEME_FILE = path.join(DATA_DIR, 'theme-snapshots.json');
const ALERTS_FILE = path.join(DATA_DIR, 'system-alerts.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // ignore corrupt files
  }
  return fallback;
}

function writeJSON<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getPerformanceLogs(): PerformanceLog[] {
  return readJSON<PerformanceLog[]>(PERF_FILE, []);
}

export function addPerformanceLog(log: PerformanceLog) {
  const logs = getPerformanceLogs();
  logs.push(log);
  writeJSON(PERF_FILE, logs);
}

export function getThemeSnapshots(): ThemeSnapshot[] {
  return readJSON<ThemeSnapshot[]>(THEME_FILE, []);
}

export function addThemeSnapshot(snapshot: ThemeSnapshot) {
  const snapshots = getThemeSnapshots();
  snapshots.push(snapshot);
  writeJSON(THEME_FILE, snapshots);
}

export function getSystemAlerts(): SystemAlert[] {
  return readJSON<SystemAlert[]>(ALERTS_FILE, []);
}

export function addSystemAlert(alert: SystemAlert) {
  const alerts = getSystemAlerts();
  alerts.push(alert);
  writeJSON(ALERTS_FILE, alerts);
}

export function resolveAlert(alertId: string) {
  const alerts = getSystemAlerts();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx !== -1) {
    alerts[idx].resolved = true;
    writeJSON(ALERTS_FILE, alerts);
  }
}
