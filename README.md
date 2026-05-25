# ThemeDist Monitor

ThemeDist 双平台监控面板 — 实时追踪 [ThemeDist](https://themedist.vercel.app) 在 Vercel、Netlify 和 DIY 社区主题的运行状态，包括可用性、延迟、CDN 缓存命中率、主题安全审计和数据库健康度。

![Vercel 状态](https://themedist-monitor.vercel.app/api/v1/badges/vercel)
![Netlify 状态](https://themedist-monitor.vercel.app/api/v1/badges/netlify)
![主题安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)
![数据库](https://themedist-monitor.vercel.app/api/v1/badges/database)
![在线率](https://themedist-monitor.vercel.app/api/v1/badges/uptime)

## 功能特性

### 核心监控

- **双平台监控** — 定时检查 Vercel 和 Netlify 端点的可用性与响应延迟。卡片根据状态变化发光效果（绿/橙/红），延迟值分色级显示
- **延迟趋势图** — 24 小时延迟变化曲线，支持 Vercel / Netlify 双线对比，15 分钟粒度聚合
- **SLA 可用率** — 7 天和 30 天滚动可用率统计，进度条颜色从红到绿连续渐变（HSL 色相映射），≥90% 时带外发光
- **CDN 缓存追踪** — 监控 CDN HIT / MISS 比率（环形饼图），评估边缘缓存效率
- **数据库健康** — 通过 DIY 社区主题 API 检测 Redis / Upstash 数据库降级

### 安全审计

- **上下文感知 XSS 检测** — 区分强模式（`<script>`、`on*=`、`javascript:`、`eval()` 等）和弱模式（`alert()`）。16 个纯展示字段（name、author、description 等）豁免 `alert()` 误报，CSS/HTML 等可执行上下文全部检测
- **社区主题安全扫描** — 扫描 DIY 端点的所有社区投稿主题的 `customCss`、`cssVars`、`extensions.html` 和 `author` 字段，检出存储在 Redis 中但尚未激活的恶意主题
- **主站清洗器绕过检测** — 自动比对发现结果与 themedist 提交端宣称的清洗规则，标注哪些规则被绕过（on* 事件剥离、`<script>` 剥离、`javascript:` 剥离、`@import` 剥离等）
- **Schema 校验** — 验证 `today.json` 返回的数据结构完整性（必填字段 + cssVars 数量范围）
- **CSS 安全分析** — 审计自定义 CSS 中的 `@import`、`url()` 外部引用、`expression()`、`behavior`（IE）、`-moz-binding`（Firefox）等危险规则，区分 issue / warning 两级
- **HTML 净化** — 对 extensions 扩展元素进行 HTML 标签白名单过滤和 `on*` 事件处理器剥离
- **安全日志** — 记录所有安全事件到持久化存储，支持回溯审计

### 告警系统

- **四级告警** — OUTAGE（宕机）、SECURITY_BREACH（安全入侵）、DB_DOWN（数据库异常）、SCHEMA_MISMATCH（Schema 不匹配）
- **去重机制** — OUTAGE/DB_DOWN 按类型+平台去重，SECURITY_BREACH/SCHEMA_MISMATCH 按详情内容去重，同一中断事件不再重复堆叠告警
- **独立自动解决** — SECURITY_BREACH 和 SCHEMA_MISMATCH 各自独立判断恢复条件，互不阻塞
- **邮件通知** — 通过 QQ 邮箱 SMTP 发送 HTML 格式告警邮件，带类型标签、严重度、平台、详情和 Dashboard 直达链接
- **失败阈值** — 连续 3 次失败后才触发告警，避免网络抖动导致的误报
- **冷却机制** — 同类型告警有最小间隔限制（OUTAGE 15 分钟、SECURITY_BREACH 30 分钟、DB_DOWN 30 分钟、SCHEMA_MISMATCH 60 分钟）
- **手动管理** — 每条告警可单独忽略，或一键全部忽略。点击告警条目弹出详情窗口，展示完整信息（元数据、详细报告、绕过清洗规则、原始 JSON）
- **双存储合并** — 自动合并 string 和 list 两种 KV 存储后端的告警数据，解决旧存储遗留的"幽灵告警"问题

### 仪表盘主题

- **ThemeDist 主题自动应用** — 页面加载时自动请求 `/api/v1/today-safe`，将当日 34 个 CSS 变量 + 自定义动画 + 浮动装饰注入仪表盘本身
- **一键降级** — 点击导航栏主题按钮可恢复原生深色主题，选择持久化到 localStorage
- **容灾指南（可折叠）** — Vanilla JS + React Hook 集成代码示例可一键复制，SVG 状态徽章实时预览

### 其他

- **SVG 状态徽章** — 可嵌入 README 或外部仪表盘的实时状态徽章（`/api/v1/badges/[type]`），支持 `?debug=1` 调试模式
- **代理支持** — 通过 `HTTPS_PROXY` 环境变量支持本地开发时走代理访问外部 API；代理故障时自动降级直连
- **中英双语** — 全站页面（首页、/demo、/api-docs、告警弹窗）完整支持中文和英文切换
- **RUM 遥测** — 接受客户端性能数据上报，按延迟分桶统计
- **社区扫描缓存** — KV 缓存已扫描的社区主题，避免重复扫描已知安全主题，每 24 小时强制全量重扫

## 快速开始

```bash
npm install
npm run dev          # 启动开发服务器 → http://localhost:3000
npm run monitor      # 手动执行一次完整监控检查
npm run build        # 生产构建
```

仪表盘：http://localhost:3000
API 文档：http://localhost:3000/api-docs
主题演示：http://localhost:3000/demo

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
| `/api/v1/data` | GET | 完整仪表盘数据（状态、指标、告警、性能日志、安全事件、指标历史） |
| `/api/v1/status` | GET | 轻量健康摘要（CORS 开启，Edge Runtime） |
| `/api/v1/monitor` | GET | 触发一次监控检查（有频率限制 + 互斥锁） |
| `/api/v1/monitor` | POST | Cron 触发监控（需 `Authorization: Bearer <CRON_SECRET>`） |
| `/api/v1/monitor` | DELETE | 清除所有监控数据（需认证） |
| `/api/v1/alerts/resolve` | POST | 解决告警（传 `{ id }` 解决单个，空 body 解决全部） |
| `/api/v1/badges/[type]` | GET | SVG 状态徽章（类型：`vercel`、`netlify`、`theme`、`database`、`uptime`、`status`、`theme-count`、`security`） |
| `/api/v1/security-status` | GET | 当前主题安全扫描结果 |
| `/api/v1/today-safe` | GET | 安全代理 — 从 ThemeDist 获取并 XSS 清洗后的 `today.json`，支持 KV 缓存兜底 |
| `/api/v1/telemetry` | POST | 接收客户端性能遥测 |
| `/api/v1/probe` | GET | 多区域端点探测（Vercel Edge Runtime） |
| `/api/v1/diagnose` | GET | 网络连通性诊断 |
| `/api/v1/debug-kv` | GET | KV 存储调试信息 |
| `/api-docs` | GET | API 参考文档页面 |

## 架构

```
src/
├── app/
│   ├── page.tsx                    # 仪表盘 UI 入口
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式 + CSS 变量 + 动画
│   ├── api-docs/page.tsx           # API 文档页面（服务端渲染 Markdown）
│   ├── demo/page.tsx               # 主题实时预览实验室（147 套预设交互换肤）
│   └── api/
│       └── v1/
│           ├── data/route.ts           # 完整仪表盘数据聚合（含 24h 指标历史）
│           ├── status/route.ts         # Edge Runtime 轻量健康检查
│           ├── monitor/route.ts        # 监控触发（互斥锁 + 频率限制）
│           ├── alerts/resolve/route.ts # 告警解决（单个/批量）
│           ├── badges/[type]/route.ts  # SVG 徽章生成
│           ├── security-status/route.ts# 安全扫描结果查询
│           ├── today-safe/route.ts     # 安全代理 + XSS 清洗 + KV 兜底
│           ├── telemetry/route.ts      # RUM 性能遥测写入
│           ├── probe/route.ts          # Edge 多区域探测
│           ├── diagnose/route.ts       # 网络诊断
│           └── debug-kv/route.ts       # KV 调试端点
├── components/
│   ├── providers.tsx               # Context Provider 聚合（语言 + 导航栏 + 页脚）
│   ├── live-status.tsx             # 实时状态面板（状态发光 + 延迟色分）
│   ├── metrics-panel.tsx           # 核心指标 + SLA 渐变进度条 + 延迟趋势图 + CDN 饼图
│   ├── theme-audit.tsx             # 今日主题安全审计卡片
│   ├── alerts-history.tsx          # 告警历史列表 + 详情弹窗 + 手动管理
│   ├── failover-guide.tsx          # 故障转移指南（可折叠）
│   ├── theme-dist-theme.tsx        # ThemeDist 主题自动应用 + 一键降级
│   ├── copy-all-button.tsx         # 一键复制数据
├── lib/
│   ├── monitor.ts                  # 核心监控逻辑（数据获取 + today 扫描 + 社区扫描 + 告警 + 缓存）
│   ├── store.ts                    # 数据持久化（双存储合并 + 自动迁移）
│   ├── kv.ts                       # Upstash Redis 操作封装（String/Hash/List/SortedSet）
│   ├── security.ts                 # 上下文感知 XSS 扫描 + 社区主题审计 + 清洗器绕过检测
│   ├── css-analyzer.ts             # CSS 危险规则检测（@import/url/expression/moz-binding）
│   ├── html-sanitizer.ts           # HTML 白名单过滤 + on* 剥离
│   ├── validator.ts                # today.json Schema 校验（必填字段 + cssVars 范围）
│   ├── notifier.ts                 # QQ 邮箱 SMTP 告警通知（HTML 格式）
│   ├── security-logger.ts          # 安全事件日志持久化
│   ├── alert-cooldown.ts           # 告警冷却（1 小时 KV TTL）
│   ├── ip-blocker.ts               # IP 级别频率限制 + 自动封禁
│   ├── rate-limit.ts               # 滑动窗口请求频率限制
│   ├── fetch-proxy.ts              # 代理感知 HTTP 请求（代理故障自动降级直连）
│   ├── archiver.ts                 # 历史数据按小时/天聚合归档
│   ├── cors.ts                     # CORS 响应头处理
│   └── i18n.tsx                    # 中英文国际化（全站 80+ 翻译键）
└── types/
    └── index.ts                    # 全局 TypeScript 类型定义
```

### 数据流

```
┌──────────────────────────────────────────────────────────────────┐
│                    Vercel Cron / 手动触发                          │
│                          ↓                                        │
│  GET /api/v1/monitor  →  runAllChecks()                              │
│                          ↓                                        │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Promise.all 并行请求                                        │   │
│  │  • themedist.vercel.app/api/v1/today.json  (主端点)             │   │
│  │  • themedist.netlify.app/api/v1/today.json  (备用端点)          │   │
│  │  • themedist.netlify.app/api/v1/diy/themes.json (社区主题)      │   │
│  └──────────────┬────────────────────────────────────────────┘   │
│                 ↓                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  today.json 处理                                              │   │
│  │  1. validateTodayJson() — Schema 校验                        │   │
│  │  2. scanExtended() — 上下文感知 XSS + CSS 审计                │   │
│  │  3. 性能日志（延迟/状态码/缓存状态）                           │   │
│  │  4. 告警判定（失败阈值 + 去重 + 冷却）                         │   │
│  │  5. OUTAGE/SECURITY_BREACH/SCHEMA_MISMATCH 自动解决           │   │
│  └──────────────┬────────────────────────────────────────────┘   │
│                 ↓                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  DIY 社区主题处理                                             │   │
│  │  1. 提取 { themes } 数组                                      │   │
│  │  2. KV 缓存去重（跳过已知安全主题，24h 全量重扫）              │   │
│  │  3. scanThemeEntry() — 逐条扫描 CSS/cssVars/HTML/author       │   │
│  │  4. 清洗器绕过检测（比对 themedist 提交端宣称的规则）          │   │
│  │  5. 按审核状态分级（approved→高危 / pending→低风险）           │   │
│  │  6. 聚合为单条 SECURITY_BREACH 告警（避免重复堆叠）            │   │
│  └──────────────┬────────────────────────────────────────────┘   │
│                 ↓                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  持久化到 Upstash Redis (KV)                                  │   │
│  │  • store:alerts — 系统告警（JSON 数组，双存储合并）           │   │
│  │  • zset:perf — 性能日志（Sorted Set，7 天保留）               │   │
│  │  • zset:theme — 主题快照（Sorted Set）                        │   │
│  │  • hash:status — 实时状态（Hash）                              │   │
│  │  • metrics:vercel / metrics:netlify — 指标历史                │   │
│  │  • cache:scan:community — 社区扫描缓存（24h TTL）             │   │
│  └──────────────┬────────────────────────────────────────────┘   │
│                 ↓                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  告警通知                                                     │   │
│  │  • notifier.ts → QQ 邮箱 SMTP → 424635328@qq.com             │   │
│  │  • 冷却机制 + 频率限制，防止重复发送                           │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   Dashboard (GET /api/v1/data)                       │
│                          ↓                                        │
│  getSystemAlerts() → 合并 store:alerts + list:alerts → 去重       │
│  getThemeSnapshots() → zrangebyscore 最新快照                     │
│  getPerformanceLogs() → zrangebyscore 性能日志                    │
│  getMetricsHistory() → Sorted Set 24h 指标                        │
│  getStatusHash() → hgetall 实时状态                                │
│  getRecentIncidents() → lrange 安全事件日志                       │
└──────────────────────────────────────────────────────────────────┘
```

### 存储架构

- **告警**：字符串型 JSON 数组（`store:alerts`）+ 旧版 List（`list:alerts`），读取时自动合并去重
- **性能日志**：Sorted Set（`zset:perf`），按时间戳排序，7 天 TTL
- **主题快照**：Sorted Set（`zset:theme`），按日期排序
- **实时状态**：Hash（`hash:status`），字段级读写
- **指标历史**：Sorted Set（`metrics:vercel` / `metrics:netlify`），7 天 TTL
- **社区扫描缓存**：String JSON（`cache:scan:community`），24h TTL 全量重扫

双存储合并解决了旧告警仅存在于 List 存储而新告警在 String 存储导致的"幽灵告警"问题。

### XSS 检测策略

#### 两层模式

| 层级 | 模式 | 作用范围 |
|------|------|---------|
| **强模式** | `<script>`、`javascript:`、`on*=`、`document.cookie`、`eval()`、`<iframe>`、`expression()`、`-moz-binding`、`data:text/html`、`</style>` | 所有字段，无条件检测 |
| **弱模式** | `alert()` | 仅可执行上下文（CSS、HTML），**跳过** 16 个展示字段（name、author、description、title、presetName 等） |

#### 扫描覆盖

| 数据源 | 扫描对象 | 清洗器绕过检测 |
|--------|---------|--------------|
| `today.json` | cssVars、customCss、extensions、directory | ✓ |
| `diy/themes.json` | customCss、cssVars、extensions[].html、author | ✓ 逐规则比对 |

#### 绕过检测规则

监控自动比对发现的漏洞与 themedist `/api/v1/diy/submit.json` 提交端宣称的清洗规则：
- on* 事件处理器剥离（`onerror`/`onload`/`onclick`/`onfocus`/`onchange`）
- `<script>` / `<iframe>` 标签剥离
- `javascript:` 协议剥离
- CSS `expression()` / `url(http)` / `@import` 剥离
- author 字段 HTML 标签剥离 + JS 函数调用检测

### 主题轮换与检测时机

1. 农历节日（20+ 个）→ 2. 公历节日 → 3. Crazy Thursday → 4. 社区投稿（约 30% 天数，每 3 天轮入一次）→ 5. 日常预设池（147 套）

当社区投稿主题被轮换为当日主题时，其自定义 CSS 和扩展 HTML 会通过 `today.json` 直接分发给所有消费者。监控系统在每次扫描时同步检查 `today.json`（激活主题）和 DIY 端点（全部社区投稿），确保尚未激活的恶意主题也能被提前发现。

## 安全审计发现

| 漏洞 | 严重程度 | 检出方式 |
|---|---|---|
| extensions HTML 中事件处理器（`onerror`、`onload`、`onclick`、`onfocus`）未被剥离 | 高危 | 社区主题扫描 → 绕过检测 |
| `cssVars` 值未进行 HTML/脚本内容净化（可注入 `</style><script>`） | 高危 | 社区主题扫描 → cssVars 检测 |
| extensions 中 `<iframe>` 标签未被移除 | 中危 | 社区主题扫描 → 绕过检测 |
| `author` 字段中 JS 函数调用（`fetch()`/`eval()`）未被拦截 | 低危 | 社区主题扫描 → author 检测 |
| CSS `url(http)` 外部引用未被剥离 | 中危 | 社区主题扫描 → CSS 分析 |
| CSS `@import` 未被剥离 | 中危 | 社区主题扫描 → CSS 分析 |

## 部署

### Vercel（推荐）

`vercel.json` 配置了定时任务：

| Cron 表达式 | 路径 | 说明 |
|---|---|---|
| `0 0 * * *` | `/api/v1/monitor` | 每日 UTC 00:00 执行监控检查 |
| `0 6 * * *` | `/api/v1/probe` | 每日 UTC 06:00 执行多区域探测 |

推送仓库到 Vercel 自动部署，需配置环境变量。

### 自部署

- Node.js 18+
- Upstash Redis 实例（[upstash.com](https://upstash.com) 免费套餐即可）
- （可选）QQ 邮箱 SMTP 授权码

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| UI | React 18 + Tailwind CSS |
| 图表 | Recharts (LineChart / PieChart / AreaChart) |
| 图标 | Lucide React |
| 数据库 | Upstash Redis (via @vercel/kv) |
| 邮件 | Nodemailer + QQ SMTP |
| HTTP | undici（代理感知 + 代理故障自动降级直连） |
| 部署 | Vercel（Edge + Serverless） |

## 许可证

[GPL-3.0](LICENSE)
