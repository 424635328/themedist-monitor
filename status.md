# API 状态报告

生成时间：2026-05-24 14:36 CST

## 总览

| 端点 | 方法 | 状态 | 说明 |
|---|---|---|---|
| `/api/data` | GET | ✅ 正常 | 完整监控数据（状态、指标、告警、性能日志） |
| `/api/status` | GET | ✅ 正常 | 轻量状态摘要（Edge Runtime） |
| `/api/monitor` | GET/POST | ✅ 正常 | 触发一次监控检查 |
| `/api/badges/[type]` | GET | ✅ 正常 | SVG 状态徽章（兼容 shields.io） |
| `/api/telemetry` | POST | ✅ 正常 | 接收客户端性能遥测 |
| `/api/probe` | GET | ✅ 正常 | 多区域端点探测 |
| `/api/security-status` | GET | ✅ 正常 | 当前主题安全扫描结果 |
| `/api/today-safe` | GET | ✅ 正常 | 经过清洗的 today.json 代理 |
| `/api/diagnose` | GET | ✅ 正常 | 网络连通性诊断 |
| `/api/debug-kv` | GET | ✅ 正常 | KV 存储调试信息 |
| `/api-docs` | GET | ✅ 正常 | API 文档页面 |

## 平台状态

| 平台 | 状态 | 延迟 | 缓存 |
|---|---|---|---|
| Vercel | ⚠️ 偶发中断 | ~777ms | MISS |
| Netlify | ⚠️ 偶发中断 | ~1289ms | HIT |
| 数据库 (Redis) | ⚠️ 降级 | — | — |

*说明：本地开发环境中，端点偶尔因代理 (127.0.0.1:7890) 连接问题而失败。*

## 活跃告警

| 类型 | 平台 | 消息 | 时间 |
|---|---|---|---|
| DB_DOWN | system | DIY 主题端点无法访问 | 2026-05-24 06:04 UTC |
| OUTAGE | netlify | netlify 无法访问 | 2026-05-24 06:04 UTC |
| OUTAGE | vercel | vercel 无法访问 | 2026-05-24 06:04 UTC |

*下次成功检查后将自动解除。*

## 端点详情

### `/api/data`（Node.js 运行时）
返回完整监控数据，包括平台状态、性能指标、主题快照、系统告警和安全事件。缓存：30 秒 s-maxage。

### `/api/status`（Edge 运行时）
供外部监控使用的轻量端点（如 UptimeRobot、Grafana）。返回整体健康度（healthy/degraded/down）、各平台状态及延迟、最新主题信息。

### `/api/monitor`（Node.js 运行时）
触发完整监控检查：抓取 themedist 端点、校验数据结构、执行安全扫描、检查数据库健康。有频率限制，支持互斥锁防止并发。

### `/api/badges/[type]`（Node.js 运行时）
SVG 徽章端点。类型：`status`、`uptime`、`theme-count`、`security`。支持 `?debug=1` 输出 JSON。

### `/api/telemetry`（Node.js 运行时）
接受 POST 请求，格式 `{ durationMs: number, platform?: string, region?: string }`。记录客户端性能遥测数据。

### `/api/probe`（Node.js 运行时）
对 Vercel 和 Netlify 端点执行实时探测。返回每个端点的状态码、延迟和错误信息。

### `/api/security-status`（Node.js 运行时）
返回当前主题快照的安全扫描状态，包含 `securityStatus`、`flaggedReasons` 和 `schemaValid`。

### `/api/today-safe`（Node.js 运行时）
代理 themedist 的 today.json 并经过内容清洗，移除潜在恶意内容，添加 `_meta.sanitized` 标记。

### `/api/diagnose`（Node.js 运行时）
网络连通性诊断工具。同时探测 themedist 两个端点和已知可用主机（baidu.com），以区分网络问题与端点问题。

### `/api/debug-kv`（Node.js 运行时）
KV 存储调试端点。测试字符串读写、有序集合增删查，以及性能日志数量/样本。

## 最近变更

| 日期 | 提交 | 说明 |
|---|---|---|
| 2026-05-24 | a3227bd | 添加请求错误诊断功能 |
| 2026-05-24 | a3bead7 | 添加 GPL-3.0 许可证 |
| 2026-05-24 | 7124f9a | 修复徽章与数据不一致问题 |
| 2026-05-24 | 1d4fd30 | 徽章路由增加调试模式 |
| 2026-05-24 | a7538a1 | 重写徽章路由 |
