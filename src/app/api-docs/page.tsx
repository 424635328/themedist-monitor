import { Metadata } from 'next';
import CopyAllButton from '@/components/copy-all-button';
import TocNav from './toc-nav';

export const metadata: Metadata = {
  title: 'API 接口文档 — ThemeDist Monitor',
  description: 'ThemeDist Monitor 完整、公开的 API 接口参考文档',
};

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// 块级 Markdown 结构解析器
function parseMarkdownToHtml(markdown: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const normalized = markdown.replace(/\r\n/g, '\n');
  
  // 按照连续换行将文本拆分为块，同时妥善保留代码块结构
  const blocks: string[] = [];
  let currentBlock = '';
  let inCodeBlock = false;
  
  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentBlock += line + '\n';
      if (!inCodeBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
      continue;
    }
    
    if (inCodeBlock) {
      currentBlock += line + '\n';
    } else {
      if (line.trim() === '') {
        if (currentBlock.trim() !== '') {
          blocks.push(currentBlock.trim());
          currentBlock = '';
        }
      } else {
        currentBlock += line + '\n';
      }
    }
  }
  if (currentBlock.trim() !== '') {
    blocks.push(currentBlock.trim());
  }

  // 行内元素渲染（加粗、行内代码、图片、超链接）
  const renderInline = (text: string): string => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // 1. 加粗
    escaped = escaped.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>');
    
    // 2. 行内代码
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs font-mono bg-zinc-800/60 border border-zinc-700/50 text-indigo-300 font-medium">$1</code>');
    
    // 3. 图片 (必须在超链接之前解析，防止图片语法中的 [text](url) 被误判为超链接)
    escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-block align-middle my-1 mr-2 hover:opacity-90 transition-opacity" />');
    
    // 4. 超链接
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4 decoration-zinc-800 hover:decoration-indigo-400">$1</a>');
    
    return escaped;
  };

  const htmlBlocks: string[] = [];

  let headingIndex = 0;

  for (const block of blocks) {
    // 1. 代码块 (Fenced Code Block)
    if (block.startsWith('```')) {
      const match = block.match(/^```(\w*)\n([\s\S]*)\n```$/);
      const lang = match ? match[1] : '';
      const code = match ? match[2] : block.replace(/^```\w*\n|```$/g, '');
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      htmlBlocks.push(`
        <div class="code-block-wrapper relative group my-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden font-mono text-xs leading-relaxed shadow-sm">
          <div class="flex items-center justify-between px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60 text-zinc-500 text-[10px] font-sans tracking-wider uppercase select-none">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-zinc-600 transition-colors" />
              <span>${lang || 'code'}</span>
            </span>
            <button class="copy-code-btn text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[10px] font-sans normal-case">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="btn-label">复制</span>
            </button>
          </div>
          <pre class="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"><code class="text-zinc-300 block">${escapedCode}</code></pre>
        </div>
      `);
      continue;
    }

    // 2. 标题 (Headings)
    if (block.startsWith('#')) {
      const match = block.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawText = match[2].trim();
        const inlineText = renderInline(rawText);
        
        // 使用计数器生成唯一 ASCII ID，确保锚点跳转可靠
        const id = `h-${headingIndex++}`;

        // 将 H1、H2 和 H3 加入目录列表
        if (level === 1 || level === 2 || level === 3) {
          toc.push({ id, text: rawText, level });
        }

        // 针对 API 路由标题（例如 ### GET /api/status）的专用徽章渲染
        const apiHeaderMatch = rawText.match(/^(GET|POST|DELETE|PUT|PATCH)\s+(.+)$/);
        if (level === 3 && apiHeaderMatch) {
          const method = apiHeaderMatch[1];
          const pathStr = apiHeaderMatch[2];
          const badgeColors: Record<string, string> = {
            GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          };
          const colorClass = badgeColors[method] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

          htmlBlocks.push(`
            <h3 id="${id}" class="group flex items-center gap-3 pt-10 pb-3 border-b border-zinc-800/60 text-sm font-semibold text-zinc-200 scroll-m-20">
              <span class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md border ${colorClass}">${method}</span>
              <span class="font-mono text-zinc-100 select-all">${pathStr}</span>
              <a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-zinc-600 hover:text-zinc-400" aria-label="Link to section">#</a>
            </h3>
          `);
        } else {
          const sizeClasses = {
            1: 'text-3xl font-bold text-zinc-50 tracking-tight pb-4 border-b border-zinc-700/50 mb-8 scroll-mt-20',
            2: 'text-lg font-semibold text-zinc-100 tracking-tight mt-14 mb-5 pb-3 border-b border-zinc-800/60 scroll-m-20',
            3: 'text-sm font-semibold text-zinc-200 mt-10 mb-4 scroll-m-20',
            4: 'text-xs font-semibold text-zinc-400 mt-8 mb-3 scroll-mt-20',
          }[level as 1|2|3|4] || 'text-sm';

          htmlBlocks.push(`<h${level} id="${id}" class="${sizeClasses} group">${inlineText}<a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-zinc-600 hover:text-zinc-400" aria-label="Link to section">#</a></h${level}>`);
        }
        continue;
      }
    }

    // 3. 分割线 (Horizontal Rule)
    if (block === '---') {
      htmlBlocks.push('<hr class="my-8 border-t border-zinc-800/80" />');
      continue;
    }

    // 4. 表格 (Tables)
    if (block.startsWith('|')) {
      const rows = block.split('\n');
      if (rows.length >= 2) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(2);

        const parseCells = (rowStr: string) => {
          return rowStr
            .split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        };

        const headers = parseCells(headerRow);
        const headerHtml = `
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/30">
              ${headers.map(h => `<th class="px-4 py-2 text-left text-[11px] font-medium text-zinc-400 tracking-wider">${renderInline(h)}</th>`).join('')}
            </tr>
          </thead>
        `;

        const bodyHtml = `
          <tbody class="divide-y divide-zinc-800/40">
            ${bodyRows.map(row => {
              const cells = parseCells(row);
              if (cells.length === 0) return '';
              return `
                <tr class="hover:bg-zinc-900/10 transition-colors">
                  ${cells.map(c => `<td class="px-4 py-2.5 text-xs text-zinc-400 align-top">${renderInline(c)}</td>`).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        `;

        htmlBlocks.push(`
          <div class="my-6 overflow-x-auto rounded-xl border border-zinc-800/60 bg-zinc-950/30">
            <table class="min-w-full divide-y divide-zinc-800/50">


              ${headerHtml}
              ${bodyHtml}
            </table>
          </div>
        `);
        continue;
      }
    }

    // 5. 无序列表 (Unordered Lists)
    if (block.startsWith('- ')) {
      const listItems = block.split('\n');
      const itemsHtml = listItems
        .map(li => {
          const content = li.replace(/^-\s+/, '');
          return `<li class="relative pl-5 py-0.5 text-xs text-zinc-400 leading-relaxed before:absolute before:left-1.5 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-zinc-700">${renderInline(content)}</li>`;
        })
        .join('');
      htmlBlocks.push(`<ul class="my-4 space-y-2">${itemsHtml}</ul>`);
      continue;
    }

    // 6. 段落 (Paragraphs - Fallback)
    const inlinePara = renderInline(block.trim().replace(/\n/g, '<br />'));
    htmlBlocks.push(`<p class="my-3 text-xs text-zinc-400 leading-relaxed">${inlinePara}</p>`);
  }

  return { html: htmlBlocks.join('\n'), toc };
}

const API_DOCS_MD = "# ThemeDist Monitor — API 接口文档\n\nBase URL: `https://themedist-monitor.vercel.app`\n\n---\n\n## 项目概述\n\nThemeDist Monitor 是 [ThemeDist](https://themedist.vercel.app) 每日主题分发服务的**双平台健康监控与安全审计系统**。ThemeDist 本身是一个基于 CSS 变量的每日主题推送服务，同时部署在 Vercel 与 Netlify 双平台上，为下游网站提供每日自动切换的视觉主题。\n\n本项目作为 ThemeDist 的\"体检中心\"，以独立的第三方视角对上游服务进行 24 小时不间断监控，覆盖以下维度：\n\n- **可用性监控** — 定时探测 Vercel 与 Netlify 双平台端点，记录 HTTP 状态码与响应延迟\n- **CDN 缓存追踪** — 监控 Vercel CDN 的缓存命中率（HIT/MISS/BYPASS），衡量边缘缓存效率\n- **主题安全审计** — 对每日主题数据进行 XSS 扫描、CSS 恶意代码检测、HTML 清洗与 Schema 校验\n- **数据库健康检查** — 探测 DIY 社区主题 API 以评估后端数据库与 Redis 的健康状态\n- **告警与通知** — 平台宕机或安全事件时自动触发邮件告警，恢复后自动解除\n- **公开 API 与徽章** — 提供免鉴权的 RESTful API 与 SVG 状态徽章，供社区嵌入 README 或第三方仪表盘\n\n### 适用人群\n\n| 角色 | 用途 |\n|---|---|\n| ThemeDist 使用者 | 通过徽章或 `/api/v1/status` 检查主题服务是否正常，决定是否使用当日主题 |\n| 主题作者 / 社区贡献者 | 通过安全审计接口校验自定义主题是否存在 XSS 风险 |\n| 下游网站开发者 | 使用 `/api/v1/today-safe` 作为安全代理获取已清洗的主题数据；通过 RUM 遥测上报客户端性能 |\n| 运维 / SRE | 监控双平台延迟趋势、CDN 命中率、SLA 可用率；诊断网络连通性 |\n\n---\n\n## 设计意图\n\n### 1. 独立第三方视角\n\nThemeDist Monitor 部署在独立的 Vercel 项目中，不共享 ThemeDist 的任何运行时资源。这种分离确保：\n\n- ThemeDist 自身宕机时，监控系统不受影响，仍可记录和报告故障\n- 监控数据不受 ThemeDist 服务端缓存或 CDN 策略干扰\n- 可作为 ThemeDist 用户的\"外部看门狗\"，提供独立信任锚点\n\n### 2. 安全优先\n\nThemeDist 的核心功能是将第三方贡献的主题 CSS 变量分发给所有使用方。这意味着**一个恶意主题可能通过 CSS 注入或 XSS 攻击影响所有下游网站**。因此本项目的安全审计管线是设计核心：\n\n```\n获取主题数据 → Schema 校验 → HTML 标签清洗 → XSS 模式扫描 → CSS 安全分析 → 安全判定\n```\n\n每一层都是独立的防线——即使上游校验失效，下游清洗仍会拦截风险内容。\n\n### 3. 公开透明\n\n所有 API 均为公开访问、免鉴权、启用 CORS。监控数据本身是公共信息——ThemeDist 服务的健康状况不应是黑盒。这种设计也使得社区可以基于这些 API 构建自己的工具。\n\n### 4. 双平台对比\n\nThemeDist 同时托管在 Vercel 和 Netlify 上，两个平台的 CDN 策略、冷启动行为、边缘网络拓扑均有差异。本项目并排展示两个平台的数据，帮助用户理解不同部署环境的实际表现差异。\n\n### 5. 可嵌入性\n\nSVG 徽章 API 的核心设计意图是让 ThemeDist 的状态信息可以**零成本嵌入到任何地方**——README 文件、Wiki 页面、Notion 文档、自定义仪表盘。徽章本身是静态 SVG 图片，不需要 JavaScript，不需要 iframe。\n\n---\n\n## 协议规范\n\n### 基础约定\n\n| 项目 | 规范 |\n|---|---|\n| 数据格式 | 所有响应体均为 `application/json`（徽章接口除外，返回 `image/svg+xml`） |\n| 字符编码 | UTF-8 |\n| 时间戳格式 | ISO 8601（`2026-05-24T12:00:00.000Z`） |\n| 日期格式 | ISO 8601 日期（`2026-05-24`） |\n| 跨域支持 | 所有端点启用 CORS，允许任意来源（`Access-Control-Allow-Origin: *`） |\n| 鉴权 | 所有 GET 端点免鉴权；POST/DELETE 操作需 `Authorization: Bearer <CRON_SECRET>` |\n| 部署区域 | Vercel 全球边缘网络（Edge Runtime 端点为 `hkg1` 或其他自动选择区域） |\n\n### HTTP 状态码约定\n\n| 状态码 | 含义 | 适用场景 |\n|---|---|---|\n| `200` | 成功 | 正常响应 |\n| `400` | 请求无效 | 请求体格式错误、参数超出范围（如 telemetry duration > 60000） |\n| `404` | 资源不存在 | 未知的徽章类型、不存在的端点 |\n| `429` | 频率限制 | monitor（30s/次）、diagnose（30s/次）触发限流 |\n| `502` | 上游不可达 | ThemeDist 双平台均无法访问（today-safe）、网络诊断全部失败（diagnose） |\n| `500` | 服务器内部错误 | 未预期的运行时异常 |\n\n### 缓存策略\n\n各端点根据数据新鲜度需求采用不同的 `Cache-Control` 策略：\n\n| 端点 | CDN 缓存 | SWR | 说明 |\n|---|---|---|---|\n| `/api/v1/badges/:type` | 300s | 600s | 徽章内容变化频率低 |\n| `/api/v1/status` | 30s | 120s | 状态信息需较新鲜 |\n| `/api/v1/data` | 30s | 60s | 仪表盘数据需近实时 |\n| `/api/v1/security-status` | 300s | — | 安全审计每日更新一次 |\n| 其他端点 | 无缓存 | — | 实时数据，不缓存 |\n\n### 频率限制\n\n为防止滥用，以下端点实现了基于 KV 的冷却期限制：\n\n- `/api/v1/monitor` — 30 秒内最多调用 1 次\n- `/api/v1/diagnose` — 30 秒内最多调用 1 次\n- `/api/v1/today-safe` — 恶意 IP 1 小时内违规 5 次将封禁 24 小时\n\n触发限流时返回 `429 Too Many Requests`。\n\n### 状态枚举值\n\n平台状态：\n\n| 值 | 含义 |\n|---|---|\n| `online` | 正常响应（延迟 ≤ 2s） |\n| `slow` | 响应延迟 > 2s，但仍在正常返回数据 |\n| `outage` | 无法连接或返回非 2xx/3xx 状态码 |\n| `unknown` | 尚无监控数据 |\n\n整体健康度：\n\n| 值 | 含义 |\n|---|---|\n| `healthy` | 所有平台正常运行 |\n| `degraded` | 至少一个平台出现 slow 或异常 |\n| `down` | 所有平台不可用 |\n| `unknown` | 尚无监控数据 |\n\n安全状态：\n\n| 值 | 含义 |\n|---|---|\n| `safe` | 未检测到安全风险 |\n| `unsafe` | 检测到 XSS、恶意 CSS 或 Schema 不匹配 |\n\n---\n\n## API 端点参考\n\n---\n\n### 状态徽章\n\n#### GET /api/v1/badges/:type\n\n返回 SVG 状态徽章（shields.io 风格），可嵌入 README 文件、文档页面或第三方仪表盘。徽章内容根据最新的监控数据动态生成。\n\n**路径参数：**\n\n| 参数 | 类型 | 必填 | 说明 |\n|---|---|---|---|\n| `:type` | `string` | 是 | 徽章类型，可选值见下表 |\n\n**查询参数：**\n\n| 参数 | 类型 | 必填 | 说明 |\n|---|---|---|---|\n| `debug` | `string` | 否 | 设为 `1` 时返回 JSON 格式的调试信息而非 SVG 图片 |\n\n**支持的徽章类型：**\n\n| `:type` 值 | 徽章标题 | 数据来源 | 状态映射 |\n|---|---|---|---|\n| `vercel` | Vercel | `/api/v1/status` → platforms.vercel.status | online=绿色, slow=黄色, outage=红色, unknown=灰色 |\n| `netlify` | Netlify | `/api/v1/status` → platforms.netlify.status | 同上 |\n| `theme` | Theme Safety | `/api/v1/status` → theme.isSafe | true=绿色, false=红色 |\n| `database` | Database | `/api/v1/status` → theme 数据可用性 | healthy=绿色, 其他=红色 |\n| `uptime` | Uptime | SLA 统计（近 7 日） | 百分比数值 |\n\n**响应格式：**\n\n- 默认：`image/svg+xml`（SVG 图片，可直接用于 `<img>` 标签）\n- `?debug=1`：`application/json`\n\n**调试输出示例（`?debug=1`）：**\n\n```json\n{\n  \"type\": \"vercel\",\n  \"label\": \"Vercel\",\n  \"status\": \"online\",\n  \"color\": \"brightgreen\",\n  \"message\": \"online\"\n}\n```\n\n**缓存策略：** CDN 300s，SWR 600s\n\n**跨域支持：** 已启用 CORS（`*`）\n\n**实时效果预览：**\n\n![Vercel 状态](https://themedist-monitor.vercel.app/api/v1/badges/vercel)\n![Netlify 状态](https://themedist-monitor.vercel.app/api/v1/badges/netlify)\n![主题安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)\n![数据库](https://themedist-monitor.vercel.app/api/v1/badges/database)\n![可用率](https://themedist-monitor.vercel.app/api/v1/badges/uptime)\n\n**使用示例：**\n\nMarkdown（嵌入 README）：\n\n```markdown\n![Vercel 状态](https://themedist-monitor.vercel.app/api/v1/badges/vercel)\n![Netlify 状态](https://themedist-monitor.vercel.app/api/v1/badges/netlify)\n![主题安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)\n```\n\nHTML（嵌入网页）：\n\n```html\n<img src=\"https://themedist-monitor.vercel.app/api/v1/badges/vercel\" alt=\"Vercel Status\" />\n<img src=\"https://themedist-monitor.vercel.app/api/v1/badges/theme\" alt=\"Theme Safety\" />\n```\n\ncurl 调试：\n\n```bash\n# 获取 SVG 徽章\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/badges/vercel'\n\n# 调试模式查看 JSON 元数据\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/badges/vercel?debug=1' | jq .\n```\n\n---\n\n### 平台健康状态\n\n#### GET /api/v1/status\n\n获取所有监控平台的当前健康摘要。这是最轻量的状态查询端点——运行在 Vercel Edge Runtime 上，延迟极低（全球边缘响应通常在 50ms 以内），适合用作健康检查端点或监控告警的数据源。\n\n**运行时环境：** Edge Runtime\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"overall\": \"healthy\",\n  \"platforms\": {\n    \"vercel\": {\n      \"status\": \"online\",\n      \"latencyMs\": 245,\n      \"cacheStatus\": \"HIT\"\n    },\n    \"netlify\": {\n      \"status\": \"online\",\n      \"latencyMs\": 312,\n      \"cacheStatus\": \"MISS\"\n    }\n  },\n  \"theme\": {\n    \"date\": \"2026-05-24\",\n    \"presetName\": \"Minimal Blue\",\n    \"themeCount\": 12,\n    \"isSafe\": true\n  },\n  \"checkedAt\": \"2026-05-24T00:00:00.000Z\"\n}\n```\n\n**响应字段：**\n\n| 字段 | 类型 | 说明 |\n|---|---|---|\n| `overall` | `string` | 整体健康状态：`healthy` / `degraded` / `down` / `unknown` |\n| `platforms.vercel.status` | `string` | Vercel 平台状态：`online` / `slow` / `outage` / `unknown` |\n| `platforms.vercel.latencyMs` | `number` | Vercel 最近一次探测的响应延迟（毫秒） |\n| `platforms.vercel.cacheStatus` | `string` | CDN 缓存状态：`HIT` / `MISS` / `BYPASS` / `N/A` |\n| `platforms.netlify.*` | — | 同上结构，对应 Netlify 平台 |\n| `theme.date` | `string` | 当前主题日期 |\n| `theme.presetName` | `string` | 当前预设主题名称 |\n| `theme.themeCount` | `number` | 当前可用主题数量 |\n| `theme.isSafe` | `boolean` | 当前主题是否通过安全审计 |\n| `checkedAt` | `string` | 最近一次监控检测的 ISO 8601 时间戳 |\n\n**缓存策略：** CDN 30s，SWR 120s\n\n**使用建议：** 此端点数据来源于 KV 存储中最近一次监控检测的结果摘要，读取极快。适合轮询场景：建议每 30-60 秒请求一次。\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/status' | jq .\n```\n\n**JavaScript 示例（浏览器）：**\n\n```javascript\nasync function checkHealth() {\n  const res = await fetch('https://themedist-monitor.vercel.app/api/v1/status');\n  const data = await res.json();\n  console.log(`Overall: \\${data.overall}`);\n  console.log(`Vercel: \\${data.platforms.vercel.status} (\\${data.platforms.vercel.latencyMs}ms)`);\n  console.log(`Netlify: \\${data.platforms.netlify.status} (\\${data.platforms.netlify.latencyMs}ms)`);\n  return data;\n}\n```\n\n---\n\n### 仪表盘完整数据\n\n#### GET /api/v1/data\n\n获取仪表盘所需的完整数据：实时状态、24 小时性能指标、性能日志历史、主题快照、告警记录以及安全事件日志。此端点是 `/api/v1/status` 的超集，适合需要展示图表或历史数据的场景。\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"status\": {\n    \"vercel\": { \"status\": \"online\", \"latencyMs\": 245, \"cacheStatus\": \"HIT\" },\n    \"netlify\": { \"status\": \"online\", \"latencyMs\": 312, \"cacheStatus\": \"MISS\" },\n    \"db\": \"healthy\"\n  },\n  \"metrics\": {\n    \"avgLatency24h\": { \"vercel\": 280, \"netlify\": 340 },\n    \"cdnHitRate\": 85,\n    \"themeCount\": 12,\n    \"sla\": { \"7day\": 99.8, \"30day\": 99.5 }\n  },\n  \"performanceLogs\": [\n    {\n      \"id\": \"uuid\",\n      \"timestamp\": \"2026-05-24T12:00:00.000Z\",\n      \"platform\": \"vercel\",\n      \"endpoint\": \"https://themedist.vercel.app/api/v1/today.json\",\n      \"statusCode\": 200,\n      \"latencyMs\": 245,\n      \"cacheStatus\": \"HIT\",\n      \"cacheControl\": \"public, max-age=3600\"\n    }\n  ],\n  \"latestSnapshot\": {\n    \"id\": \"uuid\",\n    \"date\": \"2026-05-24\",\n    \"preset\": \"minimal-blue\",\n    \"presetName\": \"Minimal Blue\",\n    \"author\": \"themedist\",\n    \"themeCount\": 12,\n    \"isValidSchema\": true,\n    \"securityStatus\": \"safe\",\n    \"flaggedReasons\": []\n  },\n  \"alerts\": {\n    \"unresolved\": [],\n    \"recent\": []\n  },\n  \"securityIncidents\": [],\n  \"metricsHistory\": {\n    \"vercelLatency\": [{ \"timestamp\": \"...\", \"value\": 245 }],\n    \"netlifyLatency\": [{ \"timestamp\": \"...\", \"value\": 312 }],\n    \"cdnHitRate\": [{ \"timestamp\": \"...\", \"value\": 85 }]\n  },\n  \"timestamp\": \"2026-05-24T12:00:00.000Z\"\n}\n```\n\n**核心字段说明：**\n\n| 字段 | 类型 | 说明 |\n|---|---|---|\n| `status` | `object` | 当前平台实时状态（结构同 `/api/v1/status`） |\n| `metrics.avgLatency24h` | `object` | 过去 24 小时 Vercel / Netlify 各平台平均延迟 |\n| `metrics.cdnHitRate` | `number` | 过去 24 小时 CDN 缓存命中率（百分比，0-100） |\n| `metrics.sla` | `object` | 7 天与 30 天 SLA 可用率（百分比） |\n| `performanceLogs` | `array` | 最近的性能日志条目（扫描窗口为最近 4 条记录） |\n| `latestSnapshot` | `object` | 最近一次主题快照（安全审计结果） |\n| `alerts.unresolved` | `array` | 当前未解除的告警 |\n| `alerts.recent` | `array` | 最近的告警记录（含已解除） |\n| `metricsHistory` | `object` | 各指标的历史时序数据，供图表渲染 |\n\n**缓存策略：** CDN 30s，SWR 60s\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/data' | jq '.metrics'\n```\n\n---\n\n### 触发监控检测\n\n#### GET /api/v1/monitor\n\n公开触发一次完整的监控检测流程，无需鉴权。完整流程包括：\n\n1. 并行抓取 Vercel、Netlify 及 DIY 社区主题端点的数据\n2. 记录每个端点的 HTTP 状态码、延迟、CDN 缓存头\n3. 对主题数据执行 JSON Schema 校验\n4. 执行 XSS 安全扫描（脚本标签、事件处理器、javascript: URI 等）\n5. 执行 CSS 安全分析（`@import` 外链、`expression()` 等）\n6. 对主题扩展字段执行 HTML 清洗\n7. 检查数据库 / Redis 健康状态\n8. 将性能日志与主题快照写入持久存储\n9. 根据结果生成或解除告警，必要时发送邮件通知\n\n**频率限制：** 30 秒内最多调用 1 次（使用 KV 互斥锁防止并发重复执行）\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"message\": \"Monitor check complete\",\n  \"timestamp\": \"2026-05-24T06:51:05.605Z\",\n  \"performanceLogs\": [\n    {\n      \"id\": \"839c12f6-...\",\n      \"timestamp\": \"2026-05-24T06:51:01.354Z\",\n      \"platform\": \"vercel\",\n      \"endpoint\": \"https://themedist.vercel.app/api/v1/today.json\",\n      \"statusCode\": 200,\n      \"latencyMs\": 820,\n      \"cacheStatus\": \"MISS\",\n      \"cacheControl\": \"public, max-age=3600\",\n      \"error\": null\n    }\n  ],\n  \"themeSnapshot\": {\n    \"id\": \"3ce3e8ad-...\",\n    \"date\": \"2026-05-24\",\n    \"preset\": \"holiday-144\",\n    \"presetName\": \"BUDDHA BIRTHDAY\",\n    \"themeCount\": 147,\n    \"isValidSchema\": true,\n    \"securityStatus\": \"safe\",\n    \"flaggedReasons\": []\n  },\n  \"alerts\": [],\n  \"notificationsSent\": 0\n}\n```\n\n**响应字段：**\n\n| 字段 | 类型 | 说明 |\n|---|---|---|\n| `message` | `string` | 执行结果描述 |\n| `performanceLogs` | `array` | 本次检测产生的全部性能日志条目 |\n| `themeSnapshot` | `object` | 本次检测产生的主题快照 |\n| `alerts` | `array` | 本次检测触发的告警列表（含新告警与已恢复告警） |\n| `notificationsSent` | `number` | 本次检测发送的邮件通知数量 |\n\n**curl 示例：**\n\n```bash\n# 手动触发检测\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/monitor' | jq .\n\n# 仅查看是否触发告警\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/monitor' | jq '.alerts'\n```\n\n---\n\n#### POST /api/v1/monitor\n\n与 GET 执行相同的检测流程，但需要鉴权。此端点专供 Vercel Cron Jobs 定时调度使用。\n\n**请求头：**\n\n| Header | 值 |\n|---|---|\n| `Authorization` | `Bearer <CRON_SECRET>` |\n| `Content-Type` | `application/json` |\n\n**响应格式：** 同 GET `/api/v1/monitor`\n\n**curl 示例：**\n\n```bash\ncurl -sS -X POST \\\n  -H 'Authorization: Bearer your-cron-secret' \\\n  'https://themedist-monitor.vercel.app/api/v1/monitor' | jq .\n```\n\n---\n\n### 数据管理\n\n#### DELETE /api/v1/monitor\n\n清除所有已存储的监控数据，包括性能日志、主题快照、告警记录、安全事件日志和状态哈希。需鉴权。\n\n**请求头：**\n\n| Header | 值 |\n|---|---|\n| `Authorization` | `Bearer <CRON_SECRET>` |\n\n**响应格式：** `application/json`\n\n```json\n{ \"message\": \"All monitoring data cleared\" }\n```\n\n**curl 示例：**\n\n```bash\ncurl -sS -X DELETE \\\n  -H 'Authorization: Bearer your-cron-secret' \\\n  'https://themedist-monitor.vercel.app/api/v1/monitor'\n```\n\n---\n\n### 安全审计状态\n\n#### GET /api/v1/security-status\n\n获取最近一次主题安全审计的详细结果。适合主题作者或安全研究人员在发布主题后验证其安全性。\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"status\": \"safe\",\n  \"message\": \"当前主题可安全使用\",\n  \"securityStatus\": \"safe\",\n  \"flaggedReasons\": [],\n  \"schemaValid\": true,\n  \"themeName\": \"Minimal Blue\",\n  \"checkedAt\": \"2026-05-24\",\n  \"timestamp\": \"2026-05-24T12:00:00.000Z\"\n}\n```\n\n**当检测到风险时的响应示例：**\n\n```json\n{\n  \"status\": \"unsafe\",\n  \"message\": \"检测到安全风险\",\n  \"securityStatus\": \"unsafe\",\n  \"flaggedReasons\": [\n    \"检测到事件处理器: onclick\",\n    \"检测到 javascript: 协议\"\n  ],\n  \"schemaValid\": true,\n  \"themeName\": \"Malicious Theme\",\n  \"checkedAt\": \"2026-05-24\",\n  \"timestamp\": \"2026-05-24T12:00:00.000Z\"\n}\n```\n\n**安全扫描覆盖的风险类型：**\n\n| 风险类型 | 检测模式 |\n|---|---|\n| 脚本注入 | `<script>` 标签 |\n| 事件处理器 | `onclick`, `onerror`, `onload`, `onmouseover` 等 HTML 事件属性 |\n| JavaScript 协议 | `javascript:` URI |\n| Cookie 窃取 | `document.cookie` |\n| 代码执行 | `eval()`, `Function()` |\n| iframe 注入 | `<iframe>` 标签 |\n| CSS 表达式 | `expression()`, `behavior`, `-moz-binding` |\n| 恶意外链 | CSS 中的 `@import` 非白名单域名 |\n| 数据注入 | `data:text/html` URI |\n\n**缓存策略：** CDN 300s（revalidate）\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/security-status' | jq .\n```\n\n---\n\n### 网络诊断\n\n#### GET /api/v1/diagnose\n\n从服务器端探测与关键端点的网络连通性。此端点对于以下场景尤其有用：\n\n- 怀疑是否存在区域性网络阻断\n- 验证代理配置是否正确（通过 `env` 字段查看代理状态）\n- 区分\"ThemeDist 宕机\"和\"自身网络问题\"\n\n探测目标包括 ThemeDist 的双平台端点以及一个知名公网主机（baidu.com）作为对照组。\n\n**频率限制：** 30 秒内最多调用 1 次\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"env\": {\n    \"HTTPS_PROXY\": \"not set\",\n    \"HTTP_PROXY\": \"not set\"\n  },\n  \"probes\": [\n    {\n      \"url\": \"themedist.vercel.app/api/v1/today.json\",\n      \"ok\": true,\n      \"status\": 200,\n      \"ms\": 245\n    },\n    {\n      \"url\": \"themedist.netlify.app/api/v1/today.json\",\n      \"ok\": true,\n      \"status\": 200,\n      \"ms\": 312\n    },\n    {\n      \"url\": \"www.baidu.com\",\n      \"ok\": true,\n      \"status\": 200,\n      \"ms\": 180\n    }\n  ],\n  \"summary\": \"All reachable\",\n  \"timestamp\": \"2026-05-24T12:00:00.000Z\"\n}\n```\n\n**HTTP 状态码：** 全部可达返回 `200`，任一探测失败返回 `502`\n\n**诊断解读：**\n\n| 现象 | 可能原因 |\n|---|---|\n| ThemeDist 端点失败、baidu.com 成功 | ThemeDist 服务问题 |\n| 所有端点均失败 | 服务器自身网络问题或代理配置错误 |\n| `HTTPS_PROXY` 有值但连接失败 | 代理服务器不可达或配置错误 |\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/diagnose' | jq .\n```\n\n---\n\n### 安全主题代理\n\n#### GET /api/v1/today-safe\n\n从 ThemeDist 代理获取最新的每日主题数据，并应用完整的安全清洗管线。此端点是下游主题消费者的**推荐接入点**——它返回的数据可以直接用于设置 CSS 变量，无需额外的客户端清洗。\n\n**请求流程：**\n\n1. 优先从 `themedist.vercel.app` 获取 `today.json`\n2. 若 Vercel 端点不可达，回退到 `themedist.netlify.app`\n3. 对获取的数据依次执行：Schema 校验 → HTML 标签清洗 → XSS 扫描 → CSS 安全分析\n4. 将清洗后的安全版本缓存到 KV（作为\"最后已知安全版本\"）\n5. 若双平台均不可达，返回缓存的安全版本\n6. 若恶意 IP 频繁访问，触发自动封禁\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"date\": \"2026-05-24\",\n  \"preset\": \"minimal-blue\",\n  \"presetName\": \"Minimal Blue\",\n  \"author\": \"themedist\",\n  \"available\": 12,\n  \"cssVars\": {\n    \"--color-primary\": \"#3b82f6\",\n    \"--color-bg\": \"#0f172a\"\n  },\n  \"customCss\": \":root { ... }\",\n  \"extensions\": [],\n  \"directory\": [],\n  \"_meta\": {\n    \"sanitized\": true,\n    \"schemaValid\": true,\n    \"source\": \"vercel\",\n    \"timestamp\": \"2026-05-24T12:00:00.000Z\"\n  }\n}\n```\n\n**`_meta` 字段说明：**\n\n| 字段 | 类型 | 说明 |\n|---|---|---|\n| `sanitized` | `boolean` | 是否经过了安全清洗 |\n| `schemaValid` | `boolean` | 数据是否通过 Schema 校验 |\n| `source` | `string` | 数据来源：`vercel` / `netlify` / `cache`（回退缓存） |\n| `timestamp` | `string` | 数据获取时间戳 |\n\n**异常处理：** 两个平台均不可达且无缓存时返回 `502`\n\n**JavaScript 集成示例：**\n\n```javascript\nasync function applyTheme() {\n  try {\n    const res = await fetch('https://themedist-monitor.vercel.app/api/v1/today-safe');\n    if (!res.ok) {\n      console.error('无法获取安全主题数据');\n      return;\n    }\n    const theme = await res.json();\n    // 直接将清洗后的 CSS 变量应用到 :root\n    const root = document.documentElement;\n    Object.entries(theme.cssVars).forEach(([key, value]) => {\n      root.style.setProperty(key, value);\n    });\n    console.log(`已应用主题: \\${theme.presetName} (来源: \\${theme._meta.source})`);\n  } catch (err) {\n    console.error('主题加载失败', err);\n  }\n}\n```\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/today-safe' | jq '._meta'\n```\n\n---\n\n### 全球边缘探测\n\n#### GET /api/v1/probe\n\n在 Vercel Edge Runtime 上运行的地理边缘探测。与 `/api/v1/monitor` 不同，此端点在 Vercel 的边缘节点上执行，自动选择距离请求来源最近的区域。用于收集多区域的延迟数据，评估 ThemeDist 的全球访问质量。\n\n**运行时环境：** Edge Runtime\n\n**响应格式：** `application/json`\n\n```json\n{\n  \"probe\": {\n    \"region\": \"hkg1\",\n    \"duration\": 520\n  },\n  \"results\": [\n    {\n      \"id\": \"uuid\",\n      \"timestamp\": \"2026-05-24T12:00:00.000Z\",\n      \"region\": \"hkg1\",\n      \"platform\": \"vercel\",\n      \"endpoint\": \"https://themedist.vercel.app/api/v1/today.json\",\n      \"statusCode\": 200,\n      \"latencyMs\": 245\n    },\n    {\n      \"id\": \"uuid\",\n      \"timestamp\": \"2026-05-24T12:00:00.000Z\",\n      \"region\": \"hkg1\",\n      \"platform\": \"netlify\",\n      \"endpoint\": \"https://themedist.netlify.app/api/v1/today.json\",\n      \"statusCode\": 200,\n      \"latencyMs\": 312\n    }\n  ]\n}\n```\n\n**触发方式：** Vercel Cron 自动调度，每天 UTC 6:00（北京时间 14:00）执行一次。也可手动 GET 触发。\n\n**curl 示例：**\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/probe' | jq '.probe.region'\n```\n\n---\n\n### 遥测上报\n\n#### POST /api/v1/telemetry\n\n接收真实用户监控（RUM）遥测数据。下游网站可在加载 ThemeDist 主题时上报客户端的实际加载耗时，帮助完善性能画像。\n\n**请求体格式：** `application/json`\n\n| 字段 | 类型 | 必填 | 约束 | 说明 |\n|---|---|---|---|---|\n| `duration` | `number` | 是 | 0–60000（毫秒） | 客户端加载主题的耗时 |\n| `platform` | `string` | 否 | `vercel` / `netlify` | 标识数据来源平台 |\n\n**请求体示例：**\n\n```json\n{\n  \"duration\": 245,\n  \"platform\": \"vercel\"\n}\n```\n\n**响应格式：** `application/json`\n\n```json\n{ \"ok\": true }\n```\n\n**错误响应（duration 超出范围）：**\n\n```json\n{ \"error\": \"duration 需为 0–60000 之间的数值\" }\n```\n\n**浏览器集成示例：**\n\n```javascript\n// 在页面加载时记录主题获取耗时并上报\nconst start = performance.now();\n\nfetch('https://themedist-monitor.vercel.app/api/v1/today-safe')\n  .then(res => res.json())\n  .then(theme => {\n    const duration = Math.round(performance.now() - start);\n    // 应用主题...\n    Object.entries(theme.cssVars).forEach(([k, v]) => {\n      document.documentElement.style.setProperty(k, v);\n    });\n    // 上报遥测（fire-and-forget）\n    navigator.sendBeacon(\n      'https://themedist-monitor.vercel.app/api/v1/telemetry',\n      JSON.stringify({ duration, platform: 'vercel' })\n    );\n  });\n```\n\n**curl 示例：**\n\n```bash\ncurl -sS -X POST \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"duration\": 245, \"platform\": \"vercel\"}' \\\n  'https://themedist-monitor.vercel.app/api/v1/telemetry'\n```\n\n---\n\n## 集成指南\n\n### 场景一：在 README 中嵌入状态徽章\n\n最简单直接的集成方式。将以下 Markdown 添加到你的 README.md：\n\n```markdown\n## ThemeDist 服务状态\n\n![Vercel](https://themedist-monitor.vercel.app/api/v1/badges/vercel)\n![Netlify](https://themedist-monitor.vercel.app/api/v1/badges/netlify)\n![安全](https://themedist-monitor.vercel.app/api/v1/badges/theme)\n```\n\n徽章图片会随监控数据自动更新，无需任何维护。\n\n### 场景二：构建自定义状态面板\n\n结合 `/api/v1/status` 和 `/api/v1/data` 构建你自己的监控仪表盘：\n\n```javascript\n// 轻量轮询 — 适合状态指示灯\nsetInterval(async () => {\n  const { overall, platforms } = await fetch(\n    'https://themedist-monitor.vercel.app/api/v1/status'\n  ).then(r => r.json());\n\n  updateIndicator('vercel-light', platforms.vercel.status);\n  updateIndicator('netlify-light', platforms.netlify.status);\n}, 30000); // 每 30 秒\n\n// 完整数据 — 适合图表仪表盘\nasync function loadDashboard() {\n  const data = await fetch(\n    'https://themedist-monitor.vercel.app/api/v1/data'\n  ).then(r => r.json());\n\n  renderLatencyChart(data.metricsHistory.vercelLatency);\n  renderCdnPieChart(data.metrics.cdnHitRate);\n  renderAlertList(data.alerts.unresolved);\n}\n```\n\n### 场景三：在你的网站中使用安全主题\n\n下游网站消费 ThemeDist 主题的推荐方式——使用 `/api/v1/today-safe` 作为安全代理：\n\n```javascript\n// React Hook 示例\nfunction useThemeDist() {\n  const [theme, setTheme] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    const start = performance.now();\n    fetch('https://themedist-monitor.vercel.app/api/v1/today-safe')\n      .then(res => res.json())\n      .then(data => {\n        setTheme(data);\n        // 应用 CSS 变量\n        const root = document.documentElement;\n        Object.entries(data.cssVars).forEach(([k, v]) => {\n          root.style.setProperty(k, v);\n        });\n        // 上报遥测\n        const duration = Math.round(performance.now() - start);\n        fetch('https://themedist-monitor.vercel.app/api/v1/telemetry', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ duration, platform: 'vercel' }),\n        }).catch(() => {}); // 静默失败\n      })\n      .finally(() => setLoading(false));\n  }, []);\n\n  return { theme, loading };\n}\n```\n\n### 场景四：健康检查与告警集成\n\n将 ThemeDist Monitor 集成到你的告警体系中：\n\n```bash\n#!/bin/bash\n# crontab: */5 * * * * /path/to/themedist-healthcheck.sh\n\nSTATUS=\\$(curl -sS 'https://themedist-monitor.vercel.app/api/v1/status')\nOVERALL=\\$(echo \"\\$STATUS\" | jq -r '.overall')\n\nif [ \"\\$OVERALL\" = \"down\" ]; then\n  # 触发你的告警通道（Slack、PagerDuty 等）\n  echo \"ThemeDist 全面宕机！\" | mail -s \"ALERT\" ops@example.com\nelif [ \"\\$OVERALL\" = \"degraded\" ]; then\n  echo \"ThemeDist 性能降级: \\$STATUS\" | mail -s \"WARN\" ops@example.com\nfi\n```\n\n### 场景五：网络故障排查\n\n当用户反馈主题加载异常时，使用 `/api/v1/diagnose` 快速定位问题：\n\n```bash\ncurl -sS 'https://themedist-monitor.vercel.app/api/v1/diagnose' | jq .\n```\n\n根据输出判断：\n- 所有探测 OK → 问题可能在客户端\n- ThemeDist 端点失败 → ThemeDist 服务问题\n- 全部失败 → 网络或代理问题\n\n---\n\n## 开发参考\n\n### 技术栈\n\n| 层面 | 技术 | 说明 |\n|---|---|---|\n| 框架 | Next.js 14 (App Router) | React 全栈框架，Server Components + API Routes |\n| 语言 | TypeScript 5 | 全量类型覆盖 |\n| 样式 | Tailwind CSS 3 | 暗色主题设计系统 |\n| 图表 | Recharts 2 | 延迟趋势折线图、CDN 饼图、响应时间面积图 |\n| 存储 | Vercel KV (Upstash Redis) | 主存储：有序集合存日志、列表存告警、哈希存状态 |\n| 存储回退 | 本地 JSON 文件 | 无 KV 配置时自动回退到 `./data/` 目录 |\n| 邮件 | Nodemailer + QQ SMTP | 告警邮件通知 |\n| 部署 | Vercel | 全球边缘网络，支持 Cron Jobs |\n| 图标 | lucide-react | MIT 协议图标库 |\n\n### 运行时环境\n\n本项目混合使用两种 Vercel 运行时：\n\n| 运行时 | 使用的端点 | 特点 |\n|---|---|---|\n| **Edge Runtime** | `/api/v1/status`, `/api/v1/probe` | 全球边缘节点执行，延迟极低（<50ms），适合健康检查和高频轮询。限制：无文件系统访问，仅支持部分 Node.js API |\n| **Node.js Runtime** | 其余全部端点 | 完整 Node.js 能力：文件系统、KV 客户端、Nodemailer。冷启动较长，但功能不受限 |\n\n### 数据流架构\n\n```\nVercel Cron (每日 0:00 UTC)\n       │\n       ▼\nPOST /api/v1/monitor (Bearer 鉴权)\n       │\n       ▼\n  runAllChecks()\n       │\n       ├─► fetch themedist.vercel.app  ─► PerformanceLog ─► KV ZSET\n       ├─► fetch themedist.netlify.app ─► PerformanceLog ─► KV ZSET\n       ├─► fetch DIY themes API       ─► DB health check\n       └─► validate + security scan   ─► ThemeSnapshot ─► KV ZSET\n                                               │\n                                    ┌──────────┴──────────┐\n                                    ▼                     ▼\n                              Alert 判定             Status Hash\n                                    │                  (KV HASH)\n                                    ▼\n                              Email 通知\n                           (Nodemailer + QQ SMTP)\n\n用户请求:\n  /api/v1/status   ─► 读取 KV HASH        ─► 即时响应 (Edge, <50ms)\n  /api/v1/data     ─► 读取 KV ZSET/LIST   ─► 聚合响应 (Node, ~100ms)\n  /api/v1/badges   ─► 读取 KV HASH        ─► 渲染 SVG (Node, ~50ms)\n```\n\n### 持久化策略\n\n| 数据类型 | KV 数据结构 | 保留策略 | 本地回退文件 |\n|---|---|---|---|\n| 性能日志 | Sorted Set（按时间戳排序） | 7 天 | `data/performance-logs.json` |\n| 主题快照 | Sorted Set（按时间戳排序） | 7 天 | `data/theme-snapshots.json` |\n| 平台状态 | Hash（覆盖写入） | 永久（覆盖） | 内存 |\n| 告警列表 | List（头部插入） | 永久 | `data/system-alerts.json` |\n| 安全事件 | List（头部插入） | 永久 | KV 独占 |\n| 遥测分布 | Sorted Set（延迟分桶） | 7 天 | KV 独占 |\n| 速率限制 | String（含 TTL） | 自动过期 | KV 独占 |\n\n### 安全架构\n\n本项目的安全设计遵循纵深防御原则，每层独立运作：\n\n```\n第 1 层：Schema 校验\n  └─ 验证 today.json 结构完整性（必需字段、CSS 变量数量下限）\n\n第 2 层：HTML 清洗\n  └─ 白名单标签 + 白名单属性 + 事件处理器剥离\n\n第 3 层：XSS 模式扫描（14 条正则规则）\n  └─ script 标签、事件处理器、javascript: 协议、document.cookie、\n     eval()、iframe、data:text/html\n\n第 4 层：CSS 安全分析\n  └─ @import 外链白名单、expression() 检测、behavior 检测、\n     -moz-binding 检测、url() 引用审查、变量数量异常检测\n\n第 5 层：IP 封禁\n  └─ 1 小时内违规 5 次 → 24 小时封禁\n```\n\n### 本地开发\n\n```bash\n# 安装依赖\nnpm install\n\n# 启动开发服务器（默认 localhost:3000）\nnpm run dev\n\n# 手动执行一次监控检测\nnpm run monitor\n\n# 访问 API 文档\nopen http://localhost:3000/api-docs\n\n# 访问仪表盘\nopen http://localhost:3000\n```\n\n本地开发时若位于企业代理后方，需在 `.env.local` 中配置：\n\n```env\nHTTPS_PROXY=http://proxy.example.com:8080\nHTTP_PROXY=http://proxy.example.com:8080\n```\n\n### 目录结构\n\n```\nsrc/\n├── app/\n│   ├── page.tsx                       # 仪表盘 UI 主页\n│   ├── layout.tsx                     # 根布局（Metadata + Providers）\n│   ├── globals.css                    # 全局样式 + Tailwind 指令\n│   ├── api-docs/page.tsx              # API 文档页（渲染 DOCS/API.md）\n│   └── api/\n│       ├── badges/[type]/route.ts     # SVG 徽章端点\n│       ├── status/route.ts            # 平台健康摘要（Edge Runtime）\n│       ├── data/route.ts              # 仪表盘完整数据\n│       ├── monitor/route.ts           # 触发 / 清除监控检测\n│       ├── security-status/route.ts   # 安全审计结果\n│       ├── diagnose/route.ts          # 网络连通性诊断\n│       ├── today-safe/route.ts        # 安全主题代理\n│       ├── probe/route.ts             # 边缘探测（Edge Runtime）\n│       ├── telemetry/route.ts         # RUM 遥测上报\n│       └── debug-kv/route.ts          # KV 存储诊断\n├── components/\n│   ├── live-status.tsx                # 实时状态卡片\n│   ├── metrics-panel.tsx              # 图表面板\n│   ├── theme-audit.tsx                # 安全审计卡片\n│   ├── alerts-history.tsx             # 告警历史列表\n│   ├── failover-guide.tsx             # 集成指南 + 代码片段\n│   ├── copy-all-button.tsx            # 复制按钮\n│   ├── providers.tsx                  # i18n + Header + Footer\n│   └── theme-dist-theme.tsx           # 主题 CSS 变量应用\n├── lib/\n│   ├── monitor.ts                     # 核心监控编排\n│   ├── store.ts                       # 数据持久化（KV / 本地文件）\n│   ├── kv.ts                          # Vercel KV 封装\n│   ├── security.ts                    # XSS 扫描器\n│   ├── css-analyzer.ts                # CSS 安全分析器\n│   ├── html-sanitizer.ts              # HTML 标签清洗器\n│   ├── validator.ts                   # JSON Schema 校验器\n│   ├── notifier.ts                    # 邮件告警发送\n│   ├── fetch-proxy.ts                 # 代理感知 fetch\n│   ├── rate-limit.ts                  # 频率限制\n│   ├── alert-cooldown.ts              # 告警冷却期\n│   ├── archiver.ts                    # 数据归档\n│   ├── cors.ts                        # CORS 头工具\n│   ├── security-logger.ts             # 安全事件日志\n│   ├── ip-blocker.ts                  # IP 封禁\n│   └── i18n.tsx                       # 中英文国际化\n└── types/\n    └── index.ts                       # TypeScript 类型定义\n```\n\n---\n\n## 通用 HTTP 状态码\n\n| 状态码 | 含义 |\n|---|---|\n| `200` | 成功 |\n| `400` | 请求体无效（如 telemetry duration 超出范围） |\n| `404` | 未知徽章类型 |\n| `429` | 触发频率限制（monitor、diagnose） |\n| `502` | 上游平台不可达 |\n| `500` | 服务器内部错误 |\n";

export default function ApiDocsPage() {
  const content = API_DOCS_MD;

  const { html, toc } = parseMarkdownToHtml(content);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* 工具栏：右对齐的复制按钮 */}
        <div className="flex justify-end mb-6">
          <CopyAllButton text={content} />
        </div>

        {/* 顶部 Base URL 信息卡片 */}
        <div className="mb-10 p-6 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-zinc-950/40 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">服务基础地址 (Base URL)</h2>
                <p className="text-xs text-zinc-500 mt-1">全局统一的监控接口入口，所有接口均允许跨域请求且免鉴权。</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-zinc-700/50 select-all font-mono text-xs text-indigo-400 shadow-sm">
              <span>https://themedist-monitor.vercel.app</span>
            </div>
          </div>
        </div>

        {/* 双栏布局 */}
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* 目录侧边栏 (桌面端粘性悬浮) */}
          <aside className="w-full lg:w-64 shrink-0 order-first lg:order-last">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900/40 via-zinc-900/20 to-zinc-950/30 backdrop-blur-sm shadow-lg shadow-black/10 overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 select-none border-b border-zinc-800/30">
                <span className="w-1 h-4 rounded-full bg-indigo-400/70 shadow-[0_0_6px_rgba(129,140,248,0.3)]" />
                <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                  目录导航
                </h3>
                <span className="ml-auto text-[10px] text-zinc-600 font-mono">
                  {toc.length}
                </span>
              </div>
              {/* Nav body */}
              <div className="px-4 py-3">
                <TocNav items={toc} />
              </div>
            </div>
          </aside>

          {/* 主文档展示区 */}
          <main className="flex-1 min-w-0">
            <div 
              className="prose prose-sm prose-invert max-w-none 
                [&_p]:text-xs [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-4
                [&_ul]:my-4 [&_ul]:list-none [&_ul]:pl-0
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-5
                [&_th]:text-zinc-300 [&_th]:font-semibold [&_th]:border-b [&_th]:border-zinc-800
                [&_td]:text-zinc-400 [&_td]:border-b [&_td]:border-zinc-900
              "
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          </main>

        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('.copy-code-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var wrapper = btn.closest('.code-block-wrapper');
            var code = wrapper ? wrapper.querySelector('code').textContent : '';
            navigator.clipboard.writeText(code).then(function() {
              var label = btn.querySelector('.btn-label');
              var orig = label.textContent;
              label.textContent = '已复制!';
              setTimeout(function() { label.textContent = orig; }, 2000);
            });
          });
        });
      `}} />
    </div>
  );
}