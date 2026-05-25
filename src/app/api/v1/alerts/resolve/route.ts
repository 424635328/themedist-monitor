import { NextRequest, NextResponse } from 'next/server';
import { resolveAlert, getSystemAlerts } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (id) {
    await resolveAlert(id);
  } else {
    // Resolve all unresolved alerts
    const alerts = await getSystemAlerts();
    for (const alert of alerts) {
      if (!alert.resolved) {
        await resolveAlert(alert.id);
      }
    }
  }

  const updated = await getSystemAlerts();
  return NextResponse.json({
    resolved: true,
    alerts: {
      unresolved: updated.filter((a) => !a.resolved),
      recent: updated.slice(-20).reverse(),
    },
  });
}
