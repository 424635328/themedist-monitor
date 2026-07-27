import { describe, expect, it } from 'vitest';
import type { SystemAlert } from '../src/types';
import { buildWebhookPayload, formatAlertText, getConfiguredWebhooks } from '../src/lib/webhook';

const alert: SystemAlert = {
  id: 'a1',
  timestamp: '2026-07-26T03:00:00.000Z',
  type: 'OUTAGE',
  platform: 'vercel',
  message: 'vercel returned status 502 (failure #3)',
  details: 'Endpoint: https://themedist.vercel.app/api/v1/today.json',
  resolved: false,
};

describe('formatAlertText', () => {
  it('includes type label, platform, message and dashboard link', () => {
    const text = formatAlertText(alert);
    expect(text).toContain('服务宕机');
    expect(text).toContain('vercel');
    expect(text).toContain('502');
    expect(text).toContain('themedist-monitor.vercel.app');
  });

  it('truncates very long details', () => {
    const text = formatAlertText({ ...alert, details: 'x'.repeat(5000) });
    expect(text.length).toBeLessThan(1200);
    expect(text).toContain('…');
  });
});

describe('buildWebhookPayload', () => {
  const text = 'hello';

  it('builds feishu payload', () => {
    expect(buildWebhookPayload({ channel: 'feishu', url: 'u' }, text)).toEqual({
      msg_type: 'text',
      content: { text },
    });
  });

  it('builds dingtalk/wecom payload', () => {
    const expected = { msgtype: 'text', text: { content: text } };
    expect(buildWebhookPayload({ channel: 'dingtalk', url: 'u' }, text)).toEqual(expected);
    expect(buildWebhookPayload({ channel: 'wecom', url: 'u' }, text)).toEqual(expected);
  });

  it('builds slack payload', () => {
    expect(buildWebhookPayload({ channel: 'slack', url: 'u' }, text)).toEqual({ text });
  });

  it('builds discord payload and respects the 2000-char limit', () => {
    const long = 'y'.repeat(3000);
    const payload = buildWebhookPayload({ channel: 'discord', url: 'u' }, long) as { content: string };
    expect(payload.content).toHaveLength(2000);
  });

  it('builds telegram payload with chat_id', () => {
    expect(buildWebhookPayload({ channel: 'telegram', url: 'u', chatId: '42' }, text)).toEqual({
      chat_id: '42',
      text,
    });
  });
});

describe('getConfiguredWebhooks', () => {
  it('returns nothing when no env vars are set', () => {
    expect(getConfiguredWebhooks({})).toEqual([]);
  });

  it('picks up each configured channel', () => {
    const targets = getConfiguredWebhooks({
      ALERT_WEBHOOK_FEISHU: 'https://open.feishu.cn/hook/x',
      ALERT_WEBHOOK_SLACK: 'https://hooks.slack.com/services/x',
    });
    expect(targets.map((t) => t.channel).sort()).toEqual(['feishu', 'slack']);
  });

  it('builds the telegram sendMessage URL from token + chat id', () => {
    const targets = getConfiguredWebhooks({ TELEGRAM_BOT_TOKEN: 'abc', TELEGRAM_CHAT_ID: '99' });
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe('https://api.telegram.org/botabc/sendMessage');
    expect(targets[0].chatId).toBe('99');
  });

  it('ignores telegram when only the token is present', () => {
    expect(getConfiguredWebhooks({ TELEGRAM_BOT_TOKEN: 'abc' })).toEqual([]);
  });
});
