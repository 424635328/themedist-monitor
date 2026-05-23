import { NextResponse } from 'next/server';
import { runAllChecks } from '@/lib/monitor';
import { getPerformanceLogs, getThemeSnapshots, getSystemAlerts } from '@/lib/store';

export async function GET() {
  const results = await runAllChecks();
  return NextResponse.json({
    message: 'Monitor check complete',
    timestamp: new Date().toISOString(),
    ...results,
  });
}

export async function POST() {
  const results = await runAllChecks();
  return NextResponse.json({
    message: 'Monitor check complete',
    timestamp: new Date().toISOString(),
    ...results,
  });
}

export async function DELETE() {
  // clear all data
  const fs = require('fs');
  const path = require('path');
  const dataDir = process.env.VERCEL
    ? path.join('/tmp', 'data')
    : path.join(process.cwd(), 'data');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return NextResponse.json({ message: 'All monitoring data cleared' });
}
