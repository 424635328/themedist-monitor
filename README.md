# ThemeDist Monitor

ThemeDist 双平台监控面板 — 实时追踪 [ThemeDist](https://themedist.vercel.app) 在 Vercel、Netlify 和 DIY 社区主题的运行状态，包括可用性、延迟、CDN 缓存命中率、主题安全审计和数据库健康度。

![Vercel 状态](https://themedist-monitor.vercel.app/api/badges/vercel)
![Netlify 状态](https://themedist-monitor.vercel.app/api/badges/netlify)
![主题安全](https://themedist-monitor.vercel.app/api/badges/theme)
![数据库](https://themedist-monitor.vercel.app/api/badges/database)
![在线率](https://themedist-monitor.vercel.app/api/badges/uptime)

## 功能特性

### 核心监控

- **双平台监控** — 定时检查 Vercel 和 Netlify 端点的可用性与响应延迟
- **延迟趋势图** — 24 小时延迟变化曲线，支持 Vercel / Netlify 双线对比
- **SLA 可用率** — 7 天和 30 天滚动可用率统计，精确到小数点后两位
- **CDN 缓存追踪** — 监控 CDN HIT / MISS 比率，评估边缘缓存效率
- **数据库健康** — 通过 DIY 社区主题 API 检测 Redis / Upstash 数据库降级

### 安全审计

- **XSS 攻击检测** — 每次扫描对当日主题数据进行 14 种 XSS 模式匹配（`<script>`、事件处理器、`javascript:` 协议、CSS `expression()` 等）
- **Schema 校验** — 验证 `today.json` 返回的数据结构完整性
- **CSS 安全分析** — 审计自定义 CSS 中的 `@import`、`-moz-binding`、`behavior` 等危险规则
- **HTML 净化** — 对 extensions 扩展元素进行 HTML 标签白名单过滤和事件处理器剥离
- **安全日志** — 记录所有安全事件（XSS 攻击、Schema 异常）到持久化存储，支持回溯审计

### 告警系统

- **四级告警** — OUTAGE（宕机）、SECURITY_BREACH（安全入侵）、DB_DOWN（数据库异常）、SCHEMA_MISMATCH（Schema 不匹配）
- **邮件通知** — 通过 QQ 邮箱 SMTP 发送 HTML 格式告警邮件，含完整上下文信息
- **失败阈值** — 连续 3 次失败后才触发告警，避免网络抖动导致的误报
- **冷却机制** — 同类型告警有最小间隔限制（OUTAGE 15 分钟、SECURITY_BREACH 30 分钟、DB_DOWN 30 分钟）
- **自动解除** — 平台恢复后自动将相关告警标记为已解决

### 其他

- **SVG 状态徽章** — 可嵌入 README 或外部仪表盘的实时状态徽章（`/api/badges/[type]`）
- **代理支持** — 通过 `HTTPS_PROXY` 环境变量支持本地开发时走代理访问外部 API
- **中英双语** — Dashboard UI 完整支持中文和英文切换
- **RUM 遥测** — 接受客户端性能数据上报，按延迟分桶统计

## 快速开始

```bash
npm install
npm run dev          # 启动开发服务器 → http://localhost:3000
npm run monitor      # 手动执行一次完整监控检查
npm run build        # 生产构建
```

仪表盘：http://localhost:3000
API 文档：http://localhost:3000/api-docs

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `KV_REST_API_URL` | 推荐 | Upstash Redis REST API 地址（持久化存储） |
| `KV_REST_API_TOKEN` | 推荐 | Upstash Redis 认证令牌 |
| `KV_REST_API_READ_ONLY_TOKEN` | 否 | Upstash 只读令牌（用于 Edge Runtime 端点） |
| `QQ_EMAIL_USER` | 否 | QQ 邮箱地址（告警邮件发件人） |
| `QQ_EMAIL_PASS` | 否 | QQ 邮箱 SMTP 授权码 |
| `CRON_SECRET` | 否 | Vercel Cron Jobs 认证密钥（Bearer Token） |
| `HTTPS_PROXY` | 否 | HTTPS 代理地址（本地开发用，如 `http://127.0.0.1:7890`） |
| `HTTP_PROXY` | 否 | HTTP 代理地址 |

未配置 KV 时，数据自动降级为文件系统存储（Vercel 上为 `/tmp/data`，本地为 `./data`）。

## API 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/data` | GET | 完整仪表盘数据（状态、指标、告警、性能日志、安全事件） |
| `/api/status` | GET | 轻量健康摘要（CORS 开启，Edge Runtime） |
| `/api/monitor` | GET | 触发一次监控检查（有频率限制 + 互斥锁） |
| `/api/monitor` | POST | Cron 触发监控（需 `Authorization: Bearer <CRON_SECRET>`） |
| `/api/monitor` | DELETE | 清除所有监控数据（需认证） |
| `/api/badges/[type]` | GET | SVG 状态徽章（类型：`vercel`、`netlify`、`theme`、`database`、`uptime`、`status`、`theme-count`、`security`） |
| `/api/security-status` | GET | 当前主题安全扫描结果 |
| `/api/today-safe` | GET | 安全代理 — 从 ThemeDist 获取并清洗后的 `today.json` |
| `/api/telemetry` | POST | 接收客户端性能遥测（`{ durationMs, platform?, region? }`） |
| `/api/probe` | GET | 多区域端点探测（Vercel Edge Runtime） |
| `/api/diagnose` | GET | 网络连通性诊断 |
| `/api/debug-kv` | GET | KV 存储调试信息（读写测试 + 性能日志样本） |
| `/api-docs` | GET | API 参考文档页面 |

### 徽章 API 详情

所有徽章均可通过 `?debug=1` 参数返回 JSON 调试信息：

```
GET /api/badges/vercel        # Vercel 平台状态
GET /api/badges/status        # 整体健康度（healthy/degraded/down）
GET /api/badges/security      # 今日主题安全状态（safe/unsafe）
GET /api/badges/uptime        # 综合在线率百分比
GET /api/badges/theme-count   # 可用主题总数
```

## 架构

```
src/
├── app/
│   ├── page.tsx                    # 仪表盘 UI 入口
│   ├── layout.tsx                  # 根布局（主题 + 字体）
│   ├── globals.css                 # 全局样式（暗色主题）
│   ├── api-docs/page.tsx           # API 文档页面
│   ├── demo/page.tsx               # 组件演示页面
│   └── api/
│       ├── data/route.ts           # 完整仪表盘数据聚合
│       ├── status/route.ts         # Edge Runtime 轻量健康检查
│       ├── monitor/route.ts        # 监控触发（互斥锁 + 频率限制）
│       ├── badges/[type]/route.ts  # SVG 徽章生成
│       ├── security-status/route.ts# 安全扫描结果查询
│       ├── today-safe/route.ts     # 安全代理 + XSS 清洗
│       ├── telemetry/route.ts      # RUM 性能遥测写入
│       ├── probe/route.ts          # Edge 多区域探测
│       ├── diagnose/route.ts       # 网络诊断
│       └── debug-kv/route.ts       # KV 调试端点
├── components/
│   ├── live-status.tsx             # 实时状态面板（Vercel / Netlify / DB）
│   ├── metrics-panel.tsx           # 核心指标 + 延迟趋势图 + CDN 饼图
│   ├── theme-audit.tsx             # 今日主题安全审计卡片
│   ├── alerts-history.tsx          # 告警历史列表（支持筛选 + 复制）
│   ├── failover-guide.tsx          # 故障转移指南
│   ├── theme-dist-theme.tsx        # ThemeDist 主题实时预览
│   ├── copy-all-button.tsx         # 一键复制数据
│   └── providers.tsx               # Context Provider 聚合
├── lib/
│   ├── monitor.ts                  # 核心监控逻辑（数据获取 + 扫描 + 告警）
│   ├── store.ts                    # 数据持久化层（KV 主存储 + 文件降级）
│   ├── kv.ts                       # Upstash Redis 操作封装
│   ├── security.ts                 # XSS 模式匹配 + CSS 审计 + HTML 净化
│   ├── css-analyzer.ts             # CSS 危险规则检测
│   ├── html-sanitizer.ts           # HTML 白名单过滤
│   ├── validator.ts                # today.json Schema 校验
│   ├── notifier.ts                 # QQ 邮箱 SMTP 告警通知
│   ├── security-logger.ts          # 安全事件日志持久化
│   ├── alert-cooldown.ts           # 告警冷却（防重复发送）
│   ├── ip-blocker.ts               # IP 级别的频率限制 + 封禁
│   ├── rate-limit.ts               # 滑动窗口请求频率限制
│   ├── fetch-proxy.ts              # 代理感知的 HTTP 请求封装
│   ├── archiver.ts                 # 历史数据归档
│   ├── cors.ts                     # CORS 响应头处理
│   └── i18n.tsx                    # 中英文国际化
└── types/
    └── index.ts                    # 全局 TypeScript 类型定义
```

### 数据流

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Cron (每日 00:00 UTC)           │
│                          ↓                               │
│  GET /api/monitor  →  runAllChecks()                     │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  并行请求                                            │   │
│  │  • themedist.vercel.app/api/today.json              │   │
│  │  • themedist.netlify.app/api/today.json             │   │
│  │  • themedist.netlify.app/api/diy/themes.json        │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 ↓                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  数据处理                                            │   │
│  │  1. validateTodayJson() — Schema 校验               │   │
│  │  2. scanExtended() — XSS 扫描 + CSS 审计            │   │
│  │  3. 性能日志记录（延迟 / 状态码 / 缓存状态）         │   │
│  │  4. 告警判定（失败阈值 + 冷却检查）                  │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 ↓                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  持久化到 Upstash Redis (KV)                        │   │
│  │  • store:alerts — 系统告警（JSON 数组）             │   │
│  │  • zset:perf — 性能日志（Sorted Set）               │   │
│  │  • zset:theme — 主题快照（Sorted Set）              │   │
│  │  • hash:status — 实时状态（Hash）                   │   │
│  │  • metrics:vercel / metrics:netlify — 指标历史      │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 ↓                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  告警通知                                            │   │
│  │  • QQ 邮箱 SMTP → 424635328@qq.com                  │   │
│  │  • 带冷却机制，防止重复发送                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Dashboard (GET /api/data)                    │
│                          ↓                               │
│  store:alerts → kvGet → parseAlerts() → 过滤未解决告警   │
│  zset:theme → kvZrangebyscore → 最新主题快照              │
│  zset:perf → kvZrangebyscore → 性能日志聚合              │
│  hash:status → kvHgetall → 实时状态                       │
└─────────────────────────────────────────────────────────┘
```

### 存储架构说明

告警数据使用 **字符串型 JSON 数组** 存储（键 `store:alerts`），而非 Redis List。这是为了规避 `@upstash/redis` v1.38 在 Next.js 打包环境下 `lrange` 返回空数组的已知 bug。读写均通过 `kvGet` / `kvSet`（使用 `@vercel/kv` 客户端），性能可靠。

读取时自动处理 `@upstash/redis` 的 JSON 自动反序列化行为（客户端会自动将 JSON 字符串解析为对象），通过 `parseAlerts()` 工具函数统一处理字符串和数组两种类型。

`list:alerts`（Redis List）作为旧版兼容路径保留，系统在首次读取时会自动迁移数据到 `store:alerts`。

### XSS 检测模式

每次监控扫描对 `today.json` 返回的所有字符串字段递归执行以下模式匹配（大小写不敏感）：

| 模式 | 检测目标 |
|---|---|
| `<script\b[^>]*>[\s\S]*?<\/script>` | `<script>` 标签注入 |
| `javascript\s*:` | `javascript:` 伪协议 |
| `onerror\s*=` / `onload\s*=` / `onclick\s*=` / `onmouseover\s*=` | 内联事件处理器 |
| `<[^>]*on\w+\s*=[^>]*>` | 任意 on* 事件处理器 |
| `document\.cookie` | Cookie 窃取代码 |
| `eval\s*\(` | 动态代码执行 |
| `<iframe\b[^>]*>` | iframe 注入 |
| `expression\s*\(` | CSS expression() 攻击 |
| `-moz-binding` | Firefox XBL 绑定攻击 |
| `data\s*:\s*text\/html` | data URI HTML 注入 |

**注意：** 这些正则仅用于检测（`.test()`），不用于替换（`.replace()`）。因此使用 `/i` 标志而非 `/gi`，避免全局标志在共享正则实例上的 `lastIndex` 状态残留导致误报。

### 主题轮换与检测时机

ThemeDist 的每日主题按以下优先级轮换：

1. 农历节日（春节、端午、中秋等 20+ 个）
2. 公历节日（元旦、情人节、圣诞节等）
3. Crazy Thursday（每周四特殊覆盖）
4. 社区投稿主题（约每 3 天轮入一次）
5. 日常预设池（147 套预设按日期轮换）

当社区投稿主题被轮换为当日主题时，若该主题包含 XSS 载荷（如 extensions 中的 `onerror=` 事件处理器），监控系统将在下一次扫描时检测并触发安全告警。

## 告警通知

### QQ 邮箱配置

告警通过 QQ 邮箱 SMTP 发送：

- SMTP 服务器：`smtp.qq.com`
- 端口：`465`（SSL）
- 发件人：`ThemeDist Monitor <424635328@qq.com>`
- 收件人：`424635328@qq.com`

需要配置环境变量 `QQ_EMAIL_USER` 和 `QQ_EMAIL_PASS`（QQ 邮箱 SMTP 授权码，非登录密码）。

### 告警邮件格式

邮件为 HTML 格式，包含：
- 告警类型和严重程度（高 / 中）
- 受影响平台
- 详细错误信息
- 时间戳（中文格式）
- Dashboard 直达链接

## ThemeDist 安全审计发现

本项目的监控系统在设计验证过程中，对 ThemeDist 的 DIY 主题提交 API 进行了安全测试，发现了以下问题：

| 漏洞 | 严重程度 | 状态 |
|---|---|---|
| extensions HTML 中事件处理器（`onerror`、`onload`、`onclick`、`onfocus`、`onchange`）未被剥离 | 高危 | 已报告 |
| `cssVars` 值未进行 HTML/脚本内容净化（可注入 `</style><script>`） | 高危 | 已报告 |
| extensions 中 `<iframe>` 标签未被移除 | 中危 | 已报告 |
| `author` 字段中 `<script>` 标签被剥离但标签内 JS 代码保留 | 低危 | 已报告 |

ThemeDist 宣称的输入净化（"剥离 HTML 标签、事件处理器、javascript: 协议和 expression()"）对事件处理器的剥离存在遗漏。

## 部署

### Vercel（推荐）

项目为 Vercel 部署设计，`vercel.json` 配置了两个定时任务：

| Cron 表达式 | 路径 | 说明 |
|---|---|---|
| `0 0 * * *` | `/api/monitor` | 每日 UTC 00:00 执行监控检查 |
| `0 6 * * *` | `/api/probe` | 每日 UTC 06:00 执行多区域探测 |

将仓库推送到 Vercel 即可自动部署。需要在 Vercel 项目设置中配置环境变量（KV 连接信息和邮箱凭证）。

### 自部署

支持部署到任何支持 Next.js 的平台。需要：

- Node.js 18+
- 一个 Upstash Redis 实例（[upstash.com](https://upstash.com) 免费套餐即可）
- （可选）QQ 邮箱账号用于告警通知

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| UI | React 18 + Tailwind CSS |
| 图表 | Recharts |
| 图标 | Lucide React |
| 数据库 | Upstash Redis (via @vercel/kv) |
| 邮件 | Nodemailer + QQ SMTP |
| HTTP | undici（代理感知 fetch） |
| 部署 | Vercel（Edge + Serverless） |

## 许可证

[GPL-3.0](LICENSE)
