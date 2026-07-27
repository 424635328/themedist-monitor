# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

ThemeDist Monitor — a Next.js 14 (App Router) dashboard that monitors the ThemeDist theme-distribution API (Vercel + Netlify deployments): endpoint uptime/latency, schema validation, and security auditing (XSS / CSS injection scanning of daily and community themes). Deployed on Vercel; persistence via Upstash Redis (`@vercel/kv`), with a local JSON-file fallback when KV env vars are absent.

## Commands

- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Test (all):** `npm test` (Vitest, tests live in `tests/`)
- **Test (watch):** `npm run test:watch`
- **Test (single file):** `npx vitest run tests/security.test.ts`
- **Lint:** `npm run lint` (Biome, config in `biome.json`; formatter disabled by design — match existing style manually)
- **One-shot monitor run:** `npm run monitor`

## Architecture

```
src/
├── app/            # App Router pages + /api/v1/* route handlers
│   ├── api/v1/     # monitor (cron entry), data (dashboard payload), status, badges, ...
│   ├── page.tsx    # dashboard (client components, Bento-style cards)
│   └── demo/       # theme preview playground
├── components/     # live-status, metrics-panel, sla-heatmap, theme-audit, alerts-history, ...
├── lib/            # core logic (all server-side except i18n)
│   ├── monitor.ts      # runAllChecks(): probes endpoints, raises/resolves alerts
│   ├── security.ts     # XSS scanning (context-aware: display fields vs executable contexts)
│   ├── css-analyzer.ts # 3-layer CSS audit: raw regex + escape-decoded regex + PostCSS AST
│   ├── html-sanitizer.ts # allowlist HTML sanitizer for theme extensions
│   ├── notifier.ts     # email (QQ SMTP) + webhook fan-out, rate-limited per alert type
│   ├── webhook.ts      # feishu/dingtalk/wecom/slack/discord/telegram payloads (env-configured)
│   ├── store.ts        # KV (sorted sets/hash/string) with JSON-file fallback
│   └── kv.ts           # Upstash REST wrapper; isKvConfigured() gates all KV paths
└── types/          # shared interfaces (PerformanceLog, ThemeSnapshot, SystemAlert, ...)
```

Key invariants:

- **Security modules are test-covered.** `tests/` holds bypass-payload suites for `security.ts`, `css-analyzer.ts`, `html-sanitizer.ts`. Any change to sanitizer/audit rules must keep these green and should add cases for new bypass vectors.
- **Regexes used with `.test()` must not carry the `g` flag** (stateful `lastIndex` causes phantom matches) — see note at top of `security.ts`.
- **Alert flow:** 3 consecutive failures → alert; KV-backed cooldown + per-type rate limits in `notifier.ts`; alerts auto-resolve on recovery. Notification = email OR any configured webhook.
- **Webhook env vars:** `ALERT_WEBHOOK_FEISHU|DINGTALK|WECOM|SLACK|DISCORD`, `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. Email: `QQ_EMAIL_USER`, `QQ_EMAIL_PASS`, `NOTIFY_EMAIL`.
- **Data retention:** performance logs & metrics 7 days (KV sorted sets), alerts capped at 200.
