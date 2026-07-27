import type { SystemAlert } from '@/types';

export type WebhookChannel = 'feishu' | 'dingtalk' | 'wecom' | 'slack' | 'discord' | 'telegram';

export interface WebhookTarget {
  channel: WebhookChannel;
  url: string;
  /** telegram only: chat_id to deliver to */
  chatId?: string;
}

const TYPE_LABELS: Record<string, string> = {
  OUTAGE: '🚨 服务宕机',
  SECURITY_BREACH: '⚠️ 安全入侵',
  DB_DOWN: '💾 数据库异常',
  SCHEMA_MISMATCH: '📋 Schema 不匹配',
  THEME_STALE: '📅 主题过期',
};

const MAX_DETAIL_CHARS = 800;

export function formatAlertText(alert: SystemAlert): string {
  const label = TYPE_LABELS[alert.type] || alert.type;
  const details =
    alert.details.length > MAX_DETAIL_CHARS ? alert.details.slice(0, MAX_DETAIL_CHARS) + '…' : alert.details;
  return [
    `${label} — ThemeDist Monitor`,
    `平台: ${alert.platform}`,
    `消息: ${alert.message}`,
    `时间: ${new Date(alert.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    '',
    details,
    '',
    'Dashboard: https://themedist-monitor.vercel.app',
  ].join('\n');
}

export function buildWebhookPayload(target: WebhookTarget, text: string): Record<string, unknown> {
  switch (target.channel) {
    case 'feishu':
      return { msg_type: 'text', content: { text } };
    case 'dingtalk':
    case 'wecom':
      return { msgtype: 'text', text: { content: text } };
    case 'slack':
      return { text };
    case 'discord':
      return { content: text.slice(0, 2000) }; // Discord hard limit
    case 'telegram':
      return { chat_id: target.chatId, text };
  }
}

export function getConfiguredWebhooks(env: Record<string, string | undefined> = process.env): WebhookTarget[] {
  const targets: WebhookTarget[] = [];
  const simple: Array<[WebhookChannel, string]> = [
    ['feishu', 'ALERT_WEBHOOK_FEISHU'],
    ['dingtalk', 'ALERT_WEBHOOK_DINGTALK'],
    ['wecom', 'ALERT_WEBHOOK_WECOM'],
    ['slack', 'ALERT_WEBHOOK_SLACK'],
    ['discord', 'ALERT_WEBHOOK_DISCORD'],
  ];
  for (const [channel, key] of simple) {
    const url = env[key];
    if (url) targets.push({ channel, url });
  }
  const tgToken = env.TELEGRAM_BOT_TOKEN;
  const tgChat = env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    targets.push({
      channel: 'telegram',
      url: `https://api.telegram.org/bot${tgToken}/sendMessage`,
      chatId: tgChat,
    });
  }
  return targets;
}

// Fires the alert at every configured channel; returns how many deliveries succeeded.
export async function sendWebhookAlerts(alert: SystemAlert): Promise<number> {
  const targets = getConfiguredWebhooks();
  if (targets.length === 0) return 0;

  const text = formatAlertText(alert);
  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const res = await fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildWebhookPayload(target, text)),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`${target.channel} responded ${res.status}`);
      return target.channel;
    })
  );

  let sent = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      sent++;
      console.log(`[Webhook] Alert delivered via ${r.value}`);
    } else {
      console.error('[Webhook] Delivery failed:', (r.reason as Error).message);
    }
  }
  return sent;
}
