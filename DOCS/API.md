# ThemeDist Monitor — API 接口文档

Base URL: `https://themedist-monitor.vercel.app`

所有接口均为公开访问，无需鉴权。

---

## 状态徽章

### GET /api/badges/:type

返回 SVG 状态徽章（shields.io 风格），可嵌入 README 文件或仪表盘。

**路径参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `:type` | `string` | 支持的徽章类型，可选值见下表。 |

**支持的类型：**

| Type | 说明 |
|---|---|
| `vercel` | Vercel 平台状态 |
| `netlify` | Netlify 平台状态 |
| `theme` | 当前主题安全状态 |
| `database` | 数据库/Redis 健康状态 |
| `uptime` | 整体可用率百分比 |

**响应格式：** `image/svg+xml`

**缓存策略：** CDN 5 分钟，stale-while-revalidate 10 分钟

**跨域支持：** 已启用 CORS（`*`）

**实时效果预览：**

![Vercel 状态](https://themedist-monitor.vercel.app/api/badges/vercel) ![Netlify 状态](https://themedist-monitor.vercel.app/api/badges/netlify) ![主题安全](https://themedist-monitor.vercel.app/api/badges/theme) ![数据库](https://themedist-monitor.vercel.app/api/badges/database) ![可用率](https://themedist-monitor.vercel.app/api/badges/uptime)

**使用示例（Markdown）：**

```markdown
![Vercel 状态](https://themedist-monitor.vercel.app/api/badges/vercel)
![Netlify 状态](https://themedist-monitor.vercel.app/api/badges/netlify)
![主题安全](https://themedist-monitor.vercel.app/api/badges/theme)
![数据库](https://themedist-monitor.vercel.app/api/badges/database)
![可用率](https://themedist-monitor.vercel.app/api/badges/uptime)
```

---

## 平台健康状态

### GET /api/status

获取所有监控平台的当前健康摘要。

**响应格式：** `application/json`

```json
{
  "overall": "healthy",
  "platforms": {
    "vercel": {
      "status": "online",
      "latencyMs": 245,
      "cacheStatus": "HIT"
    },
    "netlify": {
      "status": "online",
      "latencyMs": 312,
      "cacheStatus": "MISS"
    }
  },
  "theme": {
    "date": "2026-05-24",
    "presetName": "Minimal Blue",
    "themeCount": 12,
    "isSafe": true
  },
  "checkedAt": "2026-05-24T00:00:00.000Z"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | `string` | 可选值: `online` \| `slow`（>2s）\| `outage` \| `unknown` |
| `overall` | `string` | 可选值: `healthy` \| `degraded` \| `down` \| `unknown` |

**缓存策略：** CDN 30 秒，stale-while-revalidate 120 秒

---

## 仪表盘完整数据

### GET /api/data

获取仪表盘所需的完整数据：实时状态、性能指标、性能日志、主题快照及告警信息。

**响应格式：** `application/json`

```json
{
  "status": {
    "vercel": { "status": "online", "latencyMs": 245 },
    "netlify": { "status": "online", "latencyMs": 312 },
    "db": "healthy"
  },
  "metrics": {
    "avgLatency24h": { "vercel": 280, "netlify": 340 },
    "cdnHitRate": 85,
    "themeCount": 12
  },
  "performanceLogs": [ ... ],
  "latestSnapshot": {
    "id": "uuid",
    "date": "2026-05-24",
    "preset": "minimal-blue",
    "presetName": "Minimal Blue",
    "author": "themedist",
    "themeCount": 12,
    "isValidSchema": true,
    "securityStatus": "safe"
  },
  "alerts": {
    "unresolved": [ ... ],
    "recent": [ ... ]
  },
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```

**缓存策略：** CDN 30 秒，stale-while-revalidate 60 秒

---

## 触发监控检测

### GET /api/monitor
### POST /api/monitor

触发一次完整的监控检测：抓取 Vercel 和 Netlify 端点数据、校验 Schema、执行安全扫描、检查数据库健康状态。

**频率限制：** 每 30 秒限调用 1 次

**响应格式：** `application/json`

```json
{
  "message": "Monitor check complete",
  "timestamp": "2026-05-24T12:00:00.000Z",
  "performanceLogs": [ ... ],
  "themeSnapshot": { ... },
  "alerts": [ ... ],
  "notificationsSent": 0
}
```

### DELETE /api/monitor

清除所有已存储的监控数据（性能日志、主题快照、告警记录）。

**响应格式：** `application/json`

```json
{ "message": "All monitoring data cleared" }
```

---

## 安全审计状态

### GET /api/security-status

获取最新的主题安全审计结果，包含风险标记原因。

**响应格式：** `application/json`

```json
{
  "status": "safe",
  "message": "当前主题可安全使用",
  "securityStatus": "safe",
  "flaggedReasons": [],
  "schemaValid": true,
  "themeName": "Minimal Blue",
  "checkedAt": "2026-05-24",
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```

**缓存策略：** 5 分钟 (revalidate)

---

## 网络诊断

### GET /api/diagnose

从服务器端探测与关键端点的网络连通性，适用于调试网络或代理问题。

**频率限制：** 每 30 秒限调用 1 次

**响应格式：** `application/json`

```json
{
  "env": {
    "HTTPS_PROXY": "not set",
    "HTTP_PROXY": "not set"
  },
  "probes": [
    {
      "url": "themedist.vercel.app/api/today.json",
      "ok": true,
      "status": 200,
      "ms": 245
    },
    {
      "url": "www.baidu.com",
      "ok": true,
      "status": 200,
      "ms": 180
    }
  ],
  "summary": "All reachable",
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```

**HTTP 状态码：** 全部可达返回 `200`，任一探测失败返回 `502`

---

## 安全主题代理

### GET /api/today-safe

从 ThemeDist（Vercel 优先，Netlify 备用）代理获取最新的 `today.json` 数据，并应用 XSS 清洗。下游主题渲染器可直接安全消费。

**响应格式：** `application/json`

```json
{
  "date": "2026-05-24",
  "preset": "minimal-blue",
  "presetName": "Minimal Blue",
  "author": "themedist",
  "available": 12,
  "cssVars": { "--color-primary": "#3b82f6" },
  "customCss": "...",
  "extensions": [ ... ],
  "directory": [ ... ],
  "_meta": {
    "sanitized": true,
    "schemaValid": true,
    "timestamp": "2026-05-24T12:00:00.000Z"
  }
}
```

**异常处理：** 两个平台均不可达时返回 `502`

---

## 全球边缘探测

### GET /api/probe

在 Vercel Edge Runtime 上运行的地理边缘探测。测试多区域到双平台的延迟。

**运行时环境：** Edge Runtime

**响应格式：** `application/json`

```json
{
  "probe": {
    "region": "US",
    "duration": 520
  },
  "results": [
    {
      "id": "uuid",
      "timestamp": "2026-05-24T12:00:00.000Z",
      "region": "US",
      "platform": "vercel",
      "endpoint": "https://themedist.vercel.app/api/today.json",
      "statusCode": 200,
      "latencyMs": 245
    },
    {
      "id": "uuid",
      "timestamp": "2026-05-24T12:00:00.000Z",
      "region": "US",
      "platform": "netlify",
      "endpoint": "https://themedist.netlify.app/api/today.json",
      "statusCode": 200,
      "latencyMs": 312
    }
  ]
}
```

**触发方式：** Vercel Cron 自动调度，每天 `0 6 * * *`

---

## 遥测上报

### POST /api/telemetry

接收真实用户监控（RUM）遥测数据，用于性能跟踪。

**请求体格式：** `application/json`

| 字段 | 类型 | 必填 | 约束与说明 |
|---|---|---|---|
| `duration` | `number` | 是 | 范围：0–60000 ms |
| `platform` | `string` | 否 | 例如 `vercel`、`netlify` |

**请求体示例：**

```json
{
  "duration": 245,
  "platform": "vercel"
}
```

**响应格式：** `application/json`

```json
{ "ok": true }
```

**异常处理：** `duration` 无效或超出范围时返回 `400`

---

## 通用 HTTP 状态码

| 状态码 | 含义 |
|---|---|
| `200` | 成功 |
| `400` | 请求体无效 |
| `404` | 未知徽章类型 |
| `429` | 触发频率限制（monitor、diagnose） |
| `502` | 上游平台不可达 |
```

---
