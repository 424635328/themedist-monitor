# ThemeDist Monitor

Dual-platform monitoring dashboard for [ThemeDist](https://themedist.vercel.app) — tracks availability, latency, CDN cache hit rates, theme security, and database health across Vercel and Netlify deployments.

![Vercel Status](https://themedist-monitor.vercel.app/api/badges/vercel)
![Netlify Status](https://themedist-monitor.vercel.app/api/badges/netlify)
![Theme Safety](https://themedist-monitor.vercel.app/api/badges/theme)
![Database](https://themedist-monitor.vercel.app/api/badges/database)
![Uptime](https://themedist-monitor.vercel.app/api/badges/uptime)

## Features

- **Multi-platform monitoring** — checks Vercel and Netlify endpoints every 24h via cron
- **Theme security audit** — validates `today.json` schema and scans for XSS/malicious content
- **CDN cache tracking** — monitors Vercel CDN HIT/MISS rates
- **DIY theme health** — checks the community themes API for Redis/database degradation
- **Alert auto-resolve** — automatically clears outage/security alerts when platforms recover
- **Badge API** — embeddable SVG status badges for READMEs and dashboards
- **Proxy-aware** — supports `HTTPS_PROXY` for local development behind corporate proxies
- **i18n** — Chinese and English UI translations

## Quick Start

```bash
npm install
npm run dev            # Development server at localhost:3000
npm run monitor        # Run a manual monitor check
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard, [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for API documentation.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `KV_REST_API_URL` | No | Vercel KV URL for persistent storage |
| `KV_REST_API_TOKEN` | No | Vercel KV auth token |
| `HTTPS_PROXY` | No | Proxy URL for local dev behind firewall |
| `HTTP_PROXY` | No | HTTP proxy URL |
| `SMTP_HOST` | No | SMTP server for alert notifications |
| `SMTP_PORT` | No | SMTP port (default 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `ALERT_EMAIL` | No | Destination email for alerts |

Without KV, data is stored on the filesystem (`/tmp/data` on Vercel, `./data` locally).

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/badges/[type]` | GET | SVG status badge (`vercel`, `netlify`, `theme`, `database`, `uptime`) |
| `/api/status` | GET | Platform health summary (CORS enabled) |
| `/api/data` | GET | Full dashboard data (status, metrics, logs, alerts) |
| `/api/monitor` | GET/POST | Trigger a monitor run |
| `/api/monitor` | DELETE | Clear all monitoring data |
| `/api/security-status` | GET | Latest theme security audit result |
| `/api/diagnose` | GET | Network connectivity probe |
| `/api/today-safe` | GET | Proxied & sanitized `today.json` from ThemeDist |
| `/api/probe` | GET | Geographic edge probe (Vercel Edge) |
| `/api/telemetry` | POST | Submit RUM telemetry entry |

Full reference: [DOCS/API.md](DOCS/API.md) or live at `/api-docs`

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Dashboard UI
│   ├── api-docs/page.tsx           # API documentation page
│   └── api/
│       ├── badges/[type]/          # SVG badge endpoint
│       ├── status/                 # Platform health summary
│       ├── data/                   # Full dashboard data
│       ├── monitor/                # Trigger monitor runs
│       ├── security-status/        # Theme security audit
│       ├── diagnose/               # Network connectivity probe
│       ├── today-safe/             # Sanitized theme data proxy
│       ├── probe/                  # Edge probe (Vercel Edge Runtime)
│       └── telemetry/              # RUM telemetry ingestion
├── components/                     # React components
└── lib/
    ├── monitor.ts                  # Core monitoring logic
    ├── store.ts                    # Data persistence (KV or filesystem)
    ├── kv.ts                       # Vercel KV wrapper
    ├── security.ts                 # XSS/content security scanner
    ├── validator.ts                # Schema validation
    ├── notifier.ts                 # Email alert notifications
    ├── archiver.ts                 # Data archival
    ├── fetch-proxy.ts              # Proxy-aware fetch
    ├── rate-limit.ts               # Rate limiting
    └── i18n.tsx                    # Chinese/English translations
```

## Deployment

Designed for [Vercel](https://vercel.com). The included `vercel.json` configures cron jobs:

- `0 0 * * *` — Daily monitor check via `/api/monitor`
- `0 6 * * *` — Geographic edge probe via `/api/probe`

## License

[GPL-3.0](LICENSE)
