# ThemeDist Monitor — API 接口文档

Base URL: `https://themedist-monitor.vercel.app`

---

## 项目概述

ThemeDist Monitor 是 [ThemeDist](https://themedist.vercel.app) 每日主题分发服务的**双平台健康监控与安全审计系统**。ThemeDist 本身是一个基于 CSS 变量的每日主题推送服务，同时部署在 Vercel 与 Netlify 双平台上，为下游网站提供每日自动切换的视觉主题。

本项目作为 ThemeDist 的"体检中心"，以独立的第三方视角对上游服务进行 24 小时不间断监控，覆盖以下维度：

- **可用性监控** — 定时探测 Vercel 与 Netlify 双平台端点，记录 HTTP 状态码与响应延迟
- **CDN 缓存追踪** — 监控 Vercel CDN 的缓存命中率（HIT/MISS/BYPASS），衡量边缘缓存效率
- **主题安全审计** — 对每日主题数据进行 XSS 扫描、CSS 恶意代码检测、HTML 清洗与 Schema 校验
- **数据库健康检查** — 探测 DIY 社区主题 API 以评估后端数据库与 Redis 的健康状态
- **告警与通知** — 平台宕机或安全事件时自动触发邮件告警，恢复后自动解除
- **公开 API 与徽章** — 提供免鉴权的 RESTful API 与 SVG 状态徽章，供社区嵌入 README 或第三方仪表盘

### 适用人群

| 角色 | 用途 |
|---|---|
| ThemeDist 使用者 | 通过徽章或 `/api/v1/status` 检查主题服务是否正常，决定是否使用当日主题 |
| 主题作者 / 社区贡献者 | 通过安全审计接口校验自定义主题是否存在 XSS 风险 |
| 下游网站开发者 | 使用 `/api/v1/today-safe` 作为安全代理获取已清洗的主题数据；通过 RUM 遥测上报客户端性能 |
| 运维 / SRE | 监控双平台延迟趋势、CDN 命中率、SLA 可用率；诊断网络连通性 |

---

## 设计意图

### 1. 独立第三方视角

ThemeDist Monitor 部署在独立的 Vercel 项目中，不共享 ThemeDist 的任何运行时资源。这种分离确保：

- ThemeDist 自身宕机时，监控系统不受影响，仍可记录和报告故障
- 监控数据不受 ThemeDist 服务端缓存或 CDN 策略干扰
- 可作为 ThemeDist 用户的"外部看门狗"，提供独立信任锚点

### 2. 安全优先

ThemeDist 的核心功能是将第三方贡献的主题 CSS 变量分发给所有使用方。这意味着**一个恶意主题可能通过 CSS 注入或 XSS 攻击影响所有下游网站**。因此本项目的安全审计管线是设计核心：

```
获取主题数据 → Schema 校验 → HTML 标签清洗 → XSS 模式扫描 → CSS 安全分析 → 安全判定
```

每一层都是独立的防线——即使上游校验失效，下游清洗仍会拦截风险内容。

### 3. 公开透明

所有 API 均为公开访问、免鉴权、启用 CORS。监控数据本身是公共信息——ThemeDist 服务的健康状况不应是黑盒。这种设计也使得社区可以基于这些 API 构建自己的工具。

### 4. 双平台对比

ThemeDist 同时托管在 Vercel 和 Netlify 上，两个平台的 CDN 策略、冷启动行为、边缘网络拓扑均有差异。本项目并排展示两个平台的数据，帮助用户理解不同部署环境的实际表现差异。

### 5. 可嵌入性

SVG 徽章 API 的核心设计意图是让 ThemeDist 的状态信息可以**零成本嵌入到任何地方**——README 文件、Wiki 页面、Notion 文档、自定义仪表盘。徽章本身是静态 SVG 图片，不需要 JavaScript，不需要 iframe。

---

## 协议规范

### 基础约定

| 项目 | 规范 |
|---|---|
| 数据格式 | 所有响应体均为 `application/json`（徽章接口除外，返回 `image/svg+xml`） |
| 字符编码 | UTF-8 |
| 时间戳格式 | ISO 8601（`2026-05-24T12:00:00.000Z`） |
| 日期格式 | ISO 8601 日期（`2026-05-24`） |
| 跨域支持 | 所有端点启用 CORS，允许任意来源（`Access-Control-Allow-Origin: *`） |
| 鉴权 | 所有 GET 端点免鉴权；POST/DELETE 操作需 `Authorization: Bearer <CRON_SECRET>` |
| 部署区域 | Vercel 全球边缘网络（Edge Runtime 端点为 `hkg1` 或其他自动选择区域） |

### HTTP 状态码约定

| 状态码 | 含义 | 适用场景 |
|---|---|---|
| `200` | 成功 | 正常响应 |
| `400` | 请求无效 | 请求体格式错误、参数超出范围（如 telemetry duration > 60000） |
| `404` | 资源不存在 | 未知的徽章类型、不存在的端点 |
| `429` | 频率限制 | monitor（30s/次）、diagnose（30s/次）触发限流 |
| `502` | 上游不可达 | ThemeDist 双平台均无法访问（today-safe）、网络诊断全部失败（diagnose） |
| `500` | 服务器内部错误 | 未预期的运行时异常 |

### 缓存策略

各端点根据数据新鲜度需求采用不同的 `Cache-Control` 策略：

| 端点 | CDN 缓存 | SWR | 说明 |
|---|---|---|---|
| `/api/v1/badges/:type` | 300s | 600s | 徽章内容变化频率低 |
| `/api/v1/status` | 30s | 120s | 状态信息需较新鲜 |
| `/api/v1/data` | 30s | 60s | 仪表盘数据需近实时 |
| `/api/v1/security-status` | 300s | — | 安全审计每日更新一次 |
| 其他端点 | 无缓存 | — | 实时数据，不缓存 |

### 频率限制

为防止滥用，以下端点实现了基于 KV 的冷却期限制：

- `/api/v1/monitor` — 30 秒内最多调用 1 次
- `/api/v1/diagnose` — 30 秒内最多调用 1 次
- `/api/v1/today-safe` — 恶意 IP 1 小时内违规 5 次将封禁 24 小时

触发限流时返回 `429 Too Many Requests`。

### 状态枚举值

平台状态：

| 值 | 含义 |
|---|---|
| `online` | 正常响应（延迟 ≤ 2s） |
| `slow` | 响应延迟 > 2s，但仍在正常返回数据 |
| `outage` | 无法连接或返回非 2xx/3xx 状态码 |
| `unknown` | 尚无监控数据 |

整体健康度：

| 值 | 含义 |
|---|---|
| `healthy` | 所有平台正常运行 |
| `degraded` | 至少一个平台出现 slow 或异常 |
| `down` | 所有平台不可用 |
| `unknown` | 尚无监控数据 |

安全状态：

| 值 | 含义 |
|---|---|
| `safe` | 未检测到安全风险 |
| `unsafe` | 检测到 XSS、恶意 CSS 或 Schema 不匹配 |

---

## API 端点参考

---

### 状态徽章

#### GET /api/v1/badges/:type

返回 SVG 状态徽章（shields.io 风格），可嵌入 README 文件、文档页面或第三方仪表盘。徽章内容根据最新的监控数据动态生成。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `:type` | `string` | 是 | 徽章类型，可选值见下表 |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `debug` | `string` | 否 | 设为 `1` 时返回 JSON 格式的调试信息而非 SVG 图片 |

**支持的徽章类型：**

| `:type` 值 | 徽章标题 | 数据来源 | 状态映射 |
|---|---|---|---|
| `vercel` | Vercel | `/api/v1/status` → platforms.vercel.status | online=绿色, slow=黄色, outage=红色, unknown=灰色 |
| `netlify` | Netlify | `/api/v1/status` → platforms.netlify.status | 同上 |
| `theme` | Theme Safety | `/api/v1/status` → theme.isSafe | true=绿色, false=红色 |
| `database` | Database | `/api/v1/status` → theme 数据可用性 | healthy=绿色, 其他=红色 |
| `uptime` | Uptime | SLA 统计（近 7 日） | 百分比数值 |

**响应格式：**

- 默认：`image/svg+xml`（SVG 图片，可直接用于 `<img>` 标签）
- `?debug=1`：`application/json`

**调试输出示例（`?debug=1`）：**

```json
{
  "type": "vercel",
  "label": "Vercel",
  "status": "online",
  "color": "brightgreen",
  "message": "online"
}
```

**缓存策略：** CDN 300s，SWR 600s

**跨域支持：** 已启用 CORS（`*`）

**实时效果预览：**

![Vercel 状态](https://themedist-monitor.vercel.app/api/v1/badges/vercel)
![Netlify 状态](https://themedist-monitor.vercel.app/api/v1/badges/netlify)
![主题安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)
![数据库](https://themedist-monitor.vercel.app/api/v1/badges/database)
![可用率](https://themedist-monitor.vercel.app/api/v1/badges/uptime)

**使用示例：**

Markdown（嵌入 README）：

```markdown
![Vercel 状态](https://themedist-monitor.vercel.app/api/v1/badges/vercel)
![Netlify 状态](https://themedist-monitor.vercel.app/api/v1/badges/netlify)
![主题安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)
```

HTML（嵌入网页）：

```html
<img src="https://themedist-monitor.vercel.app/api/v1/badges/vercel" alt="Vercel Status" />
<img src="https://themedist-monitor.vercel.app/api/v1/badges/theme" alt="Theme Safety" />
```

curl 调试：

```bash
# 获取 SVG 徽章
curl -sS 'https://themedist-monitor.vercel.app/api/v1/badges/vercel'

# 调试模式查看 JSON 元数据
curl -sS 'https://themedist-monitor.vercel.app/api/v1/badges/vercel?debug=1' | jq .
```

---

### 平台健康状态

#### GET /api/v1/status

获取所有监控平台的当前健康摘要。这是最轻量的状态查询端点——运行在 Vercel Edge Runtime 上，延迟极低（全球边缘响应通常在 50ms 以内），适合用作健康检查端点或监控告警的数据源。

**运行时环境：** Edge Runtime

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

**响应字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `overall` | `string` | 整体健康状态：`healthy` / `degraded` / `down` / `unknown` |
| `platforms.vercel.status` | `string` | Vercel 平台状态：`online` / `slow` / `outage` / `unknown` |
| `platforms.vercel.latencyMs` | `number` | Vercel 最近一次探测的响应延迟（毫秒） |
| `platforms.vercel.cacheStatus` | `string` | CDN 缓存状态：`HIT` / `MISS` / `BYPASS` / `N/A` |
| `platforms.netlify.*` | — | 同上结构，对应 Netlify 平台 |
| `theme.date` | `string` | 当前主题日期 |
| `theme.presetName` | `string` | 当前预设主题名称 |
| `theme.themeCount` | `number` | 当前可用主题数量 |
| `theme.isSafe` | `boolean` | 当前主题是否通过安全审计 |
| `checkedAt` | `string` | 最近一次监控检测的 ISO 8601 时间戳 |

**缓存策略：** CDN 30s，SWR 120s

**使用建议：** 此端点数据来源于 KV 存储中最近一次监控检测的结果摘要，读取极快。适合轮询场景：建议每 30-60 秒请求一次。

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/status' | jq .
```

**JavaScript 示例（浏览器）：**

```javascript
async function checkHealth() {
  const res = await fetch('https://themedist-monitor.vercel.app/api/v1/status');
  const data = await res.json();
  console.log(`Overall: ${data.overall}`);
  console.log(`Vercel: ${data.platforms.vercel.status} (${data.platforms.vercel.latencyMs}ms)`);
  console.log(`Netlify: ${data.platforms.netlify.status} (${data.platforms.netlify.latencyMs}ms)`);
  return data;
}
```

---

### 仪表盘完整数据

#### GET /api/v1/data

获取仪表盘所需的完整数据：实时状态、24 小时性能指标、性能日志历史、主题快照、告警记录以及安全事件日志。此端点是 `/api/v1/status` 的超集，适合需要展示图表或历史数据的场景。

**响应格式：** `application/json`

```json
{
  "status": {
    "vercel": { "status": "online", "latencyMs": 245, "cacheStatus": "HIT" },
    "netlify": { "status": "online", "latencyMs": 312, "cacheStatus": "MISS" },
    "db": "healthy"
  },
  "metrics": {
    "avgLatency24h": { "vercel": 280, "netlify": 340 },
    "cdnHitRate": 85,
    "themeCount": 12,
    "sla": { "7day": 99.8, "30day": 99.5 }
  },
  "performanceLogs": [
    {
      "id": "uuid",
      "timestamp": "2026-05-24T12:00:00.000Z",
      "platform": "vercel",
      "endpoint": "https://themedist.vercel.app/api/v1/today.json",
      "statusCode": 200,
      "latencyMs": 245,
      "cacheStatus": "HIT",
      "cacheControl": "public, max-age=3600"
    }
  ],
  "latestSnapshot": {
    "id": "uuid",
    "date": "2026-05-24",
    "preset": "minimal-blue",
    "presetName": "Minimal Blue",
    "author": "themedist",
    "themeCount": 12,
    "isValidSchema": true,
    "securityStatus": "safe",
    "flaggedReasons": []
  },
  "alerts": {
    "unresolved": [],
    "recent": []
  },
  "securityIncidents": [],
  "metricsHistory": {
    "vercelLatency": [{ "timestamp": "...", "value": 245 }],
    "netlifyLatency": [{ "timestamp": "...", "value": 312 }],
    "cdnHitRate": [{ "timestamp": "...", "value": 85 }]
  },
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```

**核心字段说明：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | `object` | 当前平台实时状态（结构同 `/api/v1/status`） |
| `metrics.avgLatency24h` | `object` | 过去 24 小时 Vercel / Netlify 各平台平均延迟 |
| `metrics.cdnHitRate` | `number` | 过去 24 小时 CDN 缓存命中率（百分比，0-100） |
| `metrics.sla` | `object` | 7 天与 30 天 SLA 可用率（百分比） |
| `performanceLogs` | `array` | 最近的性能日志条目（扫描窗口为最近 4 条记录） |
| `latestSnapshot` | `object` | 最近一次主题快照（安全审计结果） |
| `alerts.unresolved` | `array` | 当前未解除的告警 |
| `alerts.recent` | `array` | 最近的告警记录（含已解除） |
| `metricsHistory` | `object` | 各指标的历史时序数据，供图表渲染 |

**缓存策略：** CDN 30s，SWR 60s

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/data' | jq '.metrics'
```

---

### 触发监控检测

#### GET /api/v1/monitor

公开触发一次完整的监控检测流程，无需鉴权。完整流程包括：

1. 并行抓取 Vercel、Netlify 及 DIY 社区主题端点的数据
2. 记录每个端点的 HTTP 状态码、延迟、CDN 缓存头
3. 对主题数据执行 JSON Schema 校验
4. 执行 XSS 安全扫描（脚本标签、事件处理器、javascript: URI 等）
5. 执行 CSS 安全分析（`@import` 外链、`expression()` 等）
6. 对主题扩展字段执行 HTML 清洗
7. 检查数据库 / Redis 健康状态
8. 将性能日志与主题快照写入持久存储
9. 根据结果生成或解除告警，必要时发送邮件通知

**频率限制：** 30 秒内最多调用 1 次（使用 KV 互斥锁防止并发重复执行）

**响应格式：** `application/json`

```json
{
  "message": "Monitor check complete",
  "timestamp": "2026-05-24T06:51:05.605Z",
  "performanceLogs": [
    {
      "id": "839c12f6-...",
      "timestamp": "2026-05-24T06:51:01.354Z",
      "platform": "vercel",
      "endpoint": "https://themedist.vercel.app/api/v1/today.json",
      "statusCode": 200,
      "latencyMs": 820,
      "cacheStatus": "MISS",
      "cacheControl": "public, max-age=3600",
      "error": null
    }
  ],
  "themeSnapshot": {
    "id": "3ce3e8ad-...",
    "date": "2026-05-24",
    "preset": "holiday-144",
    "presetName": "BUDDHA BIRTHDAY",
    "themeCount": 147,
    "isValidSchema": true,
    "securityStatus": "safe",
    "flaggedReasons": []
  },
  "alerts": [],
  "notificationsSent": 0
}
```

**响应字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `message` | `string` | 执行结果描述 |
| `performanceLogs` | `array` | 本次检测产生的全部性能日志条目 |
| `themeSnapshot` | `object` | 本次检测产生的主题快照 |
| `alerts` | `array` | 本次检测触发的告警列表（含新告警与已恢复告警） |
| `notificationsSent` | `number` | 本次检测发送的邮件通知数量 |

**curl 示例：**

```bash
# 手动触发检测
curl -sS 'https://themedist-monitor.vercel.app/api/v1/monitor' | jq .

# 仅查看是否触发告警
curl -sS 'https://themedist-monitor.vercel.app/api/v1/monitor' | jq '.alerts'
```

---

#### POST /api/v1/monitor

与 GET 执行相同的检测流程，但需要鉴权。此端点专供 Vercel Cron Jobs 定时调度使用。

**请求头：**

| Header | 值 |
|---|---|
| `Authorization` | `Bearer <CRON_SECRET>` |
| `Content-Type` | `application/json` |

**响应格式：** 同 GET `/api/v1/monitor`

**curl 示例：**

```bash
curl -sS -X POST \
  -H 'Authorization: Bearer your-cron-secret' \
  'https://themedist-monitor.vercel.app/api/v1/monitor' | jq .
```

---

### 数据管理

#### DELETE /api/v1/monitor

清除所有已存储的监控数据，包括性能日志、主题快照、告警记录、安全事件日志和状态哈希。需鉴权。

**请求头：**

| Header | 值 |
|---|---|
| `Authorization` | `Bearer <CRON_SECRET>` |

**响应格式：** `application/json`

```json
{ "message": "All monitoring data cleared" }
```

**curl 示例：**

```bash
curl -sS -X DELETE \
  -H 'Authorization: Bearer your-cron-secret' \
  'https://themedist-monitor.vercel.app/api/v1/monitor'
```

---

### 安全审计状态

#### GET /api/v1/security-status

获取最近一次主题安全审计的详细结果。适合主题作者或安全研究人员在发布主题后验证其安全性。

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

**当检测到风险时的响应示例：**

```json
{
  "status": "unsafe",
  "message": "检测到安全风险",
  "securityStatus": "unsafe",
  "flaggedReasons": [
    "检测到事件处理器: onclick",
    "检测到 javascript: 协议"
  ],
  "schemaValid": true,
  "themeName": "Malicious Theme",
  "checkedAt": "2026-05-24",
  "timestamp": "2026-05-24T12:00:00.000Z"
}
```

**安全扫描覆盖的风险类型：**

| 风险类型 | 检测模式 |
|---|---|
| 脚本注入 | `<script>` 标签 |
| 事件处理器 | `onclick`, `onerror`, `onload`, `onmouseover` 等 HTML 事件属性 |
| JavaScript 协议 | `javascript:` URI |
| Cookie 窃取 | `document.cookie` |
| 代码执行 | `eval()`, `Function()` |
| iframe 注入 | `<iframe>` 标签 |
| CSS 表达式 | `expression()`, `behavior`, `-moz-binding` |
| 恶意外链 | CSS 中的 `@import` 非白名单域名 |
| 数据注入 | `data:text/html` URI |

**缓存策略：** CDN 300s（revalidate）

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/security-status' | jq .
```

---

### 网络诊断

#### GET /api/v1/diagnose

从服务器端探测与关键端点的网络连通性。此端点对于以下场景尤其有用：

- 怀疑是否存在区域性网络阻断
- 验证代理配置是否正确（通过 `env` 字段查看代理状态）
- 区分"ThemeDist 宕机"和"自身网络问题"

探测目标包括 ThemeDist 的双平台端点以及一个知名公网主机（baidu.com）作为对照组。

**频率限制：** 30 秒内最多调用 1 次

**响应格式：** `application/json`

```json
{
  "env": {
    "HTTPS_PROXY": "not set",
    "HTTP_PROXY": "not set"
  },
  "probes": [
    {
      "url": "themedist.vercel.app/api/v1/today.json",
      "ok": true,
      "status": 200,
      "ms": 245
    },
    {
      "url": "themedist.netlify.app/api/v1/today.json",
      "ok": true,
      "status": 200,
      "ms": 312
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

**诊断解读：**

| 现象 | 可能原因 |
|---|---|
| ThemeDist 端点失败、baidu.com 成功 | ThemeDist 服务问题 |
| 所有端点均失败 | 服务器自身网络问题或代理配置错误 |
| `HTTPS_PROXY` 有值但连接失败 | 代理服务器不可达或配置错误 |

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/diagnose' | jq .
```

---

### 安全主题代理

#### GET /api/v1/today-safe

从 ThemeDist 代理获取最新的每日主题数据，并应用完整的安全清洗管线。此端点是下游主题消费者的**推荐接入点**——它返回的数据可以直接用于设置 CSS 变量，无需额外的客户端清洗。

**请求流程：**

1. 优先从 `themedist.vercel.app` 获取 `today.json`
2. 若 Vercel 端点不可达，回退到 `themedist.netlify.app`
3. 对获取的数据依次执行：Schema 校验 → HTML 标签清洗 → XSS 扫描 → CSS 安全分析
4. 将清洗后的安全版本缓存到 KV（作为"最后已知安全版本"）
5. 若双平台均不可达，返回缓存的安全版本
6. 若恶意 IP 频繁访问，触发自动封禁

**响应格式：** `application/json`

```json
{
  "date": "2026-05-24",
  "preset": "minimal-blue",
  "presetName": "Minimal Blue",
  "author": "themedist",
  "available": 12,
  "cssVars": {
    "--color-primary": "#3b82f6",
    "--color-bg": "#0f172a"
  },
  "customCss": ":root { ... }",
  "extensions": [],
  "directory": [],
  "_meta": {
    "sanitized": true,
    "schemaValid": true,
    "source": "vercel",
    "timestamp": "2026-05-24T12:00:00.000Z"
  }
}
```

**`_meta` 字段说明：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `sanitized` | `boolean` | 是否经过了安全清洗 |
| `schemaValid` | `boolean` | 数据是否通过 Schema 校验 |
| `source` | `string` | 数据来源：`vercel` / `netlify` / `cache`（回退缓存） |
| `timestamp` | `string` | 数据获取时间戳 |

**异常处理：** 两个平台均不可达且无缓存时返回 `502`

**JavaScript 集成示例：**

```javascript
async function applyTheme() {
  try {
    const res = await fetch('https://themedist-monitor.vercel.app/api/v1/today-safe');
    if (!res.ok) {
      console.error('无法获取安全主题数据');
      return;
    }
    const theme = await res.json();
    // 直接将清洗后的 CSS 变量应用到 :root
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    console.log(`已应用主题: ${theme.presetName} (来源: ${theme._meta.source})`);
  } catch (err) {
    console.error('主题加载失败', err);
  }
}
```

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/today-safe' | jq '._meta'
```

---

### 全球边缘探测

#### GET /api/v1/probe

在 Vercel Edge Runtime 上运行的地理边缘探测。与 `/api/v1/monitor` 不同，此端点在 Vercel 的边缘节点上执行，自动选择距离请求来源最近的区域。用于收集多区域的延迟数据，评估 ThemeDist 的全球访问质量。

**运行时环境：** Edge Runtime

**响应格式：** `application/json`

```json
{
  "probe": {
    "region": "hkg1",
    "duration": 520
  },
  "results": [
    {
      "id": "uuid",
      "timestamp": "2026-05-24T12:00:00.000Z",
      "region": "hkg1",
      "platform": "vercel",
      "endpoint": "https://themedist.vercel.app/api/v1/today.json",
      "statusCode": 200,
      "latencyMs": 245
    },
    {
      "id": "uuid",
      "timestamp": "2026-05-24T12:00:00.000Z",
      "region": "hkg1",
      "platform": "netlify",
      "endpoint": "https://themedist.netlify.app/api/v1/today.json",
      "statusCode": 200,
      "latencyMs": 312
    }
  ]
}
```

**触发方式：** Vercel Cron 自动调度，每天 UTC 6:00（北京时间 14:00）执行一次。也可手动 GET 触发。

**curl 示例：**

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/probe' | jq '.probe.region'
```

---

### 遥测上报

#### POST /api/v1/telemetry

接收真实用户监控（RUM）遥测数据。下游网站可在加载 ThemeDist 主题时上报客户端的实际加载耗时，帮助完善性能画像。

**请求体格式：** `application/json`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---|---|---|
| `duration` | `number` | 是 | 0–60000（毫秒） | 客户端加载主题的耗时 |
| `platform` | `string` | 否 | `vercel` / `netlify` | 标识数据来源平台 |

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

**错误响应（duration 超出范围）：**

```json
{ "error": "duration 需为 0–60000 之间的数值" }
```

**浏览器集成示例：**

```javascript
// 在页面加载时记录主题获取耗时并上报
const start = performance.now();

fetch('https://themedist-monitor.vercel.app/api/v1/today-safe')
  .then(res => res.json())
  .then(theme => {
    const duration = Math.round(performance.now() - start);
    // 应用主题...
    Object.entries(theme.cssVars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    // 上报遥测（fire-and-forget）
    navigator.sendBeacon(
      'https://themedist-monitor.vercel.app/api/v1/telemetry',
      JSON.stringify({ duration, platform: 'vercel' })
    );
  });
```

**curl 示例：**

```bash
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -d '{"duration": 245, "platform": "vercel"}' \
  'https://themedist-monitor.vercel.app/api/v1/telemetry'
```

---

## 集成指南

### 场景一：在 README 中嵌入状态徽章

最简单直接的集成方式。将以下 Markdown 添加到你的 README.md：

```markdown
## ThemeDist 服务状态

![Vercel](https://themedist-monitor.vercel.app/api/v1/badges/vercel)
![Netlify](https://themedist-monitor.vercel.app/api/v1/badges/netlify)
![安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)
```

徽章图片会随监控数据自动更新，无需任何维护。

### 场景二：构建自定义状态面板

结合 `/api/v1/status` 和 `/api/v1/data` 构建你自己的监控仪表盘：

```javascript
// 轻量轮询 — 适合状态指示灯
setInterval(async () => {
  const { overall, platforms } = await fetch(
    'https://themedist-monitor.vercel.app/api/v1/status'
  ).then(r => r.json());

  updateIndicator('vercel-light', platforms.vercel.status);
  updateIndicator('netlify-light', platforms.netlify.status);
}, 30000); // 每 30 秒

// 完整数据 — 适合图表仪表盘
async function loadDashboard() {
  const data = await fetch(
    'https://themedist-monitor.vercel.app/api/v1/data'
  ).then(r => r.json());

  renderLatencyChart(data.metricsHistory.vercelLatency);
  renderCdnPieChart(data.metrics.cdnHitRate);
  renderAlertList(data.alerts.unresolved);
}
```

### 场景三：在你的网站中使用安全主题

下游网站消费 ThemeDist 主题的推荐方式——使用 `/api/v1/today-safe` 作为安全代理：

```javascript
// React Hook 示例
function useThemeDist() {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = performance.now();
    fetch('https://themedist-monitor.vercel.app/api/v1/today-safe')
      .then(res => res.json())
      .then(data => {
        setTheme(data);
        // 应用 CSS 变量
        const root = document.documentElement;
        Object.entries(data.cssVars).forEach(([k, v]) => {
          root.style.setProperty(k, v);
        });
        // 上报遥测
        const duration = Math.round(performance.now() - start);
        fetch('https://themedist-monitor.vercel.app/api/v1/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration, platform: 'vercel' }),
        }).catch(() => {}); // 静默失败
      })
      .finally(() => setLoading(false));
  }, []);

  return { theme, loading };
}
```

### 场景四：健康检查与告警集成

将 ThemeDist Monitor 集成到你的告警体系中：

```bash
#!/bin/bash
# crontab: */5 * * * * /path/to/themedist-healthcheck.sh

STATUS=$(curl -sS 'https://themedist-monitor.vercel.app/api/v1/status')
OVERALL=$(echo "$STATUS" | jq -r '.overall')

if [ "$OVERALL" = "down" ]; then
  # 触发你的告警通道（Slack、PagerDuty 等）
  echo "ThemeDist 全面宕机！" | mail -s "ALERT" ops@example.com
elif [ "$OVERALL" = "degraded" ]; then
  echo "ThemeDist 性能降级: $STATUS" | mail -s "WARN" ops@example.com
fi
```

### 场景五：网络故障排查

当用户反馈主题加载异常时，使用 `/api/v1/diagnose` 快速定位问题：

```bash
curl -sS 'https://themedist-monitor.vercel.app/api/v1/diagnose' | jq .
```

根据输出判断：
- 所有探测 OK → 问题可能在客户端
- ThemeDist 端点失败 → ThemeDist 服务问题
- 全部失败 → 网络或代理问题

---

## 开发参考

### 技术栈

| 层面 | 技术 | 说明 |
|---|---|---|
| 框架 | Next.js 14 (App Router) | React 全栈框架，Server Components + API Routes |
| 语言 | TypeScript 5 | 全量类型覆盖 |
| 样式 | Tailwind CSS 3 | 暗色主题设计系统 |
| 图表 | Recharts 2 | 延迟趋势折线图、CDN 饼图、响应时间面积图 |
| 存储 | Vercel KV (Upstash Redis) | 主存储：有序集合存日志、列表存告警、哈希存状态 |
| 存储回退 | 本地 JSON 文件 | 无 KV 配置时自动回退到 `./data/` 目录 |
| 邮件 | Nodemailer + QQ SMTP | 告警邮件通知 |
| 部署 | Vercel | 全球边缘网络，支持 Cron Jobs |
| 图标 | lucide-react | MIT 协议图标库 |

### 运行时环境

本项目混合使用两种 Vercel 运行时：

| 运行时 | 使用的端点 | 特点 |
|---|---|---|
| **Edge Runtime** | `/api/v1/status`, `/api/v1/probe` | 全球边缘节点执行，延迟极低（<50ms），适合健康检查和高频轮询。限制：无文件系统访问，仅支持部分 Node.js API |
| **Node.js Runtime** | 其余全部端点 | 完整 Node.js 能力：文件系统、KV 客户端、Nodemailer。冷启动较长，但功能不受限 |

### 数据流架构

```
Vercel Cron (每日 0:00 UTC)
       │
       ▼
POST /api/v1/monitor (Bearer 鉴权)
       │
       ▼
  runAllChecks()
       │
       ├─► fetch themedist.vercel.app  ─► PerformanceLog ─► KV ZSET
       ├─► fetch themedist.netlify.app ─► PerformanceLog ─► KV ZSET
       ├─► fetch DIY themes API       ─► DB health check
       └─► validate + security scan   ─► ThemeSnapshot ─► KV ZSET
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                              Alert 判定             Status Hash
                                    │                  (KV HASH)
                                    ▼
                              Email 通知
                           (Nodemailer + QQ SMTP)

用户请求:
  /api/v1/status   ─► 读取 KV HASH        ─► 即时响应 (Edge, <50ms)
  /api/v1/data     ─► 读取 KV ZSET/LIST   ─► 聚合响应 (Node, ~100ms)
  /api/v1/badges   ─► 读取 KV HASH        ─► 渲染 SVG (Node, ~50ms)
```

### 持久化策略

| 数据类型 | KV 数据结构 | 保留策略 | 本地回退文件 |
|---|---|---|---|
| 性能日志 | Sorted Set（按时间戳排序） | 7 天 | `data/performance-logs.json` |
| 主题快照 | Sorted Set（按时间戳排序） | 7 天 | `data/theme-snapshots.json` |
| 平台状态 | Hash（覆盖写入） | 永久（覆盖） | 内存 |
| 告警列表 | List（头部插入） | 永久 | `data/system-alerts.json` |
| 安全事件 | List（头部插入） | 永久 | KV 独占 |
| 遥测分布 | Sorted Set（延迟分桶） | 7 天 | KV 独占 |
| 速率限制 | String（含 TTL） | 自动过期 | KV 独占 |

### 安全架构

本项目的安全设计遵循纵深防御原则，每层独立运作：

```
第 1 层：Schema 校验
  └─ 验证 today.json 结构完整性（必需字段、CSS 变量数量下限）

第 2 层：HTML 清洗
  └─ 白名单标签 + 白名单属性 + 事件处理器剥离

第 3 层：XSS 模式扫描（14 条正则规则）
  └─ script 标签、事件处理器、javascript: 协议、document.cookie、
     eval()、iframe、data:text/html

第 4 层：CSS 安全分析
  └─ @import 外链白名单、expression() 检测、behavior 检测、
     -moz-binding 检测、url() 引用审查、变量数量异常检测

第 5 层：IP 封禁
  └─ 1 小时内违规 5 次 → 24 小时封禁
```

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 localhost:3000）
npm run dev

# 手动执行一次监控检测
npm run monitor

# 访问 API 文档
open http://localhost:3000/api-docs

# 访问仪表盘
open http://localhost:3000
```

本地开发时若位于企业代理后方，需在 `.env.local` 中配置：

```env
HTTPS_PROXY=http://proxy.example.com:8080
HTTP_PROXY=http://proxy.example.com:8080
```

### 目录结构

```
src/
├── app/
│   ├── page.tsx                       # 仪表盘 UI 主页
│   ├── layout.tsx                     # 根布局（Metadata + Providers）
│   ├── globals.css                    # 全局样式 + Tailwind 指令
│   ├── api-docs/page.tsx              # API 文档页（渲染 DOCS/API.md）
│   └── api/
│       ├── badges/[type]/route.ts     # SVG 徽章端点
│       ├── status/route.ts            # 平台健康摘要（Edge Runtime）
│       ├── data/route.ts              # 仪表盘完整数据
│       ├── monitor/route.ts           # 触发 / 清除监控检测
│       ├── security-status/route.ts   # 安全审计结果
│       ├── diagnose/route.ts          # 网络连通性诊断
│       ├── today-safe/route.ts        # 安全主题代理
│       ├── probe/route.ts             # 边缘探测（Edge Runtime）
│       ├── telemetry/route.ts         # RUM 遥测上报
│       └── debug-kv/route.ts          # KV 存储诊断
├── components/
│   ├── live-status.tsx                # 实时状态卡片
│   ├── metrics-panel.tsx              # 图表面板
│   ├── theme-audit.tsx                # 安全审计卡片
│   ├── alerts-history.tsx             # 告警历史列表
│   ├── failover-guide.tsx             # 集成指南 + 代码片段
│   ├── copy-all-button.tsx            # 复制按钮
│   ├── providers.tsx                  # i18n + Header + Footer
│   └── theme-dist-theme.tsx           # 主题 CSS 变量应用
├── lib/
│   ├── monitor.ts                     # 核心监控编排
│   ├── store.ts                       # 数据持久化（KV / 本地文件）
│   ├── kv.ts                          # Vercel KV 封装
│   ├── security.ts                    # XSS 扫描器
│   ├── css-analyzer.ts                # CSS 安全分析器
│   ├── html-sanitizer.ts              # HTML 标签清洗器
│   ├── validator.ts                   # JSON Schema 校验器
│   ├── notifier.ts                    # 邮件告警发送
│   ├── fetch-proxy.ts                 # 代理感知 fetch
│   ├── rate-limit.ts                  # 频率限制
│   ├── alert-cooldown.ts              # 告警冷却期
│   ├── archiver.ts                    # 数据归档
│   ├── cors.ts                        # CORS 头工具
│   ├── security-logger.ts             # 安全事件日志
│   ├── ip-blocker.ts                  # IP 封禁
│   └── i18n.tsx                       # 中英文国际化
└── types/
    └── index.ts                       # TypeScript 类型定义
```

---

## 通用 HTTP 状态码

| 状态码 | 含义 |
|---|---|
| `200` | 成功 |
| `400` | 请求体无效（如 telemetry duration 超出范围） |
| `404` | 未知徽章类型 |
| `429` | 触发频率限制（monitor、diagnose） |
| `502` | 上游平台不可达 |
| `500` | 服务器内部错误 |
