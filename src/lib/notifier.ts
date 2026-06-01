import nodemailer from 'nodemailer';
import type { SystemAlert } from '@/types';
import { kvGet, kvSet } from './kv';

const FROM = '"ThemeDist Monitor" <424635328@qq.com>';
const TO = '424635328@qq.com';

// Rate limit: minimum interval (ms) between same-type notifications
const RATE_LIMITS: Record<string, number> = {
  OUTAGE: 15 * 60 * 1000,       // 15 min
  SECURITY_BREACH: 30 * 60 * 1000, // 30 min
  DB_DOWN: 30 * 60 * 1000,       // 30 min
  SCHEMA_MISMATCH: 60 * 60 * 1000, // 60 min
  THEME_STALE: 24 * 60 * 60 * 1000, // 24 hours
};

const NOTIFY_KEY_PREFIX = 'notify:last:';

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.QQ_EMAIL_USER,
      pass: process.env.QQ_EMAIL_PASS,
    },
  });
}

async function canSend(type: string): Promise<boolean> {
  const key = `${NOTIFY_KEY_PREFIX}${type}`;
  const lastSent = await kvGet<number>(key, 0);
  const now = Date.now();
  const minInterval = RATE_LIMITS[type] || 15 * 60 * 1000;
  return now - lastSent >= minInterval;
}

async function markSent(type: string): Promise<void> {
  const key = `${NOTIFY_KEY_PREFIX}${type}`;
  await kvSet(key, Date.now());
}

function formatAlertEmail(alert: SystemAlert): { subject: string; html: string } {
  const typeLabels: Record<string, string> = {
    OUTAGE: '🚨 服务宕机',
    SECURITY_BREACH: '⚠️ 安全入侵',
    DB_DOWN: '💾 数据库异常',
    SCHEMA_MISMATCH: '📋 Schema 不匹配',
    THEME_STALE: '📅 主题过期',
  };

  const severity = alert.type === 'SECURITY_BREACH' ? '高' : alert.type === 'OUTAGE' ? '高' : '中';

  return {
    subject: `[ThemeDist Monitor] ${typeLabels[alert.type] || alert.type} — ${alert.message}`,
    html: `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">ThemeDist Pulse 监控告警</h1>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666;">类型</td><td style="padding: 8px 0; font-weight: 600;">${typeLabels[alert.type] || alert.type}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">严重程度</td><td style="padding: 8px 0;"><span style="background: ${severity === '高' ? '#dc3545' : '#ffc107'}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${severity}</span></td></tr>
      <tr><td style="padding: 8px 0; color: #666;">平台</td><td style="padding: 8px 0;">${alert.platform}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">消息</td><td style="padding: 8px 0; font-weight: 600;">${alert.message}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">详情</td><td style="padding: 8px 0; font-size: 13px; color: #555;">${alert.details}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">时间</td><td style="padding: 8px 0;">${new Date(alert.timestamp).toLocaleString('zh-CN')}</td></tr>
    </table>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 12px; color: #999;">
      <p>请前往 <a href="https://themedist-monitor.vercel.app" style="color: #0066cc;">Dashboard</a> 查看详情。</p>
      <p>此邮件由 ThemeDist Monitor 自动发送，请勿回复。</p>
    </div>
  </div>
</div>`.trim(),
  };
}

export async function notifyAlert(alert: SystemAlert): Promise<boolean> {
  const allowed = await canSend(alert.type);
  if (!allowed) return false;

  try {
    const transporter = getTransporter();
    const { subject, html } = formatAlertEmail(alert);

    await transporter.sendMail({
      from: FROM,
      to: TO,
      subject,
      html,
    });

    await markSent(alert.type);
    console.log(`[Notifier] Email sent for ${alert.type}: ${alert.message}`);
    return true;
  } catch (err) {
    console.error('[Notifier] Failed to send email:', (err as Error).message);
    return false;
  }
}

export function formatAlertBatch(alerts: SystemAlert[]): string | null {
  if (alerts.length === 0) return null;

  const lines = alerts.map(
    (a) => `[${a.type}] ${a.platform}: ${a.message}`
  );
  return `ThemeDist 监控报告\n\n${lines.join('\n')}\n\n— Dashboard: https://themedist-monitor.vercel.app`;
}
