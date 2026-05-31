# API 状态报告

生成时间：2026-05-31 (迭代 3)

## 总览

| 端点 | 方法 | 状态 | 说明 |
|---|---|---|---|
| `/api/v1/data` | GET | ✅ 正常 | 完整监控数据（状态、指标、告警、性能日志） |
| `/api/v1/status` | GET | ✅ 正常 | 轻量状态摘要 + 端点健康（Edge Runtime） |
| `/api/v1/monitor` | GET/POST | ✅ 正常 | 触发一次监控检查（含新端点探针） |
| `/api/v1/badges/[type]` | GET | ✅ 正常 | SVG 状态徽章（兼容 shields.io） |
| `/api/v1/telemetry` | POST | ✅ 正常 | 接收客户端性能遥测 |
| `/api/v1/probe` | GET | ✅ 正常 | 多区域端点探测 |
| `/api/v1/security-status` | GET | ✅ 正常 | 当前主题安全扫描结果（含 layerContext/clickEffect） |
| `/api/v1/today-safe` | GET | ✅ 正常 | 经过清洗的 today.json 代理 |
| `/api/v1/diagnose` | GET | ✅ 正常 | 网络连通性诊断 |
| `/api/v1/debug-kv` | GET | ✅ 正常 | KV 存储调试信息 |
| `/api/v1/alerts/resolve` | POST | ✅ 正常 | 告警处理（单条或批量） |
| `/api-docs` | GET | ✅ 正常 | API 文档页面 |

## 同步的 ThemeDist 新功能 (2026-05-31)

### 新增监控端点

| 端点 | 说明 | 状态 |
|---|---|---|
| `events` | 智能轮询 — 主题变更检测 + nextPoll 间隔 | ✅ 已监控 |
| `tokens` | W3C DTCG 设计令牌导出 | ✅ 已监控 |
| `weather-theme` | 天气自适应主题（IP + Open-Meteo） | ✅ 已监控 |
| `today-safe` | 安全主题代理（自监控） | ✅ 已监控 |
| `today-css` | 今日主题纯 CSS（消除 FOUC） | ✅ 已监控 |
| `favicon` | 动态 Favicon（主色 + Logo 首字母） | ✅ 已监控 |
| `fonts` | 自动字体注入（Google Fonts @import） | ✅ 已监控 |
| `patterns` | 动态 SVG 背景纹理（主题色几何图案） | ✅ 已监控 |
| `color-search` | 颜色相似度搜索（RGB 欧几里得距离） | ✅ 已监控 |

### 新增 Schema 字段

| 字段 | 类型 | 说明 | 状态 |
|---|---|---|---|
| `layerContext` | `LayerContext` | 图层元数据（粒子密度、背景覆盖、天气 Z-Index） | ✅ 已验证 |
| `clickEffect` | `ClickEffect \| null` | 声明式点击特效配置 | ✅ 已验证 |
| `appliedOverrides` | `boolean` | 使用 ?overrides= 时出现 | ✅ 已识别 |
| `dailyIsCommunity` | `boolean` | 今日主题是否来自社区投稿 | ✅ 已验证 |
| `apiVersion` | `string` | API 版本号 | ✅ 已验证 |
| `logoText` | `string \| null` | 主题 Logo 文字标识 | ✅ 已验证 |
| `logoColors` | `string[] \| null` | Logo 渐变色 hex 数组 | ✅ 已验证 |

### CSS 变量更新

| 变更 | 旧值 | 新值 | 原因 |
|---|---|---|---|
| `MIN_CSS_VARS` | 28 | 48 | API 返回 48 变量（含 RGB 通道、渐变、Z-Index 层级契约） |
| `MAX_CSS_VARS` | 50 | 60 | 同上 |

### 安全扫描增强

- `scanClickEffect()` — 验证 className 正则 (`/^[a-zA-Z][\w-]*$/`)，扫描 style 字段 XSS
- `scanThemeEntry()` — 社区主题扫描新增 clickEffect 检查，tags 字段追踪
- `scanExtended()` — 集成 clickEffect 审计

### 仪表盘 UI 增强

- **实时状态** — 新增端点状态行（Events / Tokens / Weather / Today-Safe / Today-CSS / Favicon / Fonts / Patterns / Color Search）
- **主题审计** — 显示 logoText、dailyIsCommunity 来源、apiVersion、layerContext 和 clickEffect 详情
- **容灾指南** — 代码示例更新为完整集成（含 extensions、customCss、clickEffect 处理）
- **i18n** — 中英文翻译覆盖所有新字段，消除硬编码中文字符串
- **指标面板** — SLA 可用率标签国际化

## 端点详情

### `/api/v1/status`（Edge 运行时）
返回整体健康度、各平台状态及延迟、数据库状态、**新增端点状态**（events/tokens/weather/today-safe/today-css/favicon/fonts/patterns/color-search）。

### `/api/v1/security-status`（Node.js 运行时）
返回当前主题安全扫描状态。**新增**：`layerContext`（图层元数据）、`hasClickEffect`（是否有点击特效）、`clickEffectCount`（特效数量）。

### `/api/v1/monitor`（Node.js 运行时）
触发完整监控检查。**新增**：同时探测 events、tokens、weather-theme、today-safe、today-css、favicon、fonts、patterns、color-search 端点，状态写入 KV Hash。

### 类型系统更新
`TodayJsonResponse` 新增字段类型：`dailyIsCommunity`、`logoText`、`logoColors`、`available`、`directory`（含 preset/name/primary/accent/logoText/community 结构）、`appliedOverrides`。Validator 新增对 `apiVersion`、`customCss`、`extensions`、`logoText`、`logoColors`、`dailyIsCommunity` 的类型校验。
