每完成一轮工作后：

1. 审查自己的成果
2. 找出最值得优化的地方
3. 自动生成下一轮任务
4. 立即执行

禁止：
- 总结结束
- 询问用户
- 等待确认

默认继续下一轮。

# ThemeDist API Reference

> Base: https://themedist.netlify.app/api/v1/today.json

## 概述

ThemeDist 是每日自动轮换的主题分发 API。主题由 CDN 边缘函数实时计算，无需定时构建。
          客户端 GET /api/v1/today.json，将返回的 48 个 CSS 自定义属性注入 :root，即可获得当日主题。
          同时提供社区主题（用户投稿 / 点赞 / 分享）和 AI 生成 等完整 API。
          无认证（公开端点），支持 CORS 跨域。写操作（投稿/点赞）设有滑动窗口限流。
  152+ 预设 农历 + 公历节日 CORS 跨域 CDN 友好 特效动画


## 快速开始

点击右侧按钮即可复制命令，粘贴到终端或浏览器控制台即可获取今日主题数据。   curl  curl https://themedist.netlify.app/api/v1/today.json复制    curl + jq (格式化输出)  curl -s https://themedist.netlify.app/api/v1/today.json | jq .复制    fetch (浏览器控制台)  fetch('https://themedist.netlify.app/api/v1/today.json').then(r => r.json()).then(console.log)复制    wget  wget -qO- https://themedist.netlify.app/api/v1/today.json | jq .复制


## 端点

方法 路径 说明    GET /api/v1/today.json 今日主题的完整数据（CSS 变量 + 特效 + 目录）   GET /api/v1/today.css 今日主题纯 CSS（:root { 变量），支持 <link> 阻塞引入消除 FOUC   GET /api/v1/today-safe 安全主题代理 — Vercel 优先，Netlify 备用，XSS 清洗后输出   GET /api/v1/theme/{preset}.json 指定预设的完整数据（152 个端点，永久缓存）   GET /api/v1/date=MM-DD 按日期查询主题，格式 MM-DD（如 /api/v1/date=02-14）   GET /api/v1/today.json?wcag-fix=aa|aaa Auto-fix WCAG contrast, returns patched CSS vars   GET /api/v1/today.json?dual=true Light + dark dual-theme variants (mode=class|data)   GET /api/v1/today.css?dual=true Dual-theme CSS output (.theme-light / .theme-dark)   GET /api/v1/events Smart polling — theme change detection + nextPoll interval  COMMUNITY 社区主题  GET /api/v1/diy/themes.json 社区主题列表（分页 + 排序 + 标签筛选）   GET /api/v1/diy/theme.json?id= 单个社区主题详情（含点赞数）   POST /api/v1/diy/submit.json 提交社区主题（进入审核队列）   POST /api/v1/diy/suggest-tags.json 分析主题 JSON，8 维度多信号加权评分，推荐 19 类标签   POST /api/v1/diy/like.json 点赞社区主题（IP+UA 去重）   POST /api/v1/diy/fork.json Fork an existing theme with overrides  AI 生成  POST /api/v1/ai/generate.json AI 主题生成（规则引擎，或客户端 DeepSeek 直调）  高级功能 (NEW)  GET /api/v1/tokens.json W3C DTCG 设计令牌导出（color / typography / space / effects 层级结构）   GET /api/v1/today/favicon.svg 动态 Favicon（主色圆角矩形 + Logo 首字母）   GET /api/v1/today/fonts.css 自动字体注入（提取主题字体 → Google Fonts @import）   GET /api/v1/search/color.json?hex=&limit= 颜色相似度搜索（RGB 欧几里得距离排序）   GET /api/v1/recommend/{preset}.json 智能推荐引擎（Jaccard 标签 + 颜色距离加权）   GET /api/v1/trending.json 趋势排行榜（热度 = 点赞×10 + 使用量×1）   GET /api/v1/badge/{username}.svg GitHub 动态徽章（shields.io 风格作者统计）   POST /api/v1/ai/describe.json AI 逆向描述（分析 CSS 变量→中文风格描述）   POST /api/v1/telemetry/hit 匿名遥测上报（HyperLogLog 独立域名 + 主题使用计数）   POST /api/v1/pool/create.json 创建自定义轮换池   GET /api/v1/pool/{poolId}.json 自定义轮换池每日轮换查询  主题诊断与导出 (NEW)  GET /api/v1/theme/{id}/wcag.json WCAG 无障碍诊断（对比度评估、合规性检查）   GET /api/v1/theme/{id}/wcag-fix.json?level=aa|aaa Auto-fix contrast + APCA evaluation   GET /api/v1/theme/{id}/scale.json Tailwind 风格色阶生成（50~950，含 primary/secondary/accent/bg）   GET /api/v1/theme/{id}/export/shadcn.css Shadcn UI 适配器（HSL 变量 + 前景色自动推断）   POST /api/v1/extract-theme.json 图片取色（K-means 聚类 + UI 语义映射，零原生依赖）   GET /api/v1/theme/{id}/shiki.json Shiki / VS Code 代码高亮主题（TextMate Token 颜色映射）   GET /api/v1/today/pattern.css 动态 SVG 背景纹理（主题色几何图案，可作 CSS background-image）   GET /api/v1/today/weather.js 天气粒子渲染脚本（云/雨/雪/太阳/闪电），<script src> 引入即可自动渲染  展厅  PAGE /lab 全场景 API 展厅 — 5 大模块联动演示天气/纹理/高亮/缓动/WCAG  环境感知  GET /api/v1/weather-theme.json 天气自适应主题（基于 IP 经纬度 + Open-Meteo 免费天气 API）   GET /api/v1/status-override.json?status= 系统状态覆盖主题（maintenance / mourning / incident）  Admin  POST /api/v1/admin/moderate.json Rule-based content moderation (epilepsy, security, performance)   GET/POST /api/v1/admin/api-keys.json API key CRUD (create/revoke/list, tiered rate limits)  便捷工具  GET /api/v1/tailwind-config.json Tailwind CSS 配置片段生成（含 RGB 通道 + <alpha-value>）   GET /api/v1/today/palette.svg 今日主题调色盘 SVG 徽章（可嵌入 README / 博客 Footer）   GET /api/v1/theme/random.json 随机主题（支持 ?pool=static|community|all 和 ?seed=N）   GET /api/v1/theme/{id}/og.svg OG 社交分享卡片（1200×630 SVG，含主题色板与名称）


## 查询参数

参数 适用于 说明    ?tz= today.jsontoday.css 指定时区计算"今天"的日期。如 ?tz=America/New_York、?tz=Asia/Shanghai。无效时区自动回退到服务器时间。   ?overrides= today.jsontoday.css 微调 CSS 变量值。格式：--key:val;--key2:val2。如 ?overrides=--radii:0px;--font-body:monospace。最多 20 对，自动 XSS 清洗。   ?wcag-fix=aa|aaa today.jsontoday.css Auto-adjusts foreground color lightness to meet WCAG contrast requirements. Beauty-safe: adjustments capped at ±25% lightness. Generates --color-*-contrasted fallback vars when cap is insufficient.   ?dual=true&mode=class|data today.jsontoday.css Returns both light and dark theme variants. mode=class outputs .theme-light/.theme-dark CSS classes. mode=data outputs [data-theme="light"]/[data-theme="dark"] attribute selectors.   ?locale=hi-IN|ja-JP|en-US|pt-BR today.jsontoday.css Locale-aware holiday theme selection. Checks locale-specific holidays before global ones. Supports Indian (Diwali, Holi), Japanese (Setsubun, Obon), US (Thanksgiving, July 4th), and Brazilian (Carnival, Dia dos Namorados) holidays.


## 响应结构 /api/v1/today.json

字段 类型 说明   datestringISO 日期 YYYY-MM-DD（UTC 时区） generatedAtstringISO 8601 生成时间戳 presetstring预设标识符 (kebab-case) presetNamestring人类可读名称 cssVarsobject48 个 CSS 自定义属性键值对（6 组：Colors / Typography / Spacing / Effects / Ambient / Z-Index）。颜色和氛围变量自动附带 -rgb 通道变体 customCssstring | null主题专属 CSS（动画 keyframes、特效样式）。无自定义 CSS 时为 null extensionsarray | null声明式装饰元素数组，支持 floating 和 decorative 两种类型。无扩展时为 null。最多 20 个。 clickEffectobject | null声明式点击特效配置，包含 spawn 数组。无特效时为 null。详见 ClickEffect 参考 logoTextstring | null主题 Logo 文字标识 logoColorsarray | nullLogo 渐变色 hex 字符串数组。无 Logo 颜色时为 null availablenumber可用主题总数 directoryarray轻量索引 [{preset, name, primary, accent, logoText{'}\}'}] dailyIsCommunitybooleantrue 表示今日主题来自社区投稿 apiVersionstringAPI 版本号，当前为 "v1" layerContextobject图层元数据，供客户端（天气脚本等）智能决策渲染策略。详见下方说明

/api/v1/theme/{preset}.json、/api/v1/theme/random.json、/api/v1/date=MM-DD 结构一致，均包含 layerContext 图层元数据。区别：不含 date、generatedAt、available、directory、dailyIsCommunity。 示例响应  正在获取实时 API 数据... {
  "date": "2026-05-31",
  "generatedAt": "2026-05-31T07: 18: 15.014Z",
  "preset": "holiday-151",
  "presetName": "GRAIN BUDS",
  "cssVars": {
    "--color-primary": "#228b22",
    "--color-secondary": "#ffd700",
    "--color-accent": "#32cd32",
    "--color-bg": "#051002",
    "--color-surface": "#141f11",
    "--color-text": "#f0fff0",
    "--color-text-muted": "#98fb98",
    "--color-border": "rgba(50,205,50,0.18)",
    "--font-heading": "'Inter', system-ui, sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', monospace",
    "--text-base": "clamp(1rem, 0.9rem + 0.5vw, 1.125rem)",
    "--text-lg": "calc(var(--text-base) * 1.25)",
    "--text-xl": "calc(var(--text-lg) * 1.25)",
    "--text-2xl": "calc(var(--text-xl) * 1.25)",
    "--text-sm": "calc(var(--text-base) / 1.25)",
    "--space-unit": "0.25rem",
    "--space-1": "calc(0.25rem * 1)",
    "--space-2": "calc(0.25rem * 2)",
    "--space-3": "calc(0.25rem * 3)",
    "--space-4": "calc(0.25rem * 4)",
    "--space-6": "calc(0.25rem * 6)",
    "--space-8": "calc(0.25rem * 8)",
    "--space-12": "calc(0.25rem * 12)",
    "--radii": "0.75rem",
    "--content-max": "72rem",
    "--shadow-sm": "0 1px 2px rgba(0,0,0,0.08)",
    "--shadow-md": "0 4px 12px rgba(0,0,0,0.12)",
    "--shadow-lg": "0 12px 32px rgba(0,0,0,0.18)",
    "--glass-bg": "color-mix(in srgb, var(--color-bg) 85%, transparent)",
    "--glass-blur": "blur(16px)",
    "--noise-opacity": "0",
    "--color-gradient-primary": "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
    "--color-gradient-accent": "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    "--color-gradient-bg": "linear-gradient(180deg, var(--color-bg), var(--color-surface))",
    "--color-gradient-ambient": "radial-gradient(ellipse at 30% 50%, var(--ambient-1), transparent 70%)",
    "--td-z-base": "-10",
    "--td-z-float": "10",
    "--td-z-weather": "20",
    "--td-z-fx": "9999",
    "--ambient-1": "rgba(50, 205, 50, 0.2)",
    "--ambient-2": "rgba(255, 215, 0, 0.1)",
    "--color-primary-rgb": "34, 139, 34",
    "--color-secondary-rgb": "255, 215, 0",
    "--color-accent-rgb": "50, 205, 50",
    "--color-bg-rgb": "5, 16, 2",
    "--color-surface-rgb": "20, 31, 17",
    "--color-text-rgb": "240, 255, 240",
    "--color-text-muted-rgb": "152, 251, 152",
    "--color-border-rgb": "50, 205, 50",
    "--ambient-1-rgb": "50, 205, 50",
    "--ambient-2-rgb": "255, 215, 0"
  },
  "customCss": "\n                    @keyframes wheatSway { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }\n                ",
  "extensions": [
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "15%",
      "fontSize": "60px",
      "opacity": 0.3,
      "animation": "wheatSway 4s infinite"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "25%",
      "fontSize": "50px",
      "opacity": 0.25,
      "animation": "wheatSway 3.5s infinite 0.5s"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "70%",
      "fontSize": "55px",
      "opacity": 0.28,
      "animation": "wheatSway 4.2s infinite 1s"
    },
    {
      "type": "floating",
      "char": "☀️",
      "top": "20%",
      "right": "15%",
      "fontSize": "40px",
      "opacity": 0.2
    },
    {
      "type": "floating",
      "char": "🍒",
      "bottom": "15%",
      "right": "15%",
      "fontSize": "45px",
      "opacity": 0.2
    }
  ],
  "clickEffect": null,
  "logoText": "GRAIN BUDS",
  "logoColors": [
    "#98fb98",
    "#32cd32",
    "#ffd700",
    "#ffffff"
  ],
  "available": 152,
  "directory": [
    {
      "preset": "yozakura-reverie",
      "name": "🌸 Yozakura",
      "primary": "#ff8fa3",
      "accent": "#ff8fa3",
      "logoText": "YOZAKURA"
    },
    {
      "preset": "arknights-babel-epic",
      "name": "ARKNIGHTS",
      "primary": "#2c3540",
      "accent": "#b34747",
      "logoText": "ARKNIGHTS"
    },
    {
      "preset": "crimson-abyss",
      "name": "🩸 Crimson Abyss",
      "primary": "#ff2a4b",
      "accent": "#ff2a4b",
      "logoText": "CRIMSON"
    },
    {
      "preset": "abyss",
      "name": "🌊 DEEPSEA",
      "primary": "#005c97",
      "accent": "#00f2fe",
      "logoText": "OMNI-ABYSS"
    },
    {
      "preset": "hyperspace-cinema",
      "name": "🚀 HYPERSPACE",
      "primary": "#00ffff",
      "accent": "#00ffff",
      "logoText": "WARP. OS"
    },
    {
      "preset": "retro-mirage",
      "name": "🌇 Retro-Matrix",
      "primary": "#ff2a85",
      "accent": "#ff2a85",
      "logoText": "RETRO::MATRIX"
    },
    {
      "preset": "cosmos-pro",
      "name": "🌌 幽邃深空",
      "primary": "#3b0764",
      "accent": "#c084fc",
      "logoText": "OMNI-COSMOS"
    },
    {
      "preset": "aurora-ethereal-pro",
      "name": "✨ 幻空",
      "primary": "#06b6d4",
      "accent": "#10b981",
      "logoText": "AURORA"
    },
    {
      "preset": "flare",
      "name": "🔥 日珥爆发",
      "primary": "#991b1b",
      "accent": "#f97316",
      "logoText": "OMNI-FLARE"
    },
    {
      "preset": "onyx-gold",
      "name": "✦ ONYX",
      "primary": "#0f0e0d",
      "accent": "#d4af37",
      "logoText": "ONYX·GOLD"
    },
    {
      "preset": "holiday-01-01",
      "name": "NEW YEAR'S DAY (01-01)",
      "primary": "#800080",
      "accent": "#ff0000",
      "logoText": "NEW YEAR'S DAY"
    },
    {
      "preset": "holiday-02-14",
      "name": "OMNI-ROMANCE (02-14)",
      "primary": "#e11d48",
      "accent": "#ff1453",
      "logoText": "OMNI-ROMANCE"
    },
    {
      "preset": "holiday-03-14",
      "name": "MATRIX 3.1415 (03-14)",
      "primary": "#4285F4",
      "accent": "#4285f4",
      "logoText": "MATRIX 3.1415"
    },
    {
      "preset": "holiday-03-17",
      "name": "LUCKY MATRIX (03-17)",
      "primary": "#006400",
      "accent": "#32cd32",
      "logoText": "LUCKY MATRIX"
    },
    {
      "preset": "holiday-04-01",
      "name": "what is the real (04-01)",
      "primary": "#00ffff",
      "accent": "#ff00ff",
      "logoText": "what is the real"
    },
    {
      "preset": "holiday-l01-02",
      "name": "CAISHEN DAY (L01-02)",
      "primary": "#ff8c00",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAY"
    },
    {
      "preset": "holiday-l01-05",
      "name": "CAISHEN DAO (L01-05)",
      "primary": "#b22222",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAO"
    },
    {
      "preset": "holiday-l01-15",
      "name": "RAIN WATER (L01-15)",
      "primary": "#4682b4",
      "accent": "#87ceeb",
      "logoText": "RAIN WATER"
    },
    {
      "preset": "holiday-l02-02",
      "name": "DRAGON RISES (L02-02)",
      "primary": "#00008b",
      "accent": "#00bfff",
      "logoText": "DRAGON RISES"
    },
    {
      "preset": "holiday-l03-03",
      "name": "SHANGSI FESTIVAL (L03-03)",
      "primary": "#22c55e",
      "accent": "#86efac",
      "logoText": "SHANGSI FESTIVAL"
    },
    {
      "preset": "community-N85Qm9Ao",
      "name": "🖥️ PRTS // Pharmacore System Override",
      "primary": "#a2f0ff",
      "accent": "#ff9e00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-ylRQOSdL",
      "name": "🖥️ PRTS // Core Neural Override",
      "primary": "#00f3ff",
      "accent": "#ff8c00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-KbdfatXI",
      "name": "🖥️ PRTS // ADACCH Override",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-E73wwiml",
      "name": "🖥️ PRTS System Interface",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-8dhvCpZo",
      "name": "⚡ Circuit Dream · 电路梦境",
      "primary": "#e930ff",
      "accent": "#e930ff",
      "logoText": null,
      "community": true
    }
  ],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "layerContext": {
    "hasBackgroundOverlay": false,
    "hasInteractiveElements": false,
    "particleDensity": "medium",
    "safeWeatherZIndex": "var(--td-z-weather, 20)"
  }
}复制   CSS 变量参考 所有变量均通过 cssVars 对象返回，直接在 CSS 中 var(--xxx) 引用。    变量 用途   COLORS 色板 --color-primary / --color-secondary / --color-accent主色 / 辅色 / 强调色 --color-bg / --color-surface页面背景 / 卡片面板背景 --color-text / --color-text-muted / --color-border正文 / 弱化文字 / 边框（带 alpha） TYPOGRAPHY 排版 --font-heading / --font-body / --font-mono标题 / 正文 / 等宽字体栈 --text-base / --text-lg / --text-xl / --text-2xl / --text-smModular Scale 字号（base 使用 clamp 流式） SPACING 间距 --space-unit / --space-1~124px 基准间距，7 级阶梯 (4~48px) --radii / --content-max统一圆角 (0.75rem) / 内容最大宽度 (72rem) EFFECTS 效果 --shadow-sm / --shadow-md / --shadow-lg三级阴影 --glass-bg / --glass-blur / --noise-opacity毛玻璃背景 / 模糊量 / 噪点纹理 AMBIENT 氛围 --ambient-1 / --ambient-2氛围光球 rgba 颜色 Z-INDEX 层级契约 --td-z-base底层环境 (-10)：极光、全屏星空等背景层 --td-z-float悬浮层 (10)：飘落的 Emoji、装饰粒子 --td-z-weather天气层 (20)：官方天气脚本的确定插入层级 --td-z-fx瞬时特效层 (9999)：点击涟漪、爆炸粒子     Extensions 扩展元素   extensions 是一个声明式装饰元素数组，每个元素描述一个无需执行脚本即可渲染的视觉组件。
          系统支持两种类型，不支持 JavaScript（安全原因，提交时如果类型不匹配会被自动移除并返回警告）。
 类型 1: floating — 浮动字符 通过 document.createElement('div') 安全创建，绝无 innerHTML。适合 emoji 装饰。    字段 必填 限制 说明   type是"floating"固定值 char是≤ 4 个 Unicode 码点显示字符（emoji / 文字），控制字符自动剔除 top / left / right / bottom否CSS 尺寸 128 字定位，须为合法 CSS 值 (px/%/em/rem/vh/vw) fontSize否CSS 尺寸字号 opacity否0.0 ~ 1.0透明度，自动 clamp 到 [0, 1] animation否CSS animation 128 字如 "swing 4s ease-in-out infinite"，XSS 清洗（去除 expression/javascript:） zIndex否-1 ~ 99999层级。输出时自动映射到合约范围：>100→9999(fx)，<0→-10(base)，0-100 保留原值    // 示例
      { "type": "floating", "char": "🪷", "top": "20%", "left": "5%", "fontSize": "30px", "opacity": 0.3, "animation": "swing 4s ease-in-out infinite" } 类型 2: decorative — 装饰 HTML 使用 <template> + DocumentFragment 安全解析，渲染前剥离 on* 事件。适合复杂粒子层、叠层、氛围元素。    字段 必填 说明   type是固定值 "decorative" html是HTML 片段字符串。提交时自动清洗：剥离 <script>、<iframe>、on* 事件处理器、javascript: 协议。系统自动分析其中 CSS 类名以避免与自动生成粒子重复。    // 示例 — 粒子层 + 氛围叠层
      { "type": "decorative", "html": "<div class=\"noise-overlay\"></div><div class=\"particle-layer\"><span class=\"sparkle\" style=\"left:12vw;animation-delay:-3s\"></span></div>" }  ⚠ 不支持 JavaScript 类型  "type": "javascript" 不安全且不被支持。提交时会被静默移除，API 响应中的 warnings 数组会提示被移除的类型。
            请将 JS 逻辑转换为 "decorative" HTML 片段 + customCss 中的 CSS 动画。
            详见下方「字段限制」表。
  类型 3: sound — Web Audio 合成 Declarative Web Audio API synthesis — no external audio files needed.    字段 类型 说明   type"sound"Required trigger"click" | "hover" | "ambient"When to play synth.waveform"sine" | "square" | "sawtooth" | "triangle"Oscillator type synth.frequencynumber (20-20000)Hz synth.durationnumber (50-5000)ms synth.volumenumber (0-1)Loudness synth.attacknumberms envelope attack synth.releasenumberms envelope release synth.filter{ type, cutoff }Optional lowpass/highpass filter      字段限制与约束    字段 限制 超限行为   name≤ 100 字符截断；HTML 标签剥离 author≤ 50 字符截断；HTML 标签剥离 cssVars必须含 --color-primary + --color-bg；键自动补齐 -- 前缀缺少必填键 → 400 错误 customCss≤ 16 KB截断；@import、url(http)、expression()、javascript: 剥离 extensions≤ 20 个；只支持 floating + decorative超量截断；不支持的类型静默移除 → 见 API 响应的 warnings tags≤ 5 个截断    特殊说明   所有主题端点的 customCss、extensions 字段始终存在（字符串/数组），不会缺失。无内容时为空字符串 "" 或空数组 []。 社区主题通过 /api/v1/theme/community-*.json 访问时，logoText / logoColors 为 null（社区主题无 Logo）。/api/v1/diy/theme.json 端点不含这些字段，而是返回 id、author、likes、status、tags 等社区特有字段。 使用 ?overrides= 查询参数时，today.json 响应的 cssVars 已合并覆盖值，并额外返回 appliedOverrides: true 标记。 CSS 变量自动归一化：提交时所有键自动补齐 -- 前缀，可防止 AI 生成未前缀化的键名。 customCss 中的动画类会被自动解析并生成对应 DOM 粒子元素（系统根据类名启发式决定数量：particle/dot/orb/bubble/spark/star → 20，float/drift/sway → 12，rain/snow/fall → 30，其他 → 8）。如已在 extensions 中手动声明该类元素，系统自动跳过以避免重复。 速率限制：GET 端点无限制（有 CDN 缓存）。写操作：投稿 3次/分钟，点赞 10次/分钟，超限返回 429。   ClickEffect 点击特效   clickEffect 是一个声明式点击特效配置对象。主题通过 spawn 数组声明点击时创建哪些 DOM 元素，由 Layout.astro 中的通用 JS 引擎安全执行（无 eval，无 innerHTML）。
          社区主题设计师只需在 customCss 中定义动画，然后通过 clickEffect 声明元素即可——无需修改 Layout.astro。
 字段说明     字段类型必填说明    classNamestring是CSS 类名，需在 customCss 中定义对应动画。仅允许 /^[a-zA-Z][\w-]*$/ durationnumber是元素自动移除时间（ms），范围 100–5000 countnumber否生成数量，默认 1，最大 20。>1 时元素按圆周均匀分布 angleSpreadnumber否扩散角度（deg），360 表示均匀圆周扩散，默认 0 offsetXnumber否距点击点 X 方向偏移（px） offsetYnumber否距点击点 Y 方向偏移（px） stylestring否额外内联样式（经过净化，≤256 字符）    示例 {
  "clickEffect": {
    "spawn": [
      { "className": "my-ripple", "duration": 800 },
      { "className": "my-spark", "count": 4, "angleSpread": 360, "offsetX": 6, "duration": 700 },
      { "className": "my-ring", "duration": 1000 }
    ]
  }
}复制 对应的 customCss 中需定义 .my-ripple、.my-spark、.my-ring 及其 @keyframes 动画，元素使用 position:fixed 定位。 安全约束  社区主题的 clickEffect 经过 sanitizeClickEffect() 净化：className 仅允许字母开头的合法 CSS 类名，duration 限制 100–5000ms，style 剥离危险字符。 spawn 数组最多 10 个条目，count 最多 20。 渲染引擎使用 document.createElement + style.cssText，不使用 innerHTML，杜绝 XSS。   RGB 通道变量 & Tailwind 集成  
所有以 --color- 开头的 CSS 变量均自动附带 -rgb 通道变体（如 --color-primary-rgb: 66, 133, 244），
          支持在 Tailwind CSS 中使用不透明度修饰符。
 Tailwind v3 配置示例 // tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
      },
      borderRadius: {
        theme: "var(--radii)",
      },
    },
  },
};复制 Tailwind v4 配置示例 /* app.css */
@import "tailwindcss";

@theme {
  --color-primary: rgb(var(--color-primary-rgb) / <alpha-value>);
  --color-secondary: rgb(var(--color-secondary-rgb) / <alpha-value>);
  --color-background: var(--color-bg);
  --color-surface: var(--color-surface);
}复制  一键获取 Tailwind 配置 curl https://themedist.netlify.app/api/v1/tailwind-config.json复制    SDK / Web Component  
ThemeDist 提供官方轻量化 Web Component <themedist-runner>，将 CSS 变量注入全局 :root，
          并将装饰元素和自定义 CSS 隔离在 Shadow DOM 中。通过 isolation: isolate 创建完全封闭的层叠上下文，
          主题内部的 z-index 绝不会逃逸干扰宿主页面。内置 localStorage 缓存和网络降级。
 快速接入 <!-- 一行标签，自动完成 CSS 变量注入 + 装饰渲染 + 缓存降级 -->
<themedist-runner api="https://themedist.netlify.app/api/v1/today.json" save-shadow="true"></themedist-runner>
<script src="https://themedist.netlify.app/sdk.js" defer></script>复制 属性    属性 默认值 说明   api/api/v1/today.json主题 API 端点 URL save-shadowtrue是否启用 Shadow DOM 隔离     安全设计  CSS 变量：注入到全局 :root，确保全站样式生效。 装饰元素 + 自定义 CSS：隔离在 Shadow DOM 中，customCss 不再注入 document.head，彻底防止样式污染宿主页面。 层叠隔离：:host 使用 isolation: isolate + --td-z-base 合约变量，主题内部 z-index 绝不逃逸。 交互穿透：:host 强制 pointer-events: none，所有装饰元素不可阻挡宿主 UI 点击。 缓存降级：同日访问零网络开销，fetch 失败时自动使用过期缓存。
  SDK v3.0 Features    Feature API Description   User PinThemeDistRunner.setPin('preset-id')Lock visitor to a specific theme Theme ModeThemeDistRunner.setMode('dark')Manual light/dark toggle ('light'|'dark'|'auto') Live Polling<themedist-runner live>Auto-detect theme changes via smart polling SoundExtensions with type: 'sound'Web Audio synthesis, respects reduced-motion      轮换策略    # 来源 说明   1🌙 农历节日20+ 个中国传统节日（春节/元宵/端午/七夕/中秋等），每个有专属特效主题 2📅 公历节日元旦/情人节/Pi Day/圣帕特里克节/愚人节等 3🍗 Crazy Thu每周四特殊覆盖 4👥 社区池用户投稿主题每 3 天轮入一次（约 30% 天数），固定频率不受投稿量影响 5🎲 DailyPool152 预设按 dayOfYear % poolLength 轮换，全年无空档     缓存策略    端点 浏览器 CDN   /api/v1/today.json1 小时24 小时 (stale-while-revalidate) /api/v1/today.css1 小时24 小时 /api/v1/theme/*.json（预设）24 小时365 天 (immutable) /api/v1/theme/*/wcag.json1 小时— /api/v1/theme/*/scale.json365 天365 天 (immutable) /api/v1/weather-theme.json30 分钟— /api/v1/today/weather.js1 小时24 小时 /api/v1/diy/themes.json1 分钟— /api/v1/diy/theme.json5 分钟— POST /api/v1/diy/*不缓存— POST /api/v1/extract-theme.json不缓存— POST /api/v1/telemetry/hit不缓存— /api/v1/admin/*不缓存—    推荐客户端策略 
fetch → 解析 date → 存入 localStorage → 同日访问跳过网络请求 → 每人每天最多 1 次请求。
            Service Worker 可预缓存全部 152 个 /api/v1/theme/*.json（总计 ~500KB）。
    安全主题代理 /api/v1/today-safe  
从 ThemeDist 代理获取最新的 /api/v1/today.json 数据（Vercel 优先，Netlify 备用），并应用 XSS 清洗。
          下游主题渲染器可直接安全消费，无需自行处理输入净化。
  curl curl https://themedist-monitor.vercel.app/api/v1/today-safe复制   响应结构    字段 类型 说明   datestringISO 日期 YYYY-MM-DD generatedAtstringISO 8601 生成时间戳 presetstring主题预设标识符 presetNamestring主题可读名称 cssVarsobjectCSS 自定义属性键值对（已完成 XSS 清洗） customCssstring | null主题专属 CSS（已完成 XSS 清洗） extensionsarray | nullHTML 装饰片段数组（已完成 XSS 清洗） clickEffectobject | null点击特效配置 logoTextstring | null主题 Logo 文字 logoColorsarray | nullLogo 渐变色 availablenumber可用主题总数 directoryarray主题目录列表 dailyIsCommunityboolean今日主题是否来自社区 apiVersionstringAPI 版本号 apiVersionstringAPI 版本号 layerContextobject图层元数据，供客户端智能决策渲染策略 _metaobject安全元信息：sanitized（是否已清洗）、schemaValid（结构校验）、timestamp（处理时间）    示例响应 {
  "date": "2026-05-27",
  "generatedAt": "2026-05-27T08:39:34.536Z",
  "preset": "aurora-ethereal-pro",
  "presetName": "✨ 幻空",
  "cssVars": { "--color-primary": "#06b6d4", "--color-bg": "#000106", "..." },
  "customCss": "...",
  "extensions": [ ... ],
  "clickEffect": null,
  "logoText": "AURORA",
  "logoColors": ["#6ee7b7", "#06b6d4", "#a855f7", "#6ee7b7"],
  "available": 152,
  "directory": [ ... ],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "_meta": {
    "sanitized": true,
    "schemaValid": true,
    "timestamp": "2026-05-27T09:57:48.808Z"
  }
}复制 异常处理    状态 场景   200成功代理并清洗数据 502Vercel 和 Netlify 两个上游平台均不可达     XSS 清洗说明 
代理返回前对所有字符串字段执行 XSS 清洗，移除 HTML 标签、事件处理器（onerror、onload 等）、
javascript: 协议和 CSS expression()。清洗后的数据可直接注入 DOM，无需额外净化。
_meta.sanitized 标识清洗状态，_meta.schemaValid 标识结构校验结果。
   主题诊断与导出 WCAG 无障碍诊断  评估主题的颜色对比度是否符合 WCAG 2.1 无障碍标准。检查正文、主色、辅色在背景上的可读性。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/wcag.json复制  返回每条颜色组合的对比度数值及 AA/AAA 级别通过情况，含 compliant 总览标记和 warnings 修复建议。  色阶生成  基于主题主色/辅色/强调色/背景色，通过黑白色插值法生成完整的 Tailwind 风格 50~950 色阶。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/scale.json复制  返回 scales.primary、scales.secondary、scales.accent、scales.background 四组色阶，每组含 50/100/200/300/400/500/600/700/800/900/950 共 11 级。  Shadcn UI 适配器  将主题 CSS 变量转换为 Shadcn UI 所需的 HSL 通道变量体系（--background、--primary、--foreground 等），前景色自动根据背景亮度推断。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/export/shadcn.css复制  返回完整 CSS（@layer base { :root {'}'}），可直接复制到 Shadcn UI 项目的 globals.css 中使用。365 天 CDN 缓存。  图片取色 API  
传入图片 URL，服务端下载后用纯 JavaScript 解码（jpeg-js / pngjs，零原生依赖），
          K-means 聚类提取 Top 5 主色调，再通过色彩语义引擎映射为标准 UI 变量（背景两极化、主色对比度筛选、正文自动适配）。
  curl curl -X POST https://themedist.netlify.app/api/v1/extract-theme.json \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://example.com/poster.jpg"}'复制   限制：仅支持 JPEG/PNG，最大 5MB，抓取超时 5s。 返回：sourcePalette（提取的 5 个 hex）、isDark（暗色/亮色标记）、
cssVars（46 个标准 CSS 变量，含 Z-Index 层级契约与 -rgb 通道变体）、customCss（自动生成的渐变背景）。
  代码高亮主题 (Shiki)  
将主题的 CSS 变量映射为 Shiki / VS Code 的 TextMate Token 颜色，可直接作为代码高亮主题使用。
  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/shiki.json复制   动态 SVG 背景纹理  
根据今日主题色实时生成几何图案 SVG，转为 data URI 嵌入 CSS，可直接作为 <link> 或 background-image 使用。
  curl curl https://themedist.netlify.app/api/v1/today/pattern.css复制   全场景 API 展厅  
一个页面同时展示 5 个高级 API 的联动能力：天气感知 → 动态纹理 → 代码高亮 → 智能缓动 → WCAG 对比度。
          访问 /lab 查看。
  APCA Contrast (WCAG 3.0)  ThemeDist supports the APCA (Advanced Perceptual Contrast Algorithm) from the WCAG 3.0 draft. Unlike WCAG 2.1's symmetric formula, APCA uses polarity-aware asymmetric coefficients — dark text on light backgrounds and light text on dark backgrounds are evaluated differently.    Lc Range Level Use Case   |Lc| ≥ 75AAABody text |Lc| ≥ 60AABody text (minimum) |Lc| ≥ 45AA LargeLarge text / UI controls |Lc| < 45FailNot readable      环境感知 API 天气自适应主题  
嗅探式跨平台地理位置检测，自动适配 Vercel（x-vercel-ip-latitude/longitude Header）、
Netlify（locals.netlify.context.geo 或 x-nf-geo Base64 Header），
          调用免费 Open-Meteo API 获取实时天气，自动匹配对应氛围的主题。
          支持 ?lat= 和 ?lon= 查询参数覆盖 IP 检测（用于客户端 Geolocation API）。
          返回城市名（OpenStreetMap Nominatim 逆地理编码）。
  curl — IP 自动检测 curl https://themedist.netlify.app/api/v1/weather-theme.json复制   curl — 指定经纬度 curl "https://themedist.netlify.app/api/v1/weather-theme.json?lat=35.68&lon=139.76"复制  天气映射：晴天 → sunny-day / 阴天 → cloudy-grey / 雨 → rainy-mood / 雪 → snow-white / 雷暴 → thunderstorm。API 超时 3s，失败时降级为 Clear Sky + 今日主题。缓存 30 分钟。  → 在线演示页面 — 浏览器定位 + 实时天气视觉渲染
  系统状态覆盖  根据系统运行状态返回覆盖主题，用于维护页、哀悼日、故障降级等场景。  curl — 维护模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=maintenance"复制   curl — 哀悼模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=mourning"复制   curl — 故障模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=incident"复制  有效状态：maintenance（纯灰）、mourning（暗黑灰调 + grayscale 滤镜标记）、incident（红色警示）。缓存 5 分钟。   社区主题 API  获取列表 curl — 最新（分页）curl https://themedist.netlify.app/api/v1/diy/themes.json?sort=new&page=1&size=20复制 curl — 最热curl https://themedist.netlify.app/api/v1/diy/themes.json?sort=hot复制 curl — 按标签筛选curl https://themedist.netlify.app/api/v1/diy/themes.json?tag=dark复制 参数: sort=new|hot, page=1, size=20(max50), tag=dark|light|warm|cool|vibrant|minimal|nature|tech 获取单个主题 curlcurl https://themedist.netlify.app/api/v1/diy/theme.json?id=abc12345复制 提交主题 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/submit.json \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Theme","author":"You","cssVars":{"--color-primary":"#ff6b6b","--color-bg":"#1a1a2e"},"customCss":"body { ... }","extensions":[{"type":"floating","char":"✨"}],"tags":["dark","vibrant"]}'复制 必填: name, author, cssVars（必须含 --color-primary 和 --color-bg）。可选: customCss, extensions, tags（最多 5 个）。提交后进入审核队列。 成功响应 201：{ success: true, theme: { id, name, ... }, warnings?: [...], apiVersion: "v1" }。如果有 warnings 数组，说明部分字段被自动调整（如不支持的类型被移除）。 推荐标签 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/suggest-tags.json \
  -H 'Content-Type: application/json' \
  -d '{"cssVars":{"--color-primary":"#ff6b6b","--color-bg":"#1a1a2e"},"customCss":"...","extensions":[...],...}'复制 纯计算端点，无需 Redis。8 个分析器（颜色/字体/内容/结构/特效/Emoji/对比度/色调协调）加权评分，覆盖 19 种标签（dark/light/warm/cool/vibrant/minimal/nature/tech/retro/holiday/space/ocean/animated/elegant/glass/seasonal/fantasy/industrial），返回最多 5 个带置信度和中文原因的标签建议。必填: cssVars。可选: customCss, extensions, presetName。 响应 200：{ tags: [{ tag: "dark", confidence: 0.98, reason: "背景亮度仅 0.01" }, ...], apiVersion: "v1" }。 点赞 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/like.json \
  -H 'Content-Type: application/json' \
  -d '{"id":"abc12345"}'复制 服务器基于 IP + User-Agent 指纹去重，同一用户对同一主题仅计一次。返回 {likes: number, voted: boolean, apiVersion: "v1"}。   接入步骤  1. 请求 API — 页面加载时 GET /api/v1/today.json，尽早执行减少 FOUC 2. 注入 CSS 变量 — 遍历 cssVars，逐条 setProperty(k, v) 到 :root 3. 注入特效 — customCss 非 null → 创建 <style>；extensions 非 null → 安全解析声明式元素（createElement + textContent） 4. localStorage 缓存 — 存 date + cssVars + customCss，同日跳过网络请求 5. 错误降级 — fetch 失败 → 从 localStorage 恢复昨日主题 → CSS var(--xxx, fallback) 兜底   代码示例  Vanilla JavaScript（含缓存+降级+特效）  
复制
  // 完整集成示例 — 含缓存、降级、特效注入
(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const cached = JSON.parse(localStorage.getItem('td') || 'null');

  if (cached?.date === today) return applyTheme(cached);

  const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
  const t = await res.json();

  const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss, exts: t.extensions };
  localStorage.setItem('td', JSON.stringify(data));
  applyTheme(data);
})().catch(() => {
  const fallback = JSON.parse(localStorage.getItem('td') || 'null');
  if (fallback) applyTheme(fallback);
});

function applyTheme(d) {
  Object.entries(d.cssVars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
  if (d.customCss) { let s = document.createElement('style'); s.textContent = d.customCss; document.head.appendChild(s); }
  if (d.exts) { d.exts.forEach(ext => { if (ext.type==='floating') { let el = document.createElement('div'); el.style.cssText = ['position:fixed','pointer-events:none', ext.top&&'top:'+ext.top, ext.left&&'left:'+ext.left, ext.fontSize&&'font-size:'+ext.fontSize, ext.animation&&'animation:'+ext.animation, ext.opacity!=null&&'opacity:'+ext.opacity].filter(Boolean).join(';'); el.textContent = ext.char; document.body.prepend(el); } }); }
}复制 React Hook 示例 import { useState, useEffect } from 'react';

function useThemeDist() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = JSON.parse(localStorage.getItem('td') || 'null');
    if (cached?.date === today) { setTheme(cached); return; }

    fetch('https://themedist.netlify.app/api/v1/today.json')
      .then(r => r.json())
      .then(t => {
        const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss };
        localStorage.setItem('td', JSON.stringify(data));
        setTheme(data);
      })
      .catch(() => {
        const fb = JSON.parse(localStorage.getItem('td') || 'null');
        if (fb) setTheme(fb);
      });
  }, []);

  useEffect(() => {
    if (!theme) return;
    Object.entries(theme.cssVars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v));
  }, [theme]);

  return theme;
}复制 Vue 3 Composable 示例 import { ref, onMounted, watch } from 'vue';

export function useThemeDist() {
  const theme = ref(null);

  onMounted(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = JSON.parse(localStorage.getItem('td') || 'null');
    if (cached?.date === today) { theme.value = cached; return; }

    try {
      const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
      const t = await res.json();
      const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss };
      localStorage.setItem('td', JSON.stringify(data));
      theme.value = data;
    } catch {
      theme.value = JSON.parse(localStorage.getItem('td') || 'null');
    }
  });

  watch(theme, (t) => {
    if (!t) return;
    Object.entries(t.cssVars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v));
    if (t.customCss) {
      const s = document.createElement('style');
      s.textContent = t.customCss;
      document.head.appendChild(s);
    }
  });

  return theme;
}复制  常见问题   Q: 如何固定使用某个主题？ 调用 GET /api/v1/theme/{preset}.json 获取指定主题，或从 /api/v1/today.json 响应的 directory 字段中选择 preset 后调用。   Q: 每天什么时候切换主题？ 主题由 CDN 边缘函数根据 UTC 日期实时计算，UTC 0:00（北京时间 8:00）自动切换。客户端通过 date 字段判断是否已切换。   Q: 请求有速率限制吗？ GET 端点无速率限制，响应已设 CDN 缓存头（today: 24h，preset: 365d）。写操作（投稿/点赞）有滑动窗口限流：投稿 3次/分钟，点赞 10次/分钟，超限返回 429。   Q: 社区主题会过期吗？ 不会。审核通过后长期有效，可被每日轮换选中（约 30% 天数）。   Q: 可以自己部署吗？ 可以。项目开源，支持 Vercel + Netlify 双平台。需要配置 Upstash Redis 实例（社区功能）和可选的 DeepSeek API Key（AI 生成）。详见 README 部署章节。   Q: extensions 支持哪些类型？ 仅支持 "floating"（浮动 emoji/字符，createElement 安全渲染）和 "decorative"（装饰 HTML 片段，server 端清洗后 client 端 template 安全解析）。不支持 JavaScript（"type": "javascript" 会在提交时被移除并在 warnings 中报告）。最多 20 个扩展。   Q: 提交的主题有 JavaScript 扩展，为什么不生效？ "type": "javascript" 不被支持。请将其中的 DOM 创建逻辑转为 "decorative" 类型的 HTML 片段 + customCss 中的 CSS 动画。系统会自动从 customCss 中解析动画类并生成粒子元素。API 响应中的 warnings 数组会提示被移除的类型及原因。   Q: CSS 变量键名可以不带 -- 前缀吗？ 可以。提交 API 会自动补齐 -- 前缀（如 color-primary → --color-primary），防御 AI 生成时忘记前缀。    错误处理    状态 场景 处理   200正常解析 JSON，注入变量 400请求格式错误 / 缺少必填字段检查 cssVars 含 --color-primary + --color-bg 404主题 / 文件不存在检查 ID 或路径是否正确 429请求频率超限投稿 3/min，点赞 10/min；等待恢复 503数据库不可用稍后重试；GET 端点有静态降级 —网络中断catch → localStorage 降级   API 由边缘函数处理，数据库不可用时自动降级为预渲染静态文件。客户端的最终降级方案是 localStorage 缓存。   响应头    Header 值   Content-Typeapplication/json Access-Control-Allow-Origin* Cache-Controlpublic, max-age=3600, s-maxage=86400     完整响应示例（今日） 实时数据，每次刷新页面获取最新 API 返回值。 正在获取完整响应... {
  "date": "2026-05-31",
  "generatedAt": "2026-05-31T07: 18: 15.014Z",
  "preset": "holiday-151",
  "presetName": "GRAIN BUDS",
  "cssVars": {
    "--color-primary": "#228b22",
    "--color-secondary": "#ffd700",
    "--color-accent": "#32cd32",
    "--color-bg": "#051002",
    "--color-surface": "#141f11",
    "--color-text": "#f0fff0",
    "--color-text-muted": "#98fb98",
    "--color-border": "rgba(50,205,50,0.18)",
    "--font-heading": "'Inter', system-ui, sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', monospace",
    "--text-base": "clamp(1rem, 0.9rem + 0.5vw, 1.125rem)",
    "--text-lg": "calc(var(--text-base) * 1.25)",
    "--text-xl": "calc(var(--text-lg) * 1.25)",
    "--text-2xl": "calc(var(--text-xl) * 1.25)",
    "--text-sm": "calc(var(--text-base) / 1.25)",
    "--space-unit": "0.25rem",
    "--space-1": "calc(0.25rem * 1)",
    "--space-2": "calc(0.25rem * 2)",
    "--space-3": "calc(0.25rem * 3)",
    "--space-4": "calc(0.25rem * 4)",
    "--space-6": "calc(0.25rem * 6)",
    "--space-8": "calc(0.25rem * 8)",
    "--space-12": "calc(0.25rem * 12)",
    "--radii": "0.75rem",
    "--content-max": "72rem",
    "--shadow-sm": "0 1px 2px rgba(0,0,0,0.08)",
    "--shadow-md": "0 4px 12px rgba(0,0,0,0.12)",
    "--shadow-lg": "0 12px 32px rgba(0,0,0,0.18)",
    "--glass-bg": "color-mix(in srgb, var(--color-bg) 85%, transparent)",
    "--glass-blur": "blur(16px)",
    "--noise-opacity": "0",
    "--color-gradient-primary": "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
    "--color-gradient-accent": "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    "--color-gradient-bg": "linear-gradient(180deg, var(--color-bg), var(--color-surface))",
    "--color-gradient-ambient": "radial-gradient(ellipse at 30% 50%, var(--ambient-1), transparent 70%)",
    "--td-z-base": "-10",
    "--td-z-float": "10",
    "--td-z-weather": "20",
    "--td-z-fx": "9999",
    "--ambient-1": "rgba(50, 205, 50, 0.2)",
    "--ambient-2": "rgba(255, 215, 0, 0.1)",
    "--color-primary-rgb": "34, 139, 34",
    "--color-secondary-rgb": "255, 215, 0",
    "--color-accent-rgb": "50, 205, 50",
    "--color-bg-rgb": "5, 16, 2",
    "--color-surface-rgb": "20, 31, 17",
    "--color-text-rgb": "240, 255, 240",
    "--color-text-muted-rgb": "152, 251, 152",
    "--color-border-rgb": "50, 205, 50",
    "--ambient-1-rgb": "50, 205, 50",
    "--ambient-2-rgb": "255, 215, 0"
  },
  "customCss": "\n                    @keyframes wheatSway { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }\n                ",
  "extensions": [
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "15%",
      "fontSize": "60px",
      "opacity": 0.3,
      "animation": "wheatSway 4s infinite"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "25%",
      "fontSize": "50px",
      "opacity": 0.25,
      "animation": "wheatSway 3.5s infinite 0.5s"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "70%",
      "fontSize": "55px",
      "opacity": 0.28,
      "animation": "wheatSway 4.2s infinite 1s"
    },
    {
      "type": "floating",
      "char": "☀️",
      "top": "20%",
      "right": "15%",
      "fontSize": "40px",
      "opacity": 0.2
    },
    {
      "type": "floating",
      "char": "🍒",
      "bottom": "15%",
      "right": "15%",
      "fontSize": "45px",
      "opacity": 0.2
    }
  ],
  "clickEffect": null,
  "logoText": "GRAIN BUDS",
  "logoColors": [
    "#98fb98",
    "#32cd32",
    "#ffd700",
    "#ffffff"
  ],
  "available": 152,
  "directory": [
    {
      "preset": "yozakura-reverie",
      "name": "🌸 Yozakura",
      "primary": "#ff8fa3",
      "accent": "#ff8fa3",
      "logoText": "YOZAKURA"
    },
    {
      "preset": "arknights-babel-epic",
      "name": "ARKNIGHTS",
      "primary": "#2c3540",
      "accent": "#b34747",
      "logoText": "ARKNIGHTS"
    },
    {
      "preset": "crimson-abyss",
      "name": "🩸 Crimson Abyss",
      "primary": "#ff2a4b",
      "accent": "#ff2a4b",
      "logoText": "CRIMSON"
    },
    {
      "preset": "abyss",
      "name": "🌊 DEEPSEA",
      "primary": "#005c97",
      "accent": "#00f2fe",
      "logoText": "OMNI-ABYSS"
    },
    {
      "preset": "hyperspace-cinema",
      "name": "🚀 HYPERSPACE",
      "primary": "#00ffff",
      "accent": "#00ffff",
      "logoText": "WARP. OS"
    },
    {
      "preset": "retro-mirage",
      "name": "🌇 Retro-Matrix",
      "primary": "#ff2a85",
      "accent": "#ff2a85",
      "logoText": "RETRO::MATRIX"
    },
    {
      "preset": "cosmos-pro",
      "name": "🌌 幽邃深空",
      "primary": "#3b0764",
      "accent": "#c084fc",
      "logoText": "OMNI-COSMOS"
    },
    {
      "preset": "aurora-ethereal-pro",
      "name": "✨ 幻空",
      "primary": "#06b6d4",
      "accent": "#10b981",
      "logoText": "AURORA"
    },
    {
      "preset": "flare",
      "name": "🔥 日珥爆发",
      "primary": "#991b1b",
      "accent": "#f97316",
      "logoText": "OMNI-FLARE"
    },
    {
      "preset": "onyx-gold",
      "name": "✦ ONYX",
      "primary": "#0f0e0d",
      "accent": "#d4af37",
      "logoText": "ONYX·GOLD"
    },
    {
      "preset": "holiday-01-01",
      "name": "NEW YEAR'S DAY (01-01)",
      "primary": "#800080",
      "accent": "#ff0000",
      "logoText": "NEW YEAR'S DAY"
    },
    {
      "preset": "holiday-02-14",
      "name": "OMNI-ROMANCE (02-14)",
      "primary": "#e11d48",
      "accent": "#ff1453",
      "logoText": "OMNI-ROMANCE"
    },
    {
      "preset": "holiday-03-14",
      "name": "MATRIX 3.1415 (03-14)",
      "primary": "#4285F4",
      "accent": "#4285f4",
      "logoText": "MATRIX 3.1415"
    },
    {
      "preset": "holiday-03-17",
      "name": "LUCKY MATRIX (03-17)",
      "primary": "#006400",
      "accent": "#32cd32",
      "logoText": "LUCKY MATRIX"
    },
    {
      "preset": "holiday-04-01",
      "name": "what is the real (04-01)",
      "primary": "#00ffff",
      "accent": "#ff00ff",
      "logoText": "what is the real"
    },
    {
      "preset": "holiday-l01-02",
      "name": "CAISHEN DAY (L01-02)",
      "primary": "#ff8c00",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAY"
    },
    {
      "preset": "holiday-l01-05",
      "name": "CAISHEN DAO (L01-05)",
      "primary": "#b22222",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAO"
    },
    {
      "preset": "holiday-l01-15",
      "name": "RAIN WATER (L01-15)",
      "primary": "#4682b4",
      "accent": "#87ceeb",
      "logoText": "RAIN WATER"
    },
    {
      "preset": "holiday-l02-02",
      "name": "DRAGON RISES (L02-02)",
      "primary": "#00008b",
      "accent": "#00bfff",
      "logoText": "DRAGON RISES"
    },
    {
      "preset": "holiday-l03-03",
      "name": "SHANGSI FESTIVAL (L03-03)",
      "primary": "#22c55e",
      "accent": "#86efac",
      "logoText": "SHANGSI FESTIVAL"
    },
    {
      "preset": "community-N85Qm9Ao",
      "name": "🖥️ PRTS // Pharmacore System Override",
      "primary": "#a2f0ff",
      "accent": "#ff9e00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-ylRQOSdL",
      "name": "🖥️ PRTS // Core Neural Override",
      "primary": "#00f3ff",
      "accent": "#ff8c00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-KbdfatXI",
      "name": "🖥️ PRTS // ADACCH Override",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-E73wwiml",
      "name": "🖥️ PRTS System Interface",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-8dhvCpZo",
      "name": "⚡ Circuit Dream · 电路梦境",
      "primary": "#e930ff",
      "accent": "#e930ff",
      "logoText": null,
      "community": true
    }
  ],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "layerContext": {
    "hasBackgroundOverlay": false,
    "hasInteractiveElements": false,
    "particleDensity": "medium",
    "safeWeatherZIndex": "var(--td-z-weather, 20)"
  }
}复制


## CSS 变量参考

所有变量均通过 cssVars 对象返回，直接在 CSS 中 var(--xxx) 引用。

变量 用途   COLORS 色板 --color-primary / --color-secondary / --color-accent主色 / 辅色 / 强调色 --color-bg / --color-surface页面背景 / 卡片面板背景 --color-text / --color-text-muted / --color-border正文 / 弱化文字 / 边框（带 alpha） TYPOGRAPHY 排版 --font-heading / --font-body / --font-mono标题 / 正文 / 等宽字体栈 --text-base / --text-lg / --text-xl / --text-2xl / --text-smModular Scale 字号（base 使用 clamp 流式） SPACING 间距 --space-unit / --space-1~124px 基准间距，7 级阶梯 (4~48px) --radii / --content-max统一圆角 (0.75rem) / 内容最大宽度 (72rem) EFFECTS 效果 --shadow-sm / --shadow-md / --shadow-lg三级阴影 --glass-bg / --glass-blur / --noise-opacity毛玻璃背景 / 模糊量 / 噪点纹理 AMBIENT 氛围 --ambient-1 / --ambient-2氛围光球 rgba 颜色 Z-INDEX 层级契约 --td-z-base底层环境 (-10)：极光、全屏星空等背景层 --td-z-float悬浮层 (10)：飘落的 Emoji、装饰粒子 --td-z-weather天气层 (20)：官方天气脚本的确定插入层级 --td-z-fx瞬时特效层 (9999)：点击涟漪、爆炸粒子


## Extensions 扩展元素

extensions 是一个声明式装饰元素数组，每个元素描述一个无需执行脚本即可渲染的视觉组件。
          系统支持两种类型，不支持 JavaScript（安全原因，提交时如果类型不匹配会被自动移除并返回警告）。
 类型 1: floating — 浮动字符 通过 document.createElement('div') 安全创建，绝无 innerHTML。适合 emoji 装饰。    字段 必填 限制 说明   type是"floating"固定值 char是≤ 4 个 Unicode 码点显示字符（emoji / 文字），控制字符自动剔除 top / left / right / bottom否CSS 尺寸 128 字定位，须为合法 CSS 值 (px/%/em/rem/vh/vw) fontSize否CSS 尺寸字号 opacity否0.0 ~ 1.0透明度，自动 clamp 到 [0, 1] animation否CSS animation 128 字如 "swing 4s ease-in-out infinite"，XSS 清洗（去除 expression/javascript:） zIndex否-1 ~ 99999层级。输出时自动映射到合约范围：>100→9999(fx)，<0→-10(base)，0-100 保留原值    // 示例
      { "type": "floating", "char": "🪷", "top": "20%", "left": "5%", "fontSize": "30px", "opacity": 0.3, "animation": "swing 4s ease-in-out infinite" } 类型 2: decorative — 装饰 HTML 使用 <template> + DocumentFragment 安全解析，渲染前剥离 on* 事件。适合复杂粒子层、叠层、氛围元素。    字段 必填 说明   type是固定值 "decorative" html是HTML 片段字符串。提交时自动清洗：剥离 <script>、<iframe>、on* 事件处理器、javascript: 协议。系统自动分析其中 CSS 类名以避免与自动生成粒子重复。    // 示例 — 粒子层 + 氛围叠层
      { "type": "decorative", "html": "<div class=\"noise-overlay\"></div><div class=\"particle-layer\"><span class=\"sparkle\" style=\"left:12vw;animation-delay:-3s\"></span></div>" }  ⚠ 不支持 JavaScript 类型  "type": "javascript" 不安全且不被支持。提交时会被静默移除，API 响应中的 warnings 数组会提示被移除的类型。
            请将 JS 逻辑转换为 "decorative" HTML 片段 + customCss 中的 CSS 动画。
            详见下方「字段限制」表。
  类型 3: sound — Web Audio 合成 Declarative Web Audio API synthesis — no external audio files needed.    字段 类型 说明   type"sound"Required trigger"click" | "hover" | "ambient"When to play synth.waveform"sine" | "square" | "sawtooth" | "triangle"Oscillator type synth.frequencynumber (20-20000)Hz synth.durationnumber (50-5000)ms synth.volumenumber (0-1)Loudness synth.attacknumberms envelope attack synth.releasenumberms envelope release synth.filter{ type, cutoff }Optional lowpass/highpass filter


## 字段限制与约束

字段 限制 超限行为   name≤ 100 字符截断；HTML 标签剥离 author≤ 50 字符截断；HTML 标签剥离 cssVars必须含 --color-primary + --color-bg；键自动补齐 -- 前缀缺少必填键 → 400 错误 customCss≤ 16 KB截断；@import、url(http)、expression()、javascript: 剥离 extensions≤ 20 个；只支持 floating + decorative超量截断；不支持的类型静默移除 → 见 API 响应的 warnings tags≤ 5 个截断

特殊说明

所有主题端点的 customCss、extensions 字段始终存在（字符串/数组），不会缺失。无内容时为空字符串 "" 或空数组 []。 社区主题通过 /api/v1/theme/community-*.json 访问时，logoText / logoColors 为 null（社区主题无 Logo）。/api/v1/diy/theme.json 端点不含这些字段，而是返回 id、author、likes、status、tags 等社区特有字段。 使用 ?overrides= 查询参数时，today.json 响应的 cssVars 已合并覆盖值，并额外返回 appliedOverrides: true 标记。 CSS 变量自动归一化：提交时所有键自动补齐 -- 前缀，可防止 AI 生成未前缀化的键名。 customCss 中的动画类会被自动解析并生成对应 DOM 粒子元素（系统根据类名启发式决定数量：particle/dot/orb/bubble/spark/star → 20，float/drift/sway → 12，rain/snow/fall → 30，其他 → 8）。如已在 extensions 中手动声明该类元素，系统自动跳过以避免重复。 速率限制：GET 端点无限制（有 CDN 缓存）。写操作：投稿 3次/分钟，点赞 10次/分钟，超限返回 429。


## ClickEffect 点击特效

clickEffect 是一个声明式点击特效配置对象。主题通过 spawn 数组声明点击时创建哪些 DOM 元素，由 Layout.astro 中的通用 JS 引擎安全执行（无 eval，无 innerHTML）。
          社区主题设计师只需在 customCss 中定义动画，然后通过 clickEffect 声明元素即可——无需修改 Layout.astro。
 字段说明     字段类型必填说明    classNamestring是CSS 类名，需在 customCss 中定义对应动画。仅允许 /^[a-zA-Z][\w-]*$/ durationnumber是元素自动移除时间（ms），范围 100–5000 countnumber否生成数量，默认 1，最大 20。>1 时元素按圆周均匀分布 angleSpreadnumber否扩散角度（deg），360 表示均匀圆周扩散，默认 0 offsetXnumber否距点击点 X 方向偏移（px） offsetYnumber否距点击点 Y 方向偏移（px） stylestring否额外内联样式（经过净化，≤256 字符）    示例 {
  "clickEffect": {
    "spawn": [
      { "className": "my-ripple", "duration": 800 },
      { "className": "my-spark", "count": 4, "angleSpread": 360, "offsetX": 6, "duration": 700 },
      { "className": "my-ring", "duration": 1000 }
    ]
  }
}复制 对应的 customCss 中需定义 .my-ripple、.my-spark、.my-ring 及其 @keyframes 动画，元素使用 position:fixed 定位。 安全约束  社区主题的 clickEffect 经过 sanitizeClickEffect() 净化：className 仅允许字母开头的合法 CSS 类名，duration 限制 100–5000ms，style 剥离危险字符。 spawn 数组最多 10 个条目，count 最多 20。 渲染引擎使用 document.createElement + style.cssText，不使用 innerHTML，杜绝 XSS。


## RGB 通道变量 & Tailwind 集成

所有以 --color- 开头的 CSS 变量均自动附带 -rgb 通道变体（如 --color-primary-rgb: 66, 133, 244），
          支持在 Tailwind CSS 中使用不透明度修饰符。
 Tailwind v3 配置示例 // tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
      },
      borderRadius: {
        theme: "var(--radii)",
      },
    },
  },
};复制 Tailwind v4 配置示例 /* app.css */
@import "tailwindcss";

@theme {
  --color-primary: rgb(var(--color-primary-rgb) / <alpha-value>);
  --color-secondary: rgb(var(--color-secondary-rgb) / <alpha-value>);
  --color-background: var(--color-bg);
  --color-surface: var(--color-surface);
}复制  一键获取 Tailwind 配置 curl https://themedist.netlify.app/api/v1/tailwind-config.json复制


## SDK / Web Component

ThemeDist 提供官方轻量化 Web Component <themedist-runner>，将 CSS 变量注入全局 :root，
          并将装饰元素和自定义 CSS 隔离在 Shadow DOM 中。通过 isolation: isolate 创建完全封闭的层叠上下文，
          主题内部的 z-index 绝不会逃逸干扰宿主页面。内置 localStorage 缓存和网络降级。
 快速接入 <!-- 一行标签，自动完成 CSS 变量注入 + 装饰渲染 + 缓存降级 -->
<themedist-runner api="https://themedist.netlify.app/api/v1/today.json" save-shadow="true"></themedist-runner>
<script src="https://themedist.netlify.app/sdk.js" defer></script>复制 属性    属性 默认值 说明   api/api/v1/today.json主题 API 端点 URL save-shadowtrue是否启用 Shadow DOM 隔离     安全设计  CSS 变量：注入到全局 :root，确保全站样式生效。 装饰元素 + 自定义 CSS：隔离在 Shadow DOM 中，customCss 不再注入 document.head，彻底防止样式污染宿主页面。 层叠隔离：:host 使用 isolation: isolate + --td-z-base 合约变量，主题内部 z-index 绝不逃逸。 交互穿透：:host 强制 pointer-events: none，所有装饰元素不可阻挡宿主 UI 点击。 缓存降级：同日访问零网络开销，fetch 失败时自动使用过期缓存。
  SDK v3.0 Features    Feature API Description   User PinThemeDistRunner.setPin('preset-id')Lock visitor to a specific theme Theme ModeThemeDistRunner.setMode('dark')Manual light/dark toggle ('light'|'dark'|'auto') Live Polling<themedist-runner live>Auto-detect theme changes via smart polling SoundExtensions with type: 'sound'Web Audio synthesis, respects reduced-motion


## 轮换策略

# 来源 说明   1🌙 农历节日20+ 个中国传统节日（春节/元宵/端午/七夕/中秋等），每个有专属特效主题 2📅 公历节日元旦/情人节/Pi Day/圣帕特里克节/愚人节等 3🍗 Crazy Thu每周四特殊覆盖 4👥 社区池用户投稿主题每 3 天轮入一次（约 30% 天数），固定频率不受投稿量影响 5🎲 DailyPool152 预设按 dayOfYear % poolLength 轮换，全年无空档


## 缓存策略

端点 浏览器 CDN   /api/v1/today.json1 小时24 小时 (stale-while-revalidate) /api/v1/today.css1 小时24 小时 /api/v1/theme/*.json（预设）24 小时365 天 (immutable) /api/v1/theme/*/wcag.json1 小时— /api/v1/theme/*/scale.json365 天365 天 (immutable) /api/v1/weather-theme.json30 分钟— /api/v1/today/weather.js1 小时24 小时 /api/v1/diy/themes.json1 分钟— /api/v1/diy/theme.json5 分钟— POST /api/v1/diy/*不缓存— POST /api/v1/extract-theme.json不缓存— POST /api/v1/telemetry/hit不缓存— /api/v1/admin/*不缓存—    推荐客户端策略 
fetch → 解析 date → 存入 localStorage → 同日访问跳过网络请求 → 每人每天最多 1 次请求。
            Service Worker 可预缓存全部 152 个 /api/v1/theme/*.json（总计 ~500KB）。


## 安全主题代理 /api/v1/today-safe

从 ThemeDist 代理获取最新的 /api/v1/today.json 数据（Vercel 优先，Netlify 备用），并应用 XSS 清洗。
          下游主题渲染器可直接安全消费，无需自行处理输入净化。
  curl curl https://themedist-monitor.vercel.app/api/v1/today-safe复制

响应结构

字段 类型 说明   datestringISO 日期 YYYY-MM-DD generatedAtstringISO 8601 生成时间戳 presetstring主题预设标识符 presetNamestring主题可读名称 cssVarsobjectCSS 自定义属性键值对（已完成 XSS 清洗） customCssstring | null主题专属 CSS（已完成 XSS 清洗） extensionsarray | nullHTML 装饰片段数组（已完成 XSS 清洗） clickEffectobject | null点击特效配置 logoTextstring | null主题 Logo 文字 logoColorsarray | nullLogo 渐变色 availablenumber可用主题总数 directoryarray主题目录列表 dailyIsCommunityboolean今日主题是否来自社区 apiVersionstringAPI 版本号 apiVersionstringAPI 版本号 layerContextobject图层元数据，供客户端智能决策渲染策略 _metaobject安全元信息：sanitized（是否已清洗）、schemaValid（结构校验）、timestamp（处理时间）

示例响应

{
  "date": "2026-05-27",
  "generatedAt": "2026-05-27T08:39:34.536Z",
  "preset": "aurora-ethereal-pro",
  "presetName": "✨ 幻空",
  "cssVars": { "--color-primary": "#06b6d4", "--color-bg": "#000106", "..." },
  "customCss": "...",
  "extensions": [ ... ],
  "clickEffect": null,
  "logoText": "AURORA",
  "logoColors": ["#6ee7b7", "#06b6d4", "#a855f7", "#6ee7b7"],
  "available": 152,
  "directory": [ ... ],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "_meta": {
    "sanitized": true,
    "schemaValid": true,
    "timestamp": "2026-05-27T09:57:48.808Z"
  }
}复制

异常处理

状态 场景   200成功代理并清洗数据 502Vercel 和 Netlify 两个上游平台均不可达

XSS 清洗说明 
代理返回前对所有字符串字段执行 XSS 清洗，移除 HTML 标签、事件处理器（onerror、onload 等）、
javascript: 协议和 CSS expression()。清洗后的数据可直接注入 DOM，无需额外净化。
_meta.sanitized 标识清洗状态，_meta.schemaValid 标识结构校验结果。


## 主题诊断与导出

WCAG 无障碍诊断

评估主题的颜色对比度是否符合 WCAG 2.1 无障碍标准。检查正文、主色、辅色在背景上的可读性。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/wcag.json复制  返回每条颜色组合的对比度数值及 AA/AAA 级别通过情况，含 compliant 总览标记和 warnings 修复建议。

色阶生成

基于主题主色/辅色/强调色/背景色，通过黑白色插值法生成完整的 Tailwind 风格 50~950 色阶。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/scale.json复制  返回 scales.primary、scales.secondary、scales.accent、scales.background 四组色阶，每组含 50/100/200/300/400/500/600/700/800/900/950 共 11 级。

Shadcn UI 适配器

将主题 CSS 变量转换为 Shadcn UI 所需的 HSL 通道变量体系（--background、--primary、--foreground 等），前景色自动根据背景亮度推断。  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/export/shadcn.css复制  返回完整 CSS（@layer base { :root {'}'}），可直接复制到 Shadcn UI 项目的 globals.css 中使用。365 天 CDN 缓存。

图片取色 API

传入图片 URL，服务端下载后用纯 JavaScript 解码（jpeg-js / pngjs，零原生依赖），
          K-means 聚类提取 Top 5 主色调，再通过色彩语义引擎映射为标准 UI 变量（背景两极化、主色对比度筛选、正文自动适配）。
  curl curl -X POST https://themedist.netlify.app/api/v1/extract-theme.json \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://example.com/poster.jpg"}'复制   限制：仅支持 JPEG/PNG，最大 5MB，抓取超时 5s。 返回：sourcePalette（提取的 5 个 hex）、isDark（暗色/亮色标记）、
cssVars（46 个标准 CSS 变量，含 Z-Index 层级契约与 -rgb 通道变体）、customCss（自动生成的渐变背景）。

代码高亮主题 (Shiki)

将主题的 CSS 变量映射为 Shiki / VS Code 的 TextMate Token 颜色，可直接作为代码高亮主题使用。
  curl curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/shiki.json复制

动态 SVG 背景纹理

根据今日主题色实时生成几何图案 SVG，转为 data URI 嵌入 CSS，可直接作为 <link> 或 background-image 使用。
  curl curl https://themedist.netlify.app/api/v1/today/pattern.css复制

全场景 API 展厅

一个页面同时展示 5 个高级 API 的联动能力：天气感知 → 动态纹理 → 代码高亮 → 智能缓动 → WCAG 对比度。
          访问 /lab 查看。

APCA Contrast (WCAG 3.0)

ThemeDist supports the APCA (Advanced Perceptual Contrast Algorithm) from the WCAG 3.0 draft. Unlike WCAG 2.1's symmetric formula, APCA uses polarity-aware asymmetric coefficients — dark text on light backgrounds and light text on dark backgrounds are evaluated differently.    Lc Range Level Use Case   |Lc| ≥ 75AAABody text |Lc| ≥ 60AABody text (minimum) |Lc| ≥ 45AA LargeLarge text / UI controls |Lc| < 45FailNot readable


## 环境感知 API

天气自适应主题

嗅探式跨平台地理位置检测，自动适配 Vercel（x-vercel-ip-latitude/longitude Header）、
Netlify（locals.netlify.context.geo 或 x-nf-geo Base64 Header），
          调用免费 Open-Meteo API 获取实时天气，自动匹配对应氛围的主题。
          支持 ?lat= 和 ?lon= 查询参数覆盖 IP 检测（用于客户端 Geolocation API）。
          返回城市名（OpenStreetMap Nominatim 逆地理编码）。
  curl — IP 自动检测 curl https://themedist.netlify.app/api/v1/weather-theme.json复制   curl — 指定经纬度 curl "https://themedist.netlify.app/api/v1/weather-theme.json?lat=35.68&lon=139.76"复制  天气映射：晴天 → sunny-day / 阴天 → cloudy-grey / 雨 → rainy-mood / 雪 → snow-white / 雷暴 → thunderstorm。API 超时 3s，失败时降级为 Clear Sky + 今日主题。缓存 30 分钟。  → 在线演示页面 — 浏览器定位 + 实时天气视觉渲染

系统状态覆盖

根据系统运行状态返回覆盖主题，用于维护页、哀悼日、故障降级等场景。  curl — 维护模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=maintenance"复制   curl — 哀悼模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=mourning"复制   curl — 故障模式 curl "https://themedist.netlify.app/api/v1/status-override.json?status=incident"复制  有效状态：maintenance（纯灰）、mourning（暗黑灰调 + grayscale 滤镜标记）、incident（红色警示）。缓存 5 分钟。


## 社区主题 API

获取列表 curl — 最新（分页）curl https://themedist.netlify.app/api/v1/diy/themes.json?sort=new&page=1&size=20复制 curl — 最热curl https://themedist.netlify.app/api/v1/diy/themes.json?sort=hot复制 curl — 按标签筛选curl https://themedist.netlify.app/api/v1/diy/themes.json?tag=dark复制 参数: sort=new|hot, page=1, size=20(max50), tag=dark|light|warm|cool|vibrant|minimal|nature|tech 获取单个主题 curlcurl https://themedist.netlify.app/api/v1/diy/theme.json?id=abc12345复制 提交主题 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/submit.json \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Theme","author":"You","cssVars":{"--color-primary":"#ff6b6b","--color-bg":"#1a1a2e"},"customCss":"body { ... }","extensions":[{"type":"floating","char":"✨"}],"tags":["dark","vibrant"]}'复制 必填: name, author, cssVars（必须含 --color-primary 和 --color-bg）。可选: customCss, extensions, tags（最多 5 个）。提交后进入审核队列。 成功响应 201：{ success: true, theme: { id, name, ... }, warnings?: [...], apiVersion: "v1" }。如果有 warnings 数组，说明部分字段被自动调整（如不支持的类型被移除）。 推荐标签 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/suggest-tags.json \
  -H 'Content-Type: application/json' \
  -d '{"cssVars":{"--color-primary":"#ff6b6b","--color-bg":"#1a1a2e"},"customCss":"...","extensions":[...],...}'复制 纯计算端点，无需 Redis。8 个分析器（颜色/字体/内容/结构/特效/Emoji/对比度/色调协调）加权评分，覆盖 19 种标签（dark/light/warm/cool/vibrant/minimal/nature/tech/retro/holiday/space/ocean/animated/elegant/glass/seasonal/fantasy/industrial），返回最多 5 个带置信度和中文原因的标签建议。必填: cssVars。可选: customCss, extensions, presetName。 响应 200：{ tags: [{ tag: "dark", confidence: 0.98, reason: "背景亮度仅 0.01" }, ...], apiVersion: "v1" }。 点赞 curlcurl -X POST https://themedist.netlify.app/api/v1/diy/like.json \
  -H 'Content-Type: application/json' \
  -d '{"id":"abc12345"}'复制 服务器基于 IP + User-Agent 指纹去重，同一用户对同一主题仅计一次。返回 {likes: number, voted: boolean, apiVersion: "v1"}。


## 接入步骤

1. 请求 API — 页面加载时 GET /api/v1/today.json，尽早执行减少 FOUC 2. 注入 CSS 变量 — 遍历 cssVars，逐条 setProperty(k, v) 到 :root 3. 注入特效 — customCss 非 null → 创建 <style>；extensions 非 null → 安全解析声明式元素（createElement + textContent） 4. localStorage 缓存 — 存 date + cssVars + customCss，同日跳过网络请求 5. 错误降级 — fetch 失败 → 从 localStorage 恢复昨日主题 → CSS var(--xxx, fallback) 兜底


## 代码示例

Vanilla JavaScript（含缓存+降级+特效）  
复制

// 完整集成示例 — 含缓存、降级、特效注入
(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const cached = JSON.parse(localStorage.getItem('td') || 'null');

  if (cached?.date === today) return applyTheme(cached);

  const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
  const t = await res.json();

  const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss, exts: t.extensions };
  localStorage.setItem('td', JSON.stringify(data));
  applyTheme(data);
})().catch(() => {
  const fallback = JSON.parse(localStorage.getItem('td') || 'null');
  if (fallback) applyTheme(fallback);
});

function applyTheme(d) {
  Object.entries(d.cssVars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
  if (d.customCss) { let s = document.createElement('style'); s.textContent = d.customCss; document.head.appendChild(s); }
  if (d.exts) { d.exts.forEach(ext => { if (ext.type==='floating') { let el = document.createElement('div'); el.style.cssText = ['position:fixed','pointer-events:none', ext.top&&'top:'+ext.top, ext.left&&'left:'+ext.left, ext.fontSize&&'font-size:'+ext.fontSize, ext.animation&&'animation:'+ext.animation, ext.opacity!=null&&'opacity:'+ext.opacity].filter(Boolean).join(';'); el.textContent = ext.char; document.body.prepend(el); } }); }
}复制

React Hook 示例

import { useState, useEffect } from 'react';

function useThemeDist() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = JSON.parse(localStorage.getItem('td') || 'null');
    if (cached?.date === today) { setTheme(cached); return; }

    fetch('https://themedist.netlify.app/api/v1/today.json')
      .then(r => r.json())
      .then(t => {
        const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss };
        localStorage.setItem('td', JSON.stringify(data));
        setTheme(data);
      })
      .catch(() => {
        const fb = JSON.parse(localStorage.getItem('td') || 'null');
        if (fb) setTheme(fb);
      });
  }, []);

  useEffect(() => {
    if (!theme) return;
    Object.entries(theme.cssVars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v));
  }, [theme]);

  return theme;
}复制

Vue 3 Composable 示例

import { ref, onMounted, watch } from 'vue';

export function useThemeDist() {
  const theme = ref(null);

  onMounted(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = JSON.parse(localStorage.getItem('td') || 'null');
    if (cached?.date === today) { theme.value = cached; return; }

    try {
      const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
      const t = await res.json();
      const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss };
      localStorage.setItem('td', JSON.stringify(data));
      theme.value = data;
    } catch {
      theme.value = JSON.parse(localStorage.getItem('td') || 'null');
    }
  });

  watch(theme, (t) => {
    if (!t) return;
    Object.entries(t.cssVars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v));
    if (t.customCss) {
      const s = document.createElement('style');
      s.textContent = t.customCss;
      document.head.appendChild(s);
    }
  });

  return theme;
}复制


## 常见问题

Q: 如何固定使用某个主题？ 调用 GET /api/v1/theme/{preset}.json 获取指定主题，或从 /api/v1/today.json 响应的 directory 字段中选择 preset 后调用。   Q: 每天什么时候切换主题？ 主题由 CDN 边缘函数根据 UTC 日期实时计算，UTC 0:00（北京时间 8:00）自动切换。客户端通过 date 字段判断是否已切换。   Q: 请求有速率限制吗？ GET 端点无速率限制，响应已设 CDN 缓存头（today: 24h，preset: 365d）。写操作（投稿/点赞）有滑动窗口限流：投稿 3次/分钟，点赞 10次/分钟，超限返回 429。   Q: 社区主题会过期吗？ 不会。审核通过后长期有效，可被每日轮换选中（约 30% 天数）。   Q: 可以自己部署吗？ 可以。项目开源，支持 Vercel + Netlify 双平台。需要配置 Upstash Redis 实例（社区功能）和可选的 DeepSeek API Key（AI 生成）。详见 README 部署章节。   Q: extensions 支持哪些类型？ 仅支持 "floating"（浮动 emoji/字符，createElement 安全渲染）和 "decorative"（装饰 HTML 片段，server 端清洗后 client 端 template 安全解析）。不支持 JavaScript（"type": "javascript" 会在提交时被移除并在 warnings 中报告）。最多 20 个扩展。   Q: 提交的主题有 JavaScript 扩展，为什么不生效？ "type": "javascript" 不被支持。请将其中的 DOM 创建逻辑转为 "decorative" 类型的 HTML 片段 + customCss 中的 CSS 动画。系统会自动从 customCss 中解析动画类并生成粒子元素。API 响应中的 warnings 数组会提示被移除的类型及原因。   Q: CSS 变量键名可以不带 -- 前缀吗？ 可以。提交 API 会自动补齐 -- 前缀（如 color-primary → --color-primary），防御 AI 生成时忘记前缀。


## 错误处理

状态 场景 处理   200正常解析 JSON，注入变量 400请求格式错误 / 缺少必填字段检查 cssVars 含 --color-primary + --color-bg 404主题 / 文件不存在检查 ID 或路径是否正确 429请求频率超限投稿 3/min，点赞 10/min；等待恢复 503数据库不可用稍后重试；GET 端点有静态降级 —网络中断catch → localStorage 降级   API 由边缘函数处理，数据库不可用时自动降级为预渲染静态文件。客户端的最终降级方案是 localStorage 缓存。


## 响应头

Header 值   Content-Typeapplication/json Access-Control-Allow-Origin* Cache-Controlpublic, max-age=3600, s-maxage=86400


## 完整响应示例（今日）

实时数据，每次刷新页面获取最新 API 返回值。

正在获取完整响应...

{
  "date": "2026-05-31",
  "generatedAt": "2026-05-31T07: 18: 15.014Z",
  "preset": "holiday-151",
  "presetName": "GRAIN BUDS",
  "cssVars": {
    "--color-primary": "#228b22",
    "--color-secondary": "#ffd700",
    "--color-accent": "#32cd32",
    "--color-bg": "#051002",
    "--color-surface": "#141f11",
    "--color-text": "#f0fff0",
    "--color-text-muted": "#98fb98",
    "--color-border": "rgba(50,205,50,0.18)",
    "--font-heading": "'Inter', system-ui, sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', monospace",
    "--text-base": "clamp(1rem, 0.9rem + 0.5vw, 1.125rem)",
    "--text-lg": "calc(var(--text-base) * 1.25)",
    "--text-xl": "calc(var(--text-lg) * 1.25)",
    "--text-2xl": "calc(var(--text-xl) * 1.25)",
    "--text-sm": "calc(var(--text-base) / 1.25)",
    "--space-unit": "0.25rem",
    "--space-1": "calc(0.25rem * 1)",
    "--space-2": "calc(0.25rem * 2)",
    "--space-3": "calc(0.25rem * 3)",
    "--space-4": "calc(0.25rem * 4)",
    "--space-6": "calc(0.25rem * 6)",
    "--space-8": "calc(0.25rem * 8)",
    "--space-12": "calc(0.25rem * 12)",
    "--radii": "0.75rem",
    "--content-max": "72rem",
    "--shadow-sm": "0 1px 2px rgba(0,0,0,0.08)",
    "--shadow-md": "0 4px 12px rgba(0,0,0,0.12)",
    "--shadow-lg": "0 12px 32px rgba(0,0,0,0.18)",
    "--glass-bg": "color-mix(in srgb, var(--color-bg) 85%, transparent)",
    "--glass-blur": "blur(16px)",
    "--noise-opacity": "0",
    "--color-gradient-primary": "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
    "--color-gradient-accent": "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    "--color-gradient-bg": "linear-gradient(180deg, var(--color-bg), var(--color-surface))",
    "--color-gradient-ambient": "radial-gradient(ellipse at 30% 50%, var(--ambient-1), transparent 70%)",
    "--td-z-base": "-10",
    "--td-z-float": "10",
    "--td-z-weather": "20",
    "--td-z-fx": "9999",
    "--ambient-1": "rgba(50, 205, 50, 0.2)",
    "--ambient-2": "rgba(255, 215, 0, 0.1)",
    "--color-primary-rgb": "34, 139, 34",
    "--color-secondary-rgb": "255, 215, 0",
    "--color-accent-rgb": "50, 205, 50",
    "--color-bg-rgb": "5, 16, 2",
    "--color-surface-rgb": "20, 31, 17",
    "--color-text-rgb": "240, 255, 240",
    "--color-text-muted-rgb": "152, 251, 152",
    "--color-border-rgb": "50, 205, 50",
    "--ambient-1-rgb": "50, 205, 50",
    "--ambient-2-rgb": "255, 215, 0"
  },
  "customCss": "\n                    @keyframes wheatSway { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }\n                ",
  "extensions": [
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "15%",
      "fontSize": "60px",
      "opacity": 0.3,
      "animation": "wheatSway 4s infinite"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "25%",
      "fontSize": "50px",
      "opacity": 0.25,
      "animation": "wheatSway 3.5s infinite 0.5s"
    },
    {
      "type": "floating",
      "char": "🌾",
      "bottom": "0",
      "left": "70%",
      "fontSize": "55px",
      "opacity": 0.28,
      "animation": "wheatSway 4.2s infinite 1s"
    },
    {
      "type": "floating",
      "char": "☀️",
      "top": "20%",
      "right": "15%",
      "fontSize": "40px",
      "opacity": 0.2
    },
    {
      "type": "floating",
      "char": "🍒",
      "bottom": "15%",
      "right": "15%",
      "fontSize": "45px",
      "opacity": 0.2
    }
  ],
  "clickEffect": null,
  "logoText": "GRAIN BUDS",
  "logoColors": [
    "#98fb98",
    "#32cd32",
    "#ffd700",
    "#ffffff"
  ],
  "available": 152,
  "directory": [
    {
      "preset": "yozakura-reverie",
      "name": "🌸 Yozakura",
      "primary": "#ff8fa3",
      "accent": "#ff8fa3",
      "logoText": "YOZAKURA"
    },
    {
      "preset": "arknights-babel-epic",
      "name": "ARKNIGHTS",
      "primary": "#2c3540",
      "accent": "#b34747",
      "logoText": "ARKNIGHTS"
    },
    {
      "preset": "crimson-abyss",
      "name": "🩸 Crimson Abyss",
      "primary": "#ff2a4b",
      "accent": "#ff2a4b",
      "logoText": "CRIMSON"
    },
    {
      "preset": "abyss",
      "name": "🌊 DEEPSEA",
      "primary": "#005c97",
      "accent": "#00f2fe",
      "logoText": "OMNI-ABYSS"
    },
    {
      "preset": "hyperspace-cinema",
      "name": "🚀 HYPERSPACE",
      "primary": "#00ffff",
      "accent": "#00ffff",
      "logoText": "WARP. OS"
    },
    {
      "preset": "retro-mirage",
      "name": "🌇 Retro-Matrix",
      "primary": "#ff2a85",
      "accent": "#ff2a85",
      "logoText": "RETRO::MATRIX"
    },
    {
      "preset": "cosmos-pro",
      "name": "🌌 幽邃深空",
      "primary": "#3b0764",
      "accent": "#c084fc",
      "logoText": "OMNI-COSMOS"
    },
    {
      "preset": "aurora-ethereal-pro",
      "name": "✨ 幻空",
      "primary": "#06b6d4",
      "accent": "#10b981",
      "logoText": "AURORA"
    },
    {
      "preset": "flare",
      "name": "🔥 日珥爆发",
      "primary": "#991b1b",
      "accent": "#f97316",
      "logoText": "OMNI-FLARE"
    },
    {
      "preset": "onyx-gold",
      "name": "✦ ONYX",
      "primary": "#0f0e0d",
      "accent": "#d4af37",
      "logoText": "ONYX·GOLD"
    },
    {
      "preset": "holiday-01-01",
      "name": "NEW YEAR'S DAY (01-01)",
      "primary": "#800080",
      "accent": "#ff0000",
      "logoText": "NEW YEAR'S DAY"
    },
    {
      "preset": "holiday-02-14",
      "name": "OMNI-ROMANCE (02-14)",
      "primary": "#e11d48",
      "accent": "#ff1453",
      "logoText": "OMNI-ROMANCE"
    },
    {
      "preset": "holiday-03-14",
      "name": "MATRIX 3.1415 (03-14)",
      "primary": "#4285F4",
      "accent": "#4285f4",
      "logoText": "MATRIX 3.1415"
    },
    {
      "preset": "holiday-03-17",
      "name": "LUCKY MATRIX (03-17)",
      "primary": "#006400",
      "accent": "#32cd32",
      "logoText": "LUCKY MATRIX"
    },
    {
      "preset": "holiday-04-01",
      "name": "what is the real (04-01)",
      "primary": "#00ffff",
      "accent": "#ff00ff",
      "logoText": "what is the real"
    },
    {
      "preset": "holiday-l01-02",
      "name": "CAISHEN DAY (L01-02)",
      "primary": "#ff8c00",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAY"
    },
    {
      "preset": "holiday-l01-05",
      "name": "CAISHEN DAO (L01-05)",
      "primary": "#b22222",
      "accent": "#ffd700",
      "logoText": "CAISHEN DAO"
    },
    {
      "preset": "holiday-l01-15",
      "name": "RAIN WATER (L01-15)",
      "primary": "#4682b4",
      "accent": "#87ceeb",
      "logoText": "RAIN WATER"
    },
    {
      "preset": "holiday-l02-02",
      "name": "DRAGON RISES (L02-02)",
      "primary": "#00008b",
      "accent": "#00bfff",
      "logoText": "DRAGON RISES"
    },
    {
      "preset": "holiday-l03-03",
      "name": "SHANGSI FESTIVAL (L03-03)",
      "primary": "#22c55e",
      "accent": "#86efac",
      "logoText": "SHANGSI FESTIVAL"
    },
    {
      "preset": "community-N85Qm9Ao",
      "name": "🖥️ PRTS // Pharmacore System Override",
      "primary": "#a2f0ff",
      "accent": "#ff9e00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-ylRQOSdL",
      "name": "🖥️ PRTS // Core Neural Override",
      "primary": "#00f3ff",
      "accent": "#ff8c00",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-KbdfatXI",
      "name": "🖥️ PRTS // ADACCH Override",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-E73wwiml",
      "name": "🖥️ PRTS System Interface",
      "primary": "#00d4ff",
      "accent": "#00d4ff",
      "logoText": null,
      "community": true
    },
    {
      "preset": "community-8dhvCpZo",
      "name": "⚡ Circuit Dream · 电路梦境",
      "primary": "#e930ff",
      "accent": "#e930ff",
      "logoText": null,
      "community": true
    }
  ],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "layerContext": {
    "hasBackgroundOverlay": false,
    "hasInteractiveElements": false,
    "particleDensity": "medium",
    "safeWeatherZIndex": "var(--td-z-weather, 20)"
  }
}复制



# ThemeDist

**每日轮换的主题 CSS 变量分发服务** — 一个 GET 请求，整套网站视觉主题。

ThemeDist 是基于 Astro SSR 的主题分发平台，通过 **OmniConfig 主题数据库**（150+ 套节日 + 日池主题，含 35+ 农历节日、90+ 公历节日）每日由 Astro SSR 实时计算并输出 48 个 CSS 自定义属性。同时提供主题商店、在线构建器、社区投稿与审核、AI 辅助生成、主题标签分类、JSON 即装预览等完整功能。

支持 **Vercel + Netlify** 双平台部署，一份代码，同时运行。

---

## 目录

- [项目用途](#这个项目有什么用)
- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [API 使用](#api-使用)
- [CSS 变量参考](#css-变量参考)
- [主题轮换策略](#主题轮换策略)
- [AI 主题生成](#ai-主题生成)
- [主题分类与标签](#主题分类与标签)
- [项目结构](#项目结构)
- [架构说明](#架构说明)
- [技术栈](#技术栈)
- [本地开发](#本地开发)
- [部署](#部署)
- [未来计划](#未来计划)
- [许可证](#许可证)

---

## 这个项目有什么用？？？

**ThemeDist** 简单来说，是一个**网页“每日穿搭”分发服务**。它主要是为了帮网页开发者解决 **“如何让自己的网站根据节日、日期自动切换视觉风格”** 这一需求。

### 1. 它能帮你的网站实现什么？（核心作用）

如果你把这个服务接入到你自己的网站中，你的网站就能实现**每日自动换肤**：
* **节日自动变装**：如果是农历春节，你的网站会自动变成红色调，甚至飘起红灯笼（Emoji 装饰）；如果是端午节，自动切换成青绿色的龙舟氛围；如果是地球日，自动变为绿色自然风。
* **周四特殊梗**：到了星期四，网站能自动切入恶搞的“疯四”KFC 红色主题。
* **日常不重样**：在没有节日的普通日子里，它会在拥有的 150+ 套预设主题池（或经过审核的社区投稿主题）中每日轮换，让用户每天访问你的网站都有新鲜感。

---

### 2. 它解决了开发者的哪些痛点？

在没有这种服务之前，开发者如果想让网站“逢年过节变个装”，通常需要：
1. **手动写多套 CSS**：为每个节日单独设计、调试一套配色。
2. **写复杂的日期判断逻辑**：特别是农历节日（如中秋、春节），在前端用 JS 计算农历非常繁琐，且会增加前端打包体积。
3. **手动部署或配置定时任务**：到了节日当天凌晨，手动去修改代码并重新发布网站。

而使用 **ThemeDist** 之后：
* **一劳永逸**：你只需要在网站的 HTML 里引入一个 API 链接，所有的日期计算、节日匹配、主题色选择、甚至氛围特效（如飘落的 Emoji）全部由 ThemeDist 服务端实时计算好并分发给你。
* **零维护成本**：你不需要在节日当天做任何操作，服务器到了 UTC 0点（北京时间早8点）会自动计算并切换主题。

---

### 3. 技术上它是如何工作的？

它的工作机制非常轻量且模块化：

1. **获取“穿搭指南”**：你的网页向 ThemeDist 发送一个 `GET` 请求（或者直接引入一个 `<link>` 样式表）。
2. **应用 CSS 变量**：API 会返回 48 个标准化的 CSS 自定义属性（即 CSS 变量），比如：
   * `--color-primary`（主色调）
   * `--color-bg`（背景色）
   * `--font-heading`（标题字体）
   * `--space-4`（间距）
3. **自动套用**：你的网页样式（CSS）只要使用了这些变量（例如 `background: var(--color-bg)`），就会在收到变量的瞬间自动改变颜色和布局。
4. **安全特效**：如果当天主题含有动画（比如灯笼摆动）或悬浮字符，它提供了经过安全过滤（防止恶意脚本注入 XSS）的 HTML 和 CSS 动画，供你安全地渲染在页面上。

---

### 4. 适合什么样的人和项目？

* **个人博客/主页**：让自己的小站更有生机，跟随现实世界的节日一同变化。
* **后台管理系统/SaaS 平台**：为用户提供一种“每日心情主题”的趣味功能，提升用户体验。
* **运营活动网站**：无需为每次短期节日活动重新设计、部署网页，直接套用现成的主题分发。

**总结：**
ThemeDist 就像是一个免维护的云端视觉运营助手。你只需要把网页的颜色、间距等样式“托管”给它的 CSS 变量，后续的每日轮换、节日换装、特效加载就全都不需要你再操心了。

## 快速开始

在你的网站中引入今日主题：

```html
<script>
fetch('https://themedist.netlify.app/api/v1/today.json')
  .then(r => r.json())
  .then(t => applyTheme(t))
  .catch(() => {
    const fb = JSON.parse(localStorage.getItem('td') || 'null');
    if (fb) applyTheme(fb);
  });

function applyTheme(t) {
  // 1. CSS 变量注入 :root
  Object.entries(t.cssVars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v));

  // 2. 自定义 CSS（安全注入：textContent，绝无 innerHTML）
  if (t.customCss) {
    let s = document.getElementById('td-custom-css');
    if (!s) { s = document.createElement('style'); s.id = 'td-custom-css'; document.head.appendChild(s); }
    s.textContent = t.customCss;
  }

  // 3. 声明式装饰元素 — 完整渲染逻辑见下方「完整集成方案」的 renderExtensions 函数
  // 此处省略，生产环境请使用下方完整方案（含缓存、降级、XSS 安全渲染）

  // 4. 写入缓存
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('td', JSON.stringify({ date: today, cssVars: t.cssVars, customCss: t.customCss, exts: t.extensions }));
}
</script>
```

完整集成方案（含缓存、降级、双类型扩展渲染）：

```javascript
(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const cached = JSON.parse(localStorage.getItem('td') || 'null');
  if (cached?.date === today) return applyTheme(cached);

  try {
    const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
    if (!res.ok) throw new Error('API unavailable');
    const t = await res.json();
    const data = { date: t.date, cssVars: t.cssVars, customCss: t.customCss, exts: t.extensions };
    localStorage.setItem('td', JSON.stringify(data));
    applyTheme(data);
  } catch {
    const fallback = JSON.parse(localStorage.getItem('td') || 'null');
    if (fallback) applyTheme(fallback);
  }
})();

// ── 主题应用核心 ──

function applyTheme(d) {
  // CSS 变量 → :root
  Object.entries(d.cssVars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v));

  // 自定义 CSS → <style>（安全：textContent）
  let styleEl = document.getElementById('td-custom-css');
  if (d.customCss) {
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'td-custom-css'; document.head.appendChild(styleEl); }
    styleEl.textContent = d.customCss;
  } else if (styleEl) {
    styleEl.remove();
  }

  // 扩展元素渲染
  const oldExts = document.getElementById('td-extensions');
  if (oldExts) oldExts.innerHTML = '';
  if (d.exts && d.exts.length) renderExtensions(d.exts);
}

// ── 扩展元素渲染（无 innerHTML） ──

// 轻量 CSS 值清洗（防御 XSS）
function safeVal(v) { return (v||'').toString().slice(0,128).replace(/[;{}]/g,'').replace(/url\s*\(/gi,'').replace(/expression\s*\(/gi,'').replace(/javascript\s*:/gi,'').replace(/@import/gi,'').trim(); }
function safeDim(v) { var s = safeVal(v); return /^-?[\d.]+(?:%|px|em|rem|vh|vw|s|ms)?$/i.test(s) ? s : ''; }

function renderExtensions(exts) {
  let container = document.getElementById('td-extensions');
  if (!container) { container = document.createElement('div'); container.id = 'td-extensions'; document.body.prepend(container); }

  exts.slice(0, 20).forEach(function(ext) {
    if (ext.type === 'floating' && ext.char) {
      // floating: document.createElement 安全创建，绝无 innerHTML
      var el = document.createElement('div');
      var t = safeDim(ext.top), l = safeDim(ext.left), r = safeDim(ext.right), b = safeDim(ext.bottom);
      var fs = safeDim(ext.fontSize), anim = safeVal(ext.animation || '');
      var z = (typeof ext.zIndex === 'number' && ext.zIndex > -2 && ext.zIndex < 100000) ? ext.zIndex : null;
      var op = (typeof ext.opacity === 'number' && ext.opacity >= 0 && ext.opacity <= 1) ? ext.opacity : null;
      el.style.cssText = [
        'position:fixed', 'pointer-events:none',
        t && 'top:' + t, l && 'left:' + l, r && 'right:' + r, b && 'bottom:' + b,
        fs && 'font-size:' + fs, anim && 'animation:' + anim,
        z != null && 'z-index:' + z, op != null && 'opacity:' + op
      ].filter(Boolean).join(';');
      el.textContent = String(ext.char).slice(0, 4);
      container.appendChild(el);

    } else if (ext.type === 'decorative' && ext.html) {
      // decorative: <template> 安全解析 HTML，剥离 on* 事件
      var tpl = document.createElement('template');
      tpl.innerHTML = ext.html;
      var frag = tpl.content.cloneNode(true);
      frag.querySelectorAll('*').forEach(function(node) {
        Array.from(node.attributes).forEach(function(attr) {
          if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
        });
      });
      container.appendChild(frag);
    }
    // 注意："javascript" 类型不支持且会被服务端拒绝（API 响应的 warnings 字段会提示）
  });
}
```

> **FOUC 消除**：推荐在 `<head>` 中同步引入 `<link rel="stylesheet" href="/api/v1/today.css">`，阻塞式加载 CSS 变量，消除无样式闪烁。配合上述 JS 注入 customCss + extensions 即可完整覆盖。

---

## 功能特性

### 核心功能

- **每日自动轮换** — Astro SSR 实时计算，无需定时构建。农历节日 → 公历节日 → Crazy Thursday → 社区主题（约 30% 天数）→ 日池兜底
- **农历节日支持** — 基于 `lunar-javascript` 实现，覆盖春节、元宵、端午、中秋、重阳等 35+ 传统农历节日（含二十四节气）。运行时通过 `Lunar.fromDate()` 直接计算当前农历日期并匹配对应主题
- **社区主题投稿与审核** — 用户投稿后进入待审队列，管理员审核通过后自动发布至社区商店。通过后可点赞、可分享，长期有效。API 返回 `warnings` 提示不支持的扩展类型（如 `javascript`）
- **RESTful API** — `GET /api/v1/today.json` 返回完整主题数据；所有接口支持 CORS 跨域
- **CDN 友好缓存** — 浏览器 1h / CDN 24h（今日主题，含 `stale-while-revalidate=3600` 降级），365 天不可变缓存（预设主题端点）
- **CSS 变量体系** — 48 个语义化 CSS 自定义属性（颜色 10 + 排版 5 + 间距 10 + 效果 5 + 氛围 2 + Z-Index 层级契约 4 + 自动生成的 RGB 通道变体 12），覆盖完整 UI 语义
- **双平台部署** — Vercel + Netlify 同时分发，同一份代码自动适配
- **优雅降级** — Redis 不可用时社区功能自动降级为只读，站点核心功能不受影响

### 用户端页面

- **主题商店（Theme Store）** — 浏览、搜索、按分类/色温/标签筛选所有主题（预设 + 社区），社区主题支持按暗色/亮色/暖色/冷色/鲜艳/极简/自然/科技标签筛选，高亮今日主题。社区列表使用 sessionStorage 缓存（5 分钟 TTL），命中缓存瞬间渲染，后台静默刷新
- **主题构建器（Theme Builder）** — 实时编辑 CSS 变量、自定义 CSS、声明式扩展（floating + decorative），各编辑器独立格式化 + 实时计数。智能检测不支持类型并实时提示。支持图片取色（K-means 聚类提取调色板）、AI 描述生成、一键应用至全站
- **社区投稿（Submit）** — 三栏编辑器（CSS 变量 / 自定义 CSS / Extensions），实时校验 extensions 类型（floating / decorative）并警告不支持的类型（如 javascript）。右侧 16:9 LIVE SENSING 沙箱实时预览。提交后 API 返回 warnings 提示被移除的字段。本地历史记录含数据库状态检测
- **AI 主题生成** — 输入文字描述，使用 DeepSeek（用户自带 Key，客户端直接调用，max_tokens: 10000）或内置规则引擎生成完整 CSS 变量主题
- **主题分享页（Share）** — 社区主题详情展示，支持点赞、复制链接、一键应用，含桌面/平板/手机视口切换预览
- **主题预览（Theme Preview）** — 粘贴 JSON 配置即刻变装预览，支持格式化、载入示例、清空还原，无需提交即可实时体验任意主题

### 管理端

- **Cookie 认证 + CSRF** — 单管理员登录，HttpOnly + SameSite strict，写操作需 CSRF Token
- **投稿限流** — 内存级滑动窗口限流（投稿 3次/分钟，点赞 10次/分钟），超限返回 429
- **审核面板** — 主题提交后默认进入待审队列，管理员审核通过后发布至社区商店
- **点赞去重** — Redis Set 防重复点赞（IP + User-Agent 哈希），点赞数实时同步至排行榜

---

## API 使用

详细文档请访问部署后的 `/api/docs` 页面。以下为完整端点概览：

### 完整端点索引

| 方法 | 路径 | 分类 | 说明 | 缓存 |
|------|------|------|------|------|
| GET | `/api/v1/today.json` | 核心 | 今日主题完整数据（cssVars + extensions + directory） | 浏览器 1h / CDN 24h |
| GET | `/api/v1/today.css` | 核心 | 今日主题纯 CSS（`:root{}` 变量，消除 FOUC） | 浏览器 1h / CDN 24h |
| GET | `/api/v1/date=MM-DD` | 核心 | 按日期查询主题（如 `/api/v1/date=02-14`） | 浏览器 1h |
| GET | `/api/v1/theme/{id}.json` | 核心 | 指定预设/社区主题完整数据 | 预设 365d / 社区 1h |
| GET | `/api/v1/theme/random.json` | 工具 | 随机主题（支持 `?pool=static\|community\|all` 和 `?seed=N`） | 不缓存 |
| GET | `/api/v1/index-data.json` | 核心 | 构建时索引（日池/节日映射/目录） | 浏览器 1h / CDN 24h |
| | | | | |
| GET | `/api/v1/theme/{id}/wcag.json` | 诊断 | WCAG 无障碍诊断（AA/AAA 对比度评估） | 浏览器 1h |
| GET | `/api/v1/theme/{id}/scale.json` | 诊断 | Tailwind 风格 50~950 色阶（4 组） | 365d immutable |
| GET | `/api/v1/theme/{id}/export/shadcn.css` | 诊断 | Shadcn UI HSL 变量适配器 | 365d immutable |
| GET | `/api/v1/theme/{id}/shiki.json` | 诊断 | Shiki/VS Code TextMate Token 颜色映射 | 365d immutable |
| GET | `/api/v1/theme/{id}/og.svg` | 工具 | OG 社交分享卡片（1200×630 SVG） | 365d immutable |
| | | | | |
| GET | `/api/v1/weather-theme.json` | 环境 | 天气自适应主题（IP/Geolocation + Open-Meteo） | 30min |
| GET | `/api/v1/status-override.json?status=` | 环境 | 系统状态覆盖（maintenance/mourning/incident） | 5min |
| | | | | |
| GET | `/api/v1/tailwind-config.json` | 工具 | Tailwind CSS 配置生成（RGB 通道 + `<alpha-value>`） | 浏览器 1h |
| GET | `/api/v1/tokens.json` | 工具 | W3C DTCG 设计令牌 JSON 导出 | 浏览器 1h |
| GET | `/api/v1/today/pattern.css` | 工具 | 动态 SVG 背景纹理（主题色几何图案） | 浏览器 1h |
| GET | `/api/v1/today/weather.js` | 工具 | 天气粒子渲染脚本（云/雨/雪/太阳/闪电），`<script src>` 引入 | 浏览器 1h / CDN 24h |
| GET | `/api/v1/today/favicon.svg` | 工具 | 动态 Favicon（主色圆角矩形 + Logo 首字） | 浏览器 1h |
| GET | `/api/v1/today/fonts.css` | 工具 | 自动字体注入（Google Fonts @import） | 浏览器 1h |
| GET | `/api/v1/today/palette.svg` | 工具 | 今日主题调色盘 SVG 徽章 | 浏览器 1h |
| GET | `/api/v1/search/color.json?hex=&limit=` | 工具 | 颜色相似度搜索（RGB 欧几里得距离） | 浏览器 1h |
| GET | `/api/v1/recommend/{id}.json` | 工具 | 智能推荐引擎（Jaccard + 颜色距离） | 浏览器 1h |
| GET | `/api/v1/trending.json` | 工具 | 趋势排行榜（热度 = 点赞×10 + 使用量×1） | 5min |
| GET | `/api/v1/badge/{username}.svg` | 工具 | GitHub 动态徽章（shields.io 风格） | 浏览器 1h |
| POST | `/api/v1/extract-theme.json` | 工具 | 图片取色（K-means + UI 语义映射，纯 JS） | 不缓存 |
| POST | `/api/v1/ai/describe.json` | AI | AI 逆向描述（CSS 变量→中文风格分析） | 不缓存 |
| | | | | |
| GET | `/api/v1/diy/themes.json` | 社区 | 社区主题列表（分页 + 排序 + 标签筛选） | 1min |
| GET | `/api/v1/diy/theme.json?id=` | 社区 | 单个社区主题详情（含点赞数） | 5min |
| POST | `/api/v1/diy/submit.json` | 社区 | 提交社区主题（进入审核队列） | 不缓存 |
| POST | `/api/v1/diy/suggest-tags.json` | 社区 | 8 维度分析主题，推荐 19 类标签及置信度 | 不缓存 |
| POST | `/api/v1/diy/like.json` | 社区 | 点赞社区主题（IP+UA+UUID 三重去重） | 不缓存 |
| | | | | |
| POST | `/api/v1/ai/generate.json` | AI | AI 主题生成（规则引擎，或 DeepSeek 客户端直调） | 不缓存 |
| | | | | |
| POST | `/api/v1/telemetry/hit` | 遥测 | 匿名遥测上报（HyperLogLog + Sorted Set） | 不缓存 |
| POST | `/api/v1/pool/create.json` | 池 | 创建自定义轮换池 | 不缓存 |
| GET | `/api/v1/pool/{poolId}.json` | 池 | 自定义轮换池每日轮换查询 | 1h |
| | | | | |
| GET | `/api/v1/admin/health.json` | 管理 | Redis 健康检查（pending/approved 计数） | 不缓存 |
| POST | `/api/v1/admin/login.json` | 管理 | 管理员登录（Cookie + CSRF） | 不缓存 |
| GET/POST | `/api/v1/admin/review.json` | 管理 | 审核待审主题 / 批量批准 | 不缓存 |
| GET/POST | `/api/v1/admin/api-keys.json` | 管理 | API 密钥管理（创建/轮换/撤销） | 不缓存 |
| POST | `/api/v1/admin/moderate.json` | 管理 | 内容审核（基于规则的自动审核） | 不缓存 |
| | | | | |
| GET | `/api/v1/today.json?wcag-fix=aa\|aaa` | 核心 | 自动修复 WCAG 对比度问题（HSL 亮度调整） | 浏览器 1h / CDN 24h |
| GET | `/api/v1/today.json?dual=true&mode=class\|data` | 核心 | 返回亮色 + 暗色双主题变体 | 浏览器 1h / CDN 24h |
| GET | `/api/v1/today.json?locale=hi-IN` | 核心 | 地区感知节日主题（hi-IN / ja-JP / en-US / pt-BR） | 浏览器 1h / CDN 24h |
| GET | `/api/v1/today.css?dual=true&mode=class` | 核心 | 双主题 CSS 输出（.theme-light / .theme-dark） | 浏览器 1h / CDN 24h |
| GET | `/api/v1/theme/{id}/wcag-fix.json?level=aa\|aaa` | 诊断 | WCAG 自动修复（APCA Lc 值 + HSL 亮度调整） | 浏览器 1h |
| GET | `/api/v1/events` | 智能轮询 | 主题变更智能轮询（替代 WebSocket/SSE） | 不缓存 |
| POST | `/api/v1/diy/fork.json` | 社区 | 复刻现有主题并提交修改 | 不缓存 |

### 演示页面

| 路径 | 说明 |
|------|------|
| `/weather-demo` | 天气感知演示 — 浏览器定位 + 实时天气视觉渲染（云/雨/雪/太阳） |
| `/lab` | 全场景 API 展厅 — 天气/纹理/高亮/缓动/WCAG 五合一联动 |
| `/theme-store` | 主题商店 — 浏览/搜索/筛选所有主题 |
| `/theme-builder` | 主题构建器 — 实时编辑 CSS 变量/自定义 CSS/Extensions |
| `/submit` | 社区投稿 — 三栏编辑器 + AI 生成 + LIVE SENSING 沙箱 |

### 获取今日主题

```bash
curl https://themedist.netlify.app/api/v1/today.json
```

**响应示例：**

```json
{
  "date": "2026-05-25",
  "generatedAt": "2026-05-25T08:41:18.181Z",
  "preset": "holiday-145",
  "presetName": "DONT PANIC",
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "layerContext": {
    "hasBackgroundOverlay": false,
    "hasInteractiveElements": false,
    "particleDensity": "medium",
    "safeWeatherZIndex": "var(--td-z-weather, 20)"
  },
  "cssVars": {
    "--color-primary": "#000080",
    "--color-secondary": "#4285F4",
    "--color-accent": "#4285f4",
    "--color-bg": "#00001a",
    "--color-surface": "#0f0f29",
    "--color-text": "#e6e6fa",
    "--color-text-muted": "#87ceeb",
    "--color-border": "rgba(66,133,244,0.18)",
    "--font-heading": "'Inter', system-ui, sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', monospace",
    "--text-base": "clamp(1rem, 0.9rem + 0.5vw, 1.125rem)",
    "--text-lg": "calc(var(--text-base) * 1.25)",
    "--text-xl": "calc(var(--text-lg) * 1.25)",
    "--text-2xl": "calc(var(--text-xl) * 1.25)",
    "--text-sm": "calc(var(--text-base) / 1.25)",
    "--space-unit": "0.25rem",
    "--space-1": "calc(0.25rem * 1)",
    "--space-2": "calc(0.25rem * 2)",
    "--space-3": "calc(0.25rem * 3)",
    "--space-4": "calc(0.25rem * 4)",
    "--space-6": "calc(0.25rem * 6)",
    "--space-8": "calc(0.25rem * 8)",
    "--space-12": "calc(0.25rem * 12)",
    "--radii": "0.75rem",
    "--content-max": "72rem",
    "--shadow-sm": "0 1px 2px rgba(0,0,0,0.08)",
    "--shadow-md": "0 4px 12px rgba(0,0,0,0.12)",
    "--shadow-lg": "0 12px 32px rgba(0,0,0,0.18)",
    "--glass-bg": "color-mix(in srgb, var(--color-bg) 85%, transparent)",
    "--glass-blur": "blur(16px)",
    "--noise-opacity": "0",
    "--ambient-1": "rgba(0,0,128,0.18)",
    "--ambient-2": "rgba(66,133,244,0.08)"
  },
  "customCss": "\n  .text-logo { font-weight: 900; }\n",
  "extensions": [
    { "type": "floating", "char": "🧻", "top": "15%", "left": "5%", "fontSize": "30px", "opacity": 0.3, "animation": "swing 4s ease-in-out infinite" }
  ],
  "logoText": "DONT PANIC",
  "logoColors": ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
  "available": 151,
  "directory": [
    { "preset": "yozakura-reverie", "name": "🌸 Yozakura", "primary": "#ff8fa3", "accent": "#ff8fa3", "logoText": "YOZAKURA" },
    { "preset": "arknights-babel-epic", "name": "ARKNIGHTS", "primary": "#2c3540", "accent": "#b34747", "logoText": "ARKNIGHTS" }
  ]
}
```

关键字段：

| 字段 | 说明 |
|------|------|
| `preset` | 主题预设 ID（如 `holiday-l01-01` 表示农历春节） |
| `presetName` | 主题显示名称 |
| `dailyIsCommunity` | `true` 表示今日主题来自社区投稿 |
| `apiVersion` | API 版本号，当前为 `"v1"` |
| `layerContext` | 图层元数据对象，供客户端智能决策渲染策略（见下方） |

#### `layerContext` 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `hasBackgroundOverlay` | boolean | 主题 `customCss` 中是否包含全屏 fixed/absolute 背景覆盖层 |
| `hasInteractiveElements` | boolean | 是否存在需要交互的特效元素 |
| `particleDensity` | string | 扩展密度等级：`none` / `low` / `medium` / `high` |
| `safeWeatherZIndex` | string | 推荐天气插件使用的 z-index 值（合约变量引用） |

其余字段：

| 字段 | 说明 |
|------|------|
| `cssVars` | 48 个 CSS 自定义属性键值对（6 组：Colors / Typography / Spacing / Effects / Ambient / Z-Index，含自动生成的 `-rgb` 通道变体） |
| `customCss` | 主题专属 CSS 动画（无自定义 CSS 时为空字符串 `""`） |
| `extensions` | 声明式装饰元素数组，支持 `floating`（安全浮动字符）和 `decorative`（经清洗的 HTML 片段）。始终为数组，无扩展时为空数组 `[]` |
| `clickEffect` | 声明式点击特效配置，含 `spawn` 数组。无特效时为 `null`。详见 [API 文档](https://themedist.vercel.app/api/docs#clickeffect-ref) |
| `logoText` | 主题 Logo 文字标识 |
| `logoColors` | Logo 渐变色 hex 字符串数组 |
| `available` | 可用主题总数（预设 + 社区） |
| `directory` | 主题目录列表，每项含 `preset` / `name` / `primary` / `accent` / `logoText` |
| `dailyIsCommunity` | `true` 表示今日主题来自社区投稿 |
| `appliedOverrides` | 仅在使用 `?overrides=` 查询参数时出现，值为 `true` |

### 获取今日主题（安全代理）

```bash
curl https://themedist-monitor.vercel.app/api/v1/today-safe
```

从 ThemeDist 代理获取最新 `today.json` 数据（**Vercel 优先，Netlify 备用**），经安全处理流水线（HTML 剥离 → XSS 扫描 → Schema 校验）后输出。下游主题渲染器可直接安全消费，无需自行处理输入净化。

**响应格式：** `application/json`

```json
{
  "date": "2026-05-25",
  "generatedAt": "2026-05-25T07:29:19.537Z",
  "preset": "holiday-145",
  "presetName": "DONT PANIC",
  "cssVars": { "--color-primary": "#000080", "--color-bg": "#00001a" },
  "customCss": "\n  .text-logo { font-weight: 900; }\n",
  "extensions": [{ "type": "floating", "char": "🧻", "top": "15%" }],
  "logoText": "DONT PANIC",
  "logoColors": ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
  "available": 151,
  "directory": [{ "preset": "yozakura-reverie", "name": "🌸 Yozakura" }],
  "dailyIsCommunity": false,
  "apiVersion": "v1",
  "layerContext": {
    "hasBackgroundOverlay": false,
    "hasInteractiveElements": false,
    "particleDensity": "medium",
    "safeWeatherZIndex": "var(--td-z-weather, 20)"
  },
  "_meta": {
    "sanitized": true,
    "schemaValid": true,
    "timestamp": "2026-05-25T08:24:52.742Z"
  }
}
```

关键字段：

| 字段 | 说明 |
|------|------|
| `_meta.sanitized` | `true` 表示所有字符串字段已完成 XSS 清洗（HTML 标签、事件处理器、`javascript:` 协议） |
| `_meta.schemaValid` | `true` 表示响应结构通过 schema 校验 |
| `_meta.fallback` | 仅回退时存在，`true` 表示当前主题校验失败，已回退至上次安全快照 |
| `_meta.reason` | 回退原因（如 `"Current theme failed validation"`） |
| `_meta.timestamp` | 代理处理时间戳 |

**异常处理：** 两个上游平台（Vercel、Netlify）均不可达时返回 `502 Bad Gateway`。安全扫描未通过时自动回退至 KV 中缓存的上次安全快照。

**XSS 清洗范围：** 移除 HTML 标签、事件处理器（`onerror`、`onload` 等）、`javascript:` 协议、CSS `expression()`。清洗后的数据可直接注入 DOM。

### 系统监控 API（themedist-monitor）

ThemeDist 提供独立的监控站点 [themedist-monitor](https://themedist-monitor.vercel.app/)，持续监控双平台健康状态与主题安全。以下为对外提供的 API：

#### 平台实时状态 — `/api/v1/status`

```bash
curl https://themedist-monitor.vercel.app/api/v1/status
```

返回双平台（Vercel / Netlify）实时状态、延迟、缓存命中率，以及最新主题快照。支持 CORS 跨域，含 OPTIONS 预检。缓存 30s。

**响应示例：**
```json
{
  "overall": "healthy",
  "platforms": {
    "vercel": { "status": "online", "latencyMs": 486, "cacheStatus": "MISS", "error": null },
    "netlify": { "status": "online", "latencyMs": 866, "cacheStatus": "HIT", "error": null }
  },
  "theme": { "date": "2026-05-25", "presetName": "DONT PANIC", "themeCount": 151, "isSafe": true },
  "checkedAt": "2026-05-25T08:23:28.072Z"
}
```

#### 综合仪表盘数据 — `/api/v1/data`

```bash
curl https://themedist-monitor.vercel.app/api/v1/data
```

返回完整仪表盘数据：平台状态、24h 延迟时序、SLA（7 天/30 天可用率）、CDN 命中率、性能日志、未解决告警、安全事件。缓存 30s。

**关键指标示例：**
```json
{
  "status": { "vercel": { "status": "online", "latencyMs": 890 }, "netlify": { "status": "online", "latencyMs": 1563 }, "db": "healthy" },
  "metrics": {
    "avgLatency24h": { "vercel": 1245, "netlify": 1829 },
    "cdnHitRate": 50,
    "themeCount": 151,
    "sla": {
      "vercel": { "d7": 90.24, "d30": 90.24 },
      "netlify": { "d7": 90.24, "d30": 90.24 }
    }
  },
  "alerts": { "unresolved": 1, "recent": 20 },
  "securityIncidents": 50,
  "metricsHistory": { "vercel": 28, "netlify": 28 },
  "timestamp": "2026-05-25T08:51:02.001Z"
}
```

#### 主题安全状态 — `/api/v1/security-status`

```bash
curl https://themedist-monitor.vercel.app/api/v1/security-status
```

返回当前主题的安全扫描结果。支持 CORS 跨域。

**响应示例：**
```json
{
  "status": "safe",
  "message": "Current theme is safe to use",
  "securityStatus": "safe",
  "flaggedReasons": [],
  "schemaValid": true,
  "themeName": "DONT PANIC",
  "checkedAt": "2026-05-25",
  "timestamp": "2026-05-25T08:41:20.915Z"
}
```

#### 其他监控端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/monitor` | GET, POST, DELETE | 触发全量监控检查（含限流/Cron鉴权） |
| `/api/v1/probe` | GET | 多区域拨测（Edge Runtime，Vercel Cron 06:00 UTC） |
| `/api/v1/telemetry` | POST | RUM 用户端页面加载耗时上报 |
| `/api/v1/alerts/resolve` | POST | 告警处理（单条或批量） |
| `/api/v1/badges/[type]` | GET | SVG 状态徽章（支持 vercel/netlify/theme/database/uptime） |
| `/api/v1/diagnose` | GET | 服务端网络连通性诊断（含限流） |
| `/api/v1/debug-kv` | GET | KV 存储读写测试（运维调试） |

> 完整监控 API 文档见 [themedist-monitor API 文档](https://themedist-monitor.vercel.app/api/v1/status)。

### 获取指定预设主题

```bash
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie.json
```

返回 365 天不可变缓存头（`immutable`）。

### 获取指定日期的主题

```bash
curl https://themedist.netlify.app/api/v1/date=02-14
```

按 `MM-DD` 格式指定日期，返回该日期的主题数据。响应格式与 `/api/v1/today.json` 一致。

日期的主题选取规则：农历节日 → 公历节日 → 疯狂星期四 → 社区主题（每 3 天轮入一次） → 每日主题池轮换。

### 在站点上预览指定日期的主题

```
/date=02-14
```

直接在 ThemeDist 站点上体验任意日期的主题。访问后自动将该日期的主题应用到整个站点，并持久化到 localStorage —— 之后再浏览站内其他页面（主题商店、构建器等），主题不会丢失。

点击顶栏的「回到今日主题」按钮即可恢复当日默认主题。

> 该功能可用于节日前预览效果，或给访客分享「看看你生日那天的主题」。

### 获取指定社区主题

```bash
curl "https://themedist.netlify.app/api/v1/diy/theme.json?id=La59KWMz"
```

返回完整社区主题数据（含作者、点赞数、标签等元信息），缓存 5 分钟。

### 获取构建时索引数据

```bash
curl https://themedist.netlify.app/api/v1/index-data.json
```

返回日池 ID 列表（当前 10 个预设）、97 个公历节日映射、38 个农历节日映射（农历→公历日期转换）和主题目录（前 20 个）。

**响应示例：**
```json
{
  "pool": ["yozakura-reverie", "arknights-babel-epic", "crimson-abyss", "abyss", "hyperspace-cinema", "retro-os-1995-ultimate", "retro-mirage", "cosmos-pro", "aurora-ethereal-pro", "flare"],
  "poolLength": 10,
  "totalThemes": 147,
  "gregorianHolidays": { "01-01": "holiday-01-01", "02-14": "holiday-02-14", "..." : "..." },
  "lunarHolidays": { "02-18": "holiday-l01-01", "..." : "..." },
  "directory": [{ "preset": "yozakura-reverie", "name": "🌸 Yozakura", "primary": "#ff8fa3", "..." : "..." }],
  "apiVersion": "v1"
}
```

### 社区主题投稿

```bash
curl -X POST https://themedist.netlify.app/api/v1/diy/submit.json \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Theme",
    "author": "Nickname",
    "cssVars": { "--color-primary": "#FF6B6B", "--color-bg": "#1a1a2e" },
    "customCss": "body { font-family: sans-serif; }",
    "extensions": [{ "type": "floating", "char": "✨" }],
    "tags": ["dark", "vibrant"]
  }'
```

必填字段：`name`、`author`、`cssVars`（必须包含 `--color-primary` 和 `--color-bg`）。
可选字段：`customCss`（最大 16KB）、`extensions`（最大 20 个，仅支持 `floating` 和 `decorative` 类型）、`clickEffect`（点击特效声明，详见 API 文档）、`tags`（最多 5 个）。

成功响应（201）：

```json
{
  "success": true,
  "theme": { "id": "abc12345", "name": "My Theme", ... },
  "warnings": ["不支持的类型 \"javascript\"，已自动移除。请改用 \"floating\" 或 \"decorative\"。"]
}
```

> **`warnings` 字段**：当提交的 extensions 包含不支持的类型（如 `"javascript"`）时，系统静默移除并在 `warnings` 中报告原因。不影响主题提交成功，但提醒用户扩展已被过滤。

主题提交后进入**审核队列**，管理员审核通过后发布至社区商店。

### 标签推荐

```bash
curl -X POST https://themedist.netlify.app/api/v1/diy/suggest-tags.json \
  -H 'Content-Type: application/json' \
  -d '{
    "cssVars": { "--color-primary": "#ff6b6b", "--color-bg": "#1a1a2e" },
    "customCss": "@keyframes drift { ... }",
    "extensions": [...],
    "presetName": "示例主题"
  }'
```

8 维度加权评分引擎，分析色彩（亮度/色相/多色协调）、字体（衬线/等宽/手写）、内容（中/英/日三语关键词）、结构（复杂度）、特效（动画/毛玻璃/扫描线/粒子）、Emoji 语义、WCAG 对比度、色调和谐度，覆盖 19 种标签（dark/light/warm/cool/vibrant/minimal/nature/tech/retro/holiday/space/ocean/animated/elegant/glass/seasonal/fantasy/industrial/community），返回最多 5 个带置信度和中文原因的标签建议。

响应（200）：

```json
{
  "tags": [
    { "tag": "dark", "confidence": 0.98, "reason": "背景亮度仅 0.01，属于深色主题" },
    { "tag": "warm", "confidence": 0.88, "reason": "主色色相 349° 位于暖色区间" },
    { "tag": "vibrant", "confidence": 0.74, "reason": "包含 3 个 @keyframes 动画" }
  ],
  "apiVersion": "v1"
}
```

### 社区主题列表（带标签筛选）

```bash
# 获取最新主题（分页）
curl "https://themedist.netlify.app/api/v1/diy/themes.json?sort=new&page=1&size=20"

# 按标签筛选
curl "https://themedist.netlify.app/api/v1/diy/themes.json?tag=dark"

# 获取最热主题
curl "https://themedist.netlify.app/api/v1/diy/themes.json?sort=hot"
```

查询参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `sort` | `new`（最新）/ `hot`（最热） | `new` |
| `page` | 页码 | `1` |
| `size` | 每页数量（最大 50） | `20` |
| `tag` | 按标签筛选（可选） | — |

### 社区主题点赞

```bash
curl -X POST https://themedist.netlify.app/api/v1/diy/like.json \
  -H 'Content-Type: application/json' \
  -d '{"id": "abc12345"}'
```

基于 IP + User-Agent + 客户端 UUID 三重去重，同一用户对同一主题只计一次。

### AI 生成主题

```bash
curl -X POST https://themedist.netlify.app/api/v1/ai/generate.json \
  -H 'Content-Type: application/json' \
  -d '{"description": "深色赛博朋克风，紫绿霓虹"}'
```

响应：

```json
{
  "name": "赛博霓虹",
  "cssVars": {
    "--color-primary": "#a78bfa",
    "--color-secondary": "#22d3ee",
    "--color-accent": "#f43f5e",
    "--color-bg": "#020617",
    "--color-surface": "#0a0a1a",
    "--color-text": "#e2e8f0",
    "--color-text-muted": "#64748b",
    "--color-border": "#1e293b"
  },
  "tags": ["dark", "tech", "vibrant"],
  "description": "AI 根据「深色赛博朋克风，紫绿霓虹」生成的配色方案",
  "generatedBy": "rule-engine"
}
```

> 推荐在提交页面使用客户端 DeepSeek 集成（自带 Key，浏览器直接调用 DeepSeek API），效果远优于规则引擎。详情见 [AI 主题生成](#ai-主题生成) 章节。

### 管理端接口

```bash
# 登录
curl -X POST https://themedist.netlify.app/api/v1/admin/login.json \
  -H 'Content-Type: application/json' \
  -d '{"account": "admin", "password": "your-password"}'

# 获取待审主题
curl https://themedist.netlify.app/api/v1/admin/review.json \
  -H 'Cookie: admin_session=...'

# 批量批准
curl -X POST https://themedist.netlify.app/api/v1/admin/review.json \
  -H 'Content-Type: application/json' \
  -H 'Cookie: admin_session=...' \
  -d '{"action": "approve", "ids": ["abc12345", "def67890"]}'

# Redis 健康检查
curl https://themedist.netlify.app/api/v1/admin/health.json
```

**健康检查响应：**
```json
{
  "redis": "connected",
  "pending": 6,
  "approved": 4,
  "apiVersion": "v1"
}
```

### 便捷工具接口

```bash
# Tailwind CSS 配置生成（含 RGB 通道 + <alpha-value> 支持）
curl https://themedist.netlify.app/api/v1/tailwind-config.json

# 今日主题调色盘 SVG 徽章（可嵌入 README / 博客）
curl https://themedist.netlify.app/api/v1/today/palette.svg

# 随机主题
curl https://themedist.netlify.app/api/v1/theme/random.json

# OG 社交分享卡片（1200×630 SVG）
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/og.svg
```

### 高级功能接口 (NEW)

```bash
# W3C DTCG 设计令牌导出
curl https://themedist.netlify.app/api/v1/tokens.json

# 动态 Favicon
curl https://themedist.netlify.app/api/v1/today/favicon.svg

# 自动字体注入（Google Fonts @import）
curl https://themedist.netlify.app/api/v1/today/fonts.css

# 颜色相似度搜索
curl "https://themedist.netlify.app/api/v1/search/color.json?hex=ff8fa3&limit=10"

# 智能推荐引擎
curl https://themedist.netlify.app/api/v1/recommend/yozakura-reverie.json

# 趋势排行榜
curl https://themedist.netlify.app/api/v1/trending.json

# GitHub 动态徽章（作者统计）
curl https://themedist.netlify.app/api/v1/badge/username.svg

# AI 逆向描述（分析主题→中文描述）
curl -X POST https://themedist.netlify.app/api/v1/ai/describe.json \
  -H 'Content-Type: application/json' \
  -d '{"cssVars":{"--color-primary":"#ff8fa3","--color-bg":"#030108"}}'

# 匿名遥测上报
curl -X POST https://themedist.netlify.app/api/v1/telemetry/hit \
  -H 'Content-Type: application/json' \
  -d '{"themeId":"yozakura-reverie","host":"example.com"}'

# 自定义轮换池 — 创建
curl -X POST https://themedist.netlify.app/api/v1/pool/create.json \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Pool","themeIds":["yozakura-reverie","abyss","flare"]}'

# 自定义轮换池 — 每日轮换查询
curl https://themedist.netlify.app/api/v1/pool/YOUR_POOL_ID.json
```

### 主题诊断与导出接口 (NEW)

```bash
# WCAG 无障碍诊断（对比度评估 + AA/AAA 合规检查）
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/wcag.json

# Tailwind 风格色阶生成（50~950，含 primary/secondary/accent/bg）
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/scale.json

# Shadcn UI 适配器（HSL 变量 + 前景色自动推断）
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/export/shadcn.css

# 图片取色（K-means 聚类 + UI 语义映射，零原生依赖）
curl -X POST https://themedist.netlify.app/api/v1/extract-theme.json \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"https://example.com/poster.jpg"}'

# Shiki / VS Code 代码高亮主题（TextMate Token 颜色映射）
curl https://themedist.netlify.app/api/v1/theme/yozakura-reverie/shiki.json

# 动态 SVG 背景纹理（主题色几何图案，可作 CSS background-image）
curl https://themedist.netlify.app/api/v1/today/pattern.css

# 天气粒子渲染脚本（云/雨/雪/太阳/闪电，自动定位 + 缓存）
curl https://themedist.netlify.app/api/v1/today/weather.js
```

### 环境感知接口 (NEW)

```bash
# 天气自适应主题（基于 IP 经纬度 + Open-Meteo 免费 API）
# 支持 ?lat=&lon= 查询参数覆盖 IP 检测，返回城市名 + 温度 + 天气类型
curl https://themedist.netlify.app/api/v1/weather-theme.json
curl "https://themedist.netlify.app/api/v1/weather-theme.json?lat=35.68&lon=139.76"

# 在线演示:
# /weather-demo — 天气感知演示页（浏览器定位 + 实时天气视觉渲染）
# /lab — 全场景 API 展厅（天气/纹理/高亮/缓动/WCAG 五合一联动演示）

# 系统状态覆盖主题（maintenance / mourning / incident）
curl "https://themedist.netlify.app/api/v1/status-override.json?status=maintenance"
```

### 查询参数

| 参数 | 适用于 | 说明 |
|------|--------|------|
| `?tz=America/New_York` | `today.json`, `today.css` | 按指定时区计算今日日期，如 `?tz=Asia/Shanghai` |
| `?overrides=--radii:0px;--font-body:monospace` | `today.json`, `today.css` | 微调 CSS 变量值，按 `;` 分隔，最多 20 对 |
| `?wcag-fix=aa\|aaa` | `today.json`, `today.css`, `wcag-fix.json` | 自动调整前景色以满足 WCAG 对比度标准（通过 HSL 亮度调整） |
| `?dual=true&mode=class\|data` | `today.json`, `today.css` | 返回亮色和暗色双主题变体；`mode=class` 输出 CSS 类，`mode=data` 输出 JSON |
| `?locale=hi-IN\|ja-JP\|en-US\|pt-BR` | `today.json` | 地区感知节日主题选择（hi-IN: 排灯节/洒红节; ja-JP: 节分/盂兰盆; en-US: 感恩节/独立日; pt-BR: 狂欢节/情人节） |
| `?mode=atmosphere` | `extract-theme.json` | 增强取色模式，包含基于情绪的动画生成 |

---

## CSS 变量参考

所有变量由 `GET /api/v1/today.json` 的 `cssVars` 字段返回，在 CSS 中直接使用 `var(--xxx)` 引用：

```css
.my-card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radii);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
}
```

### 颜色（8 变量）

| 变量 | 语义 |
|------|------|
| `--color-primary` | 品牌主色 |
| `--color-secondary` | 辅色 |
| `--color-accent` | 强调色 |
| `--color-bg` | 页面背景 |
| `--color-surface` | 卡片/面板背景 |
| `--color-text` | 正文颜色 |
| `--color-text-muted` | 次要文字 |
| `--color-border` | 边框（基于 accent 推导的 rgba） |

### 排版（8 变量）

| 变量 | 说明 |
|------|------|
| `--font-heading` | 标题字体栈 |
| `--font-body` | 正文字体栈 |
| `--font-mono` | 等宽字体栈 |
| `--text-base` | 基础字号（clamp 流式） |
| `--text-lg` | 大号（base × 1.25） |
| `--text-xl` | 特大号（lg × 1.25） |
| `--text-2xl` | 超大号（xl × 1.25） |
| `--text-sm` | 小号（base / 1.25） |

### 间距与布局（10 变量）

| 变量 | 说明 |
|------|------|
| `--space-unit` | 基础间距单元（0.25rem） |
| `--space-1` ~ `--space-12` | 间距梯度（unit × 1/2/3/4/6/8/12） |
| `--radii` | 统一圆角（0.75rem） |
| `--content-max` | 内容最大宽度（72rem） |

### 视觉效果（12 变量）

| 变量 | 说明 |
|------|------|
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | 三级阴影 |
| `--glass-bg` / `--glass-blur` | 毛玻璃背景色和模糊值 |
| `--noise-opacity` | 噪点纹理透明度（0 = 关闭） |
| `--ambient-1` / `--ambient-2` | 氛围光球颜色 |
| `--color-gradient-primary` | `linear-gradient(135deg, var(--color-primary), var(--color-secondary))` |
| `--color-gradient-accent` | `linear-gradient(135deg, var(--color-accent), var(--color-primary))` |
| `--color-gradient-bg` | `linear-gradient(180deg, var(--color-bg), var(--color-surface))` |
| `--color-gradient-ambient` | `radial-gradient(ellipse at 30% 50%, var(--ambient-1), transparent 70%)` |

### Z-Index 层级契约（4 变量）

所有主题动画和装饰层共用一套标准 z-index 变量，服务端自动将硬编码的 `z-index` 重写为合约变量引用：

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `--td-z-base` | `-10` | 底层环境：极光、全屏星空等背景覆盖层 |
| `--td-z-float` | `10` | 悬浮层：飘落的 Emoji、装饰粒子 |
| `--td-z-weather` | `20` | 天气层：官方天气脚本的确定插入层级 |
| `--td-z-fx` | `9999` | 瞬时特效层：点击涟漪、爆炸粒子 |

### RGB 通道变体

所有以 `--color-` 开头的 CSS 变量均自动附带 `-rgb` 通道变体，格式为逗号分隔的 `R, G, B`：

| 变量示例 | 值示例 |
|----------|--------|
| `--color-primary-rgb` | `66, 133, 244` |
| `--color-bg-rgb` | `15, 15, 41` |
| `--color-text-rgb` | `230, 230, 250` |
| `--color-border-rgb` | `66, 133, 244` |

### Tailwind CSS 集成

使用 RGB 通道变量配合 Tailwind 不透明度修饰符：

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
      },
    },
  },
};
```

或直接请求自动生成的配置：

```bash
curl https://themedist.netlify.app/api/v1/tailwind-config.json
```

### 暗色/亮色适配

`/api/v1/today.css` 自动根据今日主题的背景亮度输出 `@media (prefers-color-scheme: dark)` 或 `@media (prefers-color-scheme: light)` 适配块。
同时提供 `--color-bg-dark` / `--color-bg-light` / `--color-text-dark` / `--color-text-light` 便利变量。

---

## SDK / Web Component

ThemeDist 提供官方轻量化 Web Component `<themedist-runner>`，一行标签即可完成 CSS 变量注入、装饰渲染、缓存降级。

```html
<!-- 一行标签，全自动主题接入 -->
<themedist-runner api="https://themedist.netlify.app/api/v1/today.json" save-shadow="true"></themedist-runner>
<script src="https://themedist.netlify.app/sdk.js" defer></script>
```

**特性：**
- **CSS 变量**注入全局 `:root`，全站自动适配
- **装饰元素 + 自定义 CSS** 全部隔离在 Shadow DOM，`customCss` 不再注入 `document.head`
- **层叠隔离**：`:host` 使用 `isolation: isolate` + `--td-z-base` 合约变量，主题 z-index 不会逃逸
- **交互穿透**：`:host` 强制 `pointer-events: none`，装饰层不可阻挡宿主 UI 点击
- **localStorage 缓存**，同日访问零网络开销
- **网络降级**，fetch 失败时自动使用过期缓存
- **XSS 安全**，`textContent` 设置字符，`<template>` 安全解析 HTML

### SDK v3.0

`<themedist-runner>` Web Component 新增功能：

- `ThemeDistRunner.setPin('preset-id')` — 将访客锁定至指定主题
- `ThemeDistRunner.setMode('light'|'dark'|'auto')` — 手动切换亮色/暗色模式
- `<themedist-runner live>` — 智能轮询，实时获取主题更新
- 声音微交互（Web Audio API），通过声明式 `type: 'sound'` 扩展配置

### Framework SDKs

主流框架官方绑定（零运行时依赖）：

- `@themedist/react` — `ThemeProvider`、`useTheme()`、`useThemeCSSVars()`，SSR 安全
- `@themedist/vue` — Vue 3 Composition API，基于 `provide/inject`
- `@themedist/svelte` — 可写 Store + Context 模式

CLI 工具：`npx themedist init` 自动检测项目类型并生成集成配置。

### WCAG Auto-Fix & APCA Contrast

系统提供 WCAG 2.1 和 APCA（WCAG 3.0）双重对比度评估：

- `/api/v1/theme/{id}/wcag.json` 现已包含 APCA `Lc` 值（与 WCAG 对比度并列）
- `/api/v1/theme/{id}/wcag-fix.json?level=aa|aaa` 通过 HSL 亮度调整自动修复对比度问题
- 美观保护：亮度调整幅度上限为 ±25%，以保留设计意图
- 回退机制：当调整幅度不足时，自动生成 `--color-*-contrasted` 派生变量

### Dark/Light Dual-Theme System

单次 API 调用同时获取亮色和暗色变体：

```bash
curl "https://themedist.netlify.app/api/v1/today.json?dual=true"
# 返回: { light: {...}, dark: {...} }

curl "https://themedist.netlify.app/api/v1/today.css?dual=true&mode=class"
# 输出 .theme-light { ... } 和 .theme-dark { ... } CSS 块
```

暗色变体使用非线性饱和度降低（15%）和高质感深灰背景（L=0.05），避免视网膜疲劳。

### Smart Polling (Real-time Updates)

ThemeDist 使用智能轮询替代 WebSocket/SSE（serverless 环境不支持）：

- `/api/v1/events` 返回 `nextPoll` 间隔（UTC 午夜附近 10s，状态覆盖期间 30s，正常情况 5min）
- SDK v3.0 通过 `live` 属性支持自动轮询
- 状态覆盖变更在 30 秒内可被检测到

### i18n Holiday Pools

通过 `?locale=` 参数获取地区专属节日主题：

- `hi-IN` — 排灯节（Diwali）、洒红节（Holi）
- `ja-JP` — 节分（Setsubun）、盂兰盆节（Obon）
- `en-US` — 感恩节（Thanksgiving）、独立日（Independence Day）
- `pt-BR` — 狂欢节（Carnival）、情人节（Dia dos Namorados）

### Theme Forking

用户可以复刻现有主题并提交修改：

```bash
curl -X POST https://themedist.netlify.app/api/v1/diy/fork.json \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"holiday-0214","name":"My Valentine Fork","overrides":{"--color-primary":"#ff6b6b"}}'
```

---

## 天气粒子渲染

ThemeDist 提供独立的天气粒子渲染脚本，可通过 `<script src>` 引入，自动获取用户地理位置并渲染对应的天气视觉特效（云层/雨滴/雪花/太阳/闪电）。

```html
<!-- 一行引入，自动渲染天气粒子 -->
<script src="https://themedist.netlify.app/api/v1/today/weather.js" defer></script>
```

**特性：**
- **自动定位** — 浏览器 Geolocation API 优先，IP fallback
- **sessionStorage 缓存** — 30 分钟 TTL，减少 API 请求
- **prefers-reduced-motion** — 尊重系统无障碍设置
- **移动端自适应** — 减少粒子密度，降低性能开销
- **纯 CSS 动画** — 云 drift / 雨 fall / 雪 snowfall+sway / 太阳 rotate / 闪电 flash
- **DOM 安全** — `DocumentFragment` 批量插入，`textContent` 设置字符，零 innerHTML

---

## Extensions 扩展元素

`extensions` 是一个声明式装饰元素数组，每个元素无需执行脚本即可安全渲染。支持两种类型：

### `floating` — 浮动字符

通过 `document.createElement('div')` 创建，绝无 innerHTML。适合 emoji / 字符装饰：

```json
{ "type": "floating", "char": "🪷", "top": "20%", "left": "5%", "fontSize": "30px", "opacity": 0.3, "animation": "swing 4s ease-in-out infinite" }
```

| 字段 | 必填 | 限制 |
|------|------|------|
| `type` | 是 | `"floating"` |
| `char` | 是 | ≤ 4 个 Unicode 码点 |
| `top/left/right/bottom` | 否 | CSS 尺寸 (px/%/em/rem/vh/vw) |
| `fontSize` | 否 | CSS 尺寸 |
| `opacity` | 否 | 0.0 ~ 1.0，自动 clamp |
| `animation` | 否 | CSS animation 值，XSS 清洗 |
| `zIndex` | 否 | -1 ~ 99999 |

### `decorative` — 装饰 HTML

使用 `<template>` + `DocumentFragment` 安全解析，渲染前剥离 `on*` 事件、`<script>`、`<iframe>`、`javascript:` 协议：

```json
{ "type": "decorative", "html": "<div class=\"particle-layer\"><span class=\"sparkle\" style=\"left:12vw;animation-delay:-3s\"></span></div>" }
```

> **不支持 JavaScript 类型**：`"type": "javascript"` 因安全原因不被支持。提交时会被移除并在 API 响应的 `warnings` 中报告。请将 JS 逻辑转为 `decorative` HTML + `customCss` CSS 动画。

### 自动粒子生成

系统会从 `customCss` 中解析含 `animation` 的 CSS 类，自动生成 DOM 粒子元素（数量根据类名启发式决定：particle/dot/orb/bubble/spark/star → 20，float/drift/sway → 12，rain/snow/fall → 30，其他 → 8）。如已在 `extensions` 中手动声明该类元素，系统自动跳过以避免重复。

---

## 主题轮换策略

主题由 Astro SSR 端点 `src/pages/api/v1/today.json.ts` 根据服务器日期实时计算，无需定时构建。选择逻辑集中在一处，双平台完全一致。

选择优先级：

1. **农历节日优先** 🏮 — `OmniConfig.getThemeConfig('auto')` 运行时通过 `Lunar.fromDate()` 直接计算当前农历日期，匹配 35+ 农历节日（春节、元宵、端午、中秋、重阳等）
2. **公历节日其次** 📅 — 匹配元旦、情人节、Pi Day、圣诞等公历节日（来自 OmniConfig 配置）
3. **Crazy Thursday** 🍗 — 每周四的特殊覆盖主题
4. **社区主题轮换** 👥 — 约 30% 天数（每 3 天）从已审核社区主题池中按 `dayOfYear % count` 选中一个作为今日主题
5. **每日池兜底** 🎲 — 按 `dayOfYear % poolLength` 从日池主题中轮选

节日主题可附带 `customCss`（专属 CSS 动画）和 `extensions`（声明式装饰元素，如浮动 emoji、特效层等）。

### 农历节日处理流程

```
运行时 (Astro SSR — src/pages/api/v1/today.json.ts)
  └─ getDailyTheme() → OmniConfig.getThemeConfig('auto')
  └─ Lunar.fromDate(new Date()) → 获取当前农历月日
  └─ 遍历 config.holidays 中的 Lxx-xx 键进行匹配
  └─ 命中 → 返回对应农历节日主题（含 customCss、extensions）
```


---

## AI 主题生成

ThemeDist 提供两级 AI 主题生成能力，帮助用户快速创建配色方案。

### 客户端 DeepSeek 集成（推荐）

用户自带 DeepSeek API Key，在浏览器中直接调用 DeepSeek API，**Key 从不经过本服务器**：

```
用户输入描述 → 浏览器 fetch api.deepseek.com → 解析 JSON → 填入编辑器
```

- API Key 仅存储在 `localStorage` 中，隐私声明在 UI 中明确展示
- Key 格式校验（`sk-` 前缀），状态指示器显示已设置/未设置
- 使用 `deepseek-v4-flash` 模型，定制系统 prompt 输出结构化主题数据

### 服务端规则引擎（降级方案）

未设置 DeepSeek Key 时自动降级为内置规则引擎：
- 8 套预设色板（暗色/亮色/海洋/日落/森林/午夜/樱花/赛博）
- 基于关键词匹配（中英文，如"森林""ocean""赛博"）
- 文本长度哈希混入色相偏移，同一描述每次生成一致

---

## 主题分类与标签

所有主题携带预计算或用户指定的分类标签，支持按标签浏览筛选。

### 标签体系

| 标签 | 说明 | 来源 |
|------|------|------|
| `dark` / `light` | 深色/浅色模式 | 自动推断（背景亮度） |
| `warm` / `cool` | 暖色系/冷色系 | 自动推断（主色色相） |
| `vibrant` / `minimal` | 鲜艳/极简 | 自动推断（主色饱和度） |
| `holiday` | 节日主题 | 预设数据标记 |
| `community` | 社区投稿 | 自动标记 |
| `nature` / `tech` / `retro` | 自然/科技/复古 | 社区提交时指定或 AI 推断 |

### 社区主题标签

- 提交时可附带标签（通过 `tags: ["dark", "vibrant"]` 字段）
- 未指定标签时自动根据 CSS 变量推断
- 主题商店社区标签页支持按标签筛选

---

## 项目结构

```
themeDist/
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Actions：定时（每月 1 号）+ 手动触发，构建并部署到 Netlify
├── astro.config.mjs                    # Astro 配置（SSR + ADAPTER 环境变量切换 Vercel/Netlify）
├── vercel.json                         # Vercel 部署 + CORS 头
├── netlify.toml                        # Netlify 部署 + CORS 头
├── package.json                        # 依赖与脚本
├── tsconfig.json                       # TypeScript 配置
├── public/
│   └── favicon.svg                     # 站点图标
├── docs/
│   └── agents/                         # 领域文档与工作流定义
└── src/
    ├── env.d.ts                        # Astro TypeScript 客户端类型引用
    ├── layouts/
    │   └── Layout.astro                # 全局布局：导航、氛围背景、主题注入、Toast 通知
    ├── lib/
    │   ├── redis.ts                    # Upstash Redis 封装（set/get/zadd/zrevrange 等，带优雅降级）
    │   ├── auth.ts                     # 管理员认证（Cookie 会话 + CSRF Token）
    │   ├── themes-db.ts               # 社区主题 CRUD（提交/审核/点赞/列表，Redis 持久化）
    │   ├── cache.ts                    # 内存缓存（today 2min / community 5min TTL，减少 Redis 穿透）
    │   └── fallback.ts                # 静态兜底主题注册表（Redis 全挂时使用）
    ├── middleware.ts                    # Astro 中间件（投稿/点赞滑动窗口限流）
    ├── pages/
    │   ├── index.astro                 # 首页：Hero、三步接入、功能展示、代码示例、智能天气氛围叠加
    │   ├── weather-demo.astro         # 天气感知演示页（浏览器定位 + 实时天气视觉渲染）
    │   ├── lab.astro                  # 全场景 API 展厅（5 模块联动演示）
    │   ├── theme-builder.astro         # 主题构建器：CSS 变量/自定义 CSS/Extensions 三栏编辑，实时校验，智能格式化，图片取色
    │   ├── theme-store.astro           # 主题商店：浏览/搜索/分类/标签筛选/社区标签页
    │   ├── submit.astro                # 社区投稿：三栏编辑器 + AI 生成（DeepSeek 客户端集成），extensions 实时校验 + 提交后 warnings
    │   ├── share.astro                 # 主题分享页：详情、点赞、复制链接、视口切换预览，iframe 沙箱 extensions 自动生成
    │   ├── admin/
    │   │   └── index.astro             # 管理后台：登录面板 + 审核列表（含扩展类型指示）
    │   └── api/
    │       ├── docs.astro
    │       ├── spec.astro
    │       └── v1/
    │           ├── today.json.ts           # ★ GET 今日主题（Astro SSR 动态端点，双平台统一入口）
    │           ├── today.css.ts            # ★ GET 今日主题 CSS（阻塞式 <link> 引入，消除 FOUC）
    │           ├── index-data.json.ts      # ★ 构建时数据快照（日池 ID、公历+农历节日映射、目录）
    │           ├── [param].ts              # GET 指定日期主题（/api/v1/date=MM-DD）
    │           ├── weather-theme.json.ts   # GET 天气自适应主题（双平台 geo + Open-Meteo）
    │           ├── status-override.json.ts # GET 系统状态覆盖（maintenance/mourning/incident）
    │           ├── tokens.json.ts          # GET W3C DTCG 设计令牌导出
    │           ├── tailwind-config.json.ts # GET Tailwind CSS 配置生成
    │           ├── trending.json.ts        # GET 趋势排行榜
    │           ├── extract-theme.json.ts   # POST 图片取色（K-means + UI 语义映射）
    │           ├── theme/
    │           │   ├── [preset].json.ts    # GET 指定预设/社区主题
    │           │   ├── random.json.ts      # GET 随机主题
    │           │   └── [id]/
    │           │       ├── og.svg.ts       # GET OG 社交分享卡片
    │           │       ├── wcag.json.ts    # GET WCAG 无障碍诊断
    │           │       ├── scale.json.ts   # GET 色阶生成
    │           │       ├── shiki.json.ts   # GET Shiki 代码高亮主题
    │           │       └── export/
    │           │           └── shadcn.css.ts # GET Shadcn UI 适配器
    │           ├── today/
    │           │   ├── palette.svg.ts      # GET 调色盘 SVG 徽章
    │           │   ├── favicon.svg.ts      # GET 动态 Favicon
    │           │   ├── fonts.css.ts        # GET 自动字体注入
    │           │   └── pattern.css.ts      # GET 动态 SVG 背景纹理
    │           ├── search/
    │           │   └── color.json.ts       # GET 颜色相似度搜索
    │           ├── recommend/
    │           │   └── [preset].json.ts    # GET 智能推荐引擎
    │           ├── badge/
    │           │   └── [username].svg.ts   # GET GitHub 动态徽章
    │           ├── telemetry/
    │           │   └── hit.ts              # POST 匿名遥测上报
    │           ├── pool/
    │           │   ├── create.json.ts      # POST 创建自定义轮换池
    │           │   └── [poolId].json.ts    # GET 轮换池每日查询
    │           ├── admin/
    │           │   ├── login.json.ts       # POST 登录/登出
    │           │   ├── review.json.ts      # GET 待审列表 / POST 批量审核
    │           │   └── health.json.ts      # GET Redis 健康状态
    │           ├── diy/
    │           │   ├── submit.json.ts      # POST 提交社区主题（含标签）
    │           │   ├── themes.json.ts      # GET 社区主题列表（分页 + 标签筛选）
    │           │   ├── theme.json.ts       # GET 单个社区主题
    │           │   └── like.json.ts        # POST 点赞（IP+UA+客户端UUID 三重去重）
    │           └── ai/
    │               └── generate.json.ts    # POST AI 主题生成（规则引擎，DeepSeek Key 由客户端直调）
    ├── api/
    │   └── index_config.js             # ★ 核心主题数据库：全部节日规则、日池主题、轮换逻辑（源自 OMNI-MATRIX）
    ├── themes/
    │   └── types.ts                    # 核心类型定义（ComposedTheme, ThemeExtension, ThemeTag）
    └── utils/
        ├── daily-theme.ts              # 统一导出入口（转发 omni-bridge 方法）
        ├── omni-bridge.ts              # ★ 唯一主题管道：OmniConfig/社区主题 → ComposedTheme 转换
        ├── color.ts                    # 颜色数学工具（hex↔RGB 转换、HSL、对比度、色插值）
        └── sanitize.ts                 # 输入净化（去 HTML 标签/CSS expression/@import/url()）
```

---

## 架构说明

### 单一主题管道

**OmniConfig（数据源）** — `src/api/index_config.js` 包含全部节日规则（公历 90+ 条 + 农历 35+ 条，含二十四节气）、日池主题（10 套）和轮换逻辑。源自独立项目 OMNI-MATRIX，以纯数据格式存储。

**ComposedTheme（统一输出）** — 所有主题（OmniConfig 预设、社区投稿、AI 生成）通过 `omni-bridge.ts` 转换为唯一的 `ComposedTheme` 格式，确保 API 输出的一致性和类型安全。无论来源，输出的 `cssVars`、`extensions`、`tags` 等字段结构完全对齐。

### 每日主题选择流程

```
GET /api/v1/today.json（Vercel + Netlify 统一路由）
  │
  └─ Astro SSR 端点: src/pages/api/v1/today.json.ts
       │
       ├─ 1. getDailyCommunityTheme()
       │     ├─ 检查 Redis 可用性
       │     ├─ dayOfYear % 3 === 2 → 从 td:themes:by_newest 选取社区主题
       │     └─ 否则 → null（不覆盖预设）
       ├─ 2. getDailyTheme()（OmniConfig.getThemeConfig('auto')）
       │     ├─ 通过 Lunar.fromDate() 检查农历节日
       │     ├─ 匹配公历节日（MM-DD）
       │     ├─ 星期四是 Thursday → Crazy Thursday 主题
       │     └─ 否则 → dailyPool[dayOfYear % poolLength] 日池轮换
       ├─ 3. 社区主题优先于预设（communityDaily || dailyTheme）
       ├─ 4. 获取完整目录（预设 20 + 社区 10）
       └─ 5. 返回 JSON（含 cssVars, directory, available 等）
              └─ 失败时 → 500 + JSON error
```

双端（Vercel / Netlify）运行完全相同的代码路径，主题选择结果一致。


### 社区主题生命周期

```
用户投稿 → status: pending（存入审核队列）
  → 管理员 approved → 进入公共池（by_newest + by_likes 有序集合）立即可见
  → 点赞数据实时同步至排行榜
  → 社区主题可被每日轮换选中（约 30% 天数）
```

点赞去重：基于 IP + User-Agent 前 64 字符 + 客户端 UUID（`localStorage` 持久化，首次访问生成）的三重哈希，存储于 Redis Set，确保同一用户对同一主题只计一次。NAT 环境下共享 IP 的用户因持有不同客户端 UUID，不会互相阻塞。

### 缓存策略

| 端点 | 浏览器 | CDN |
|------|--------|-----|
| `/api/v1/today.json` | 1 小时 (`max-age=3600`) | 24 小时 + 1h 降级 (`s-maxage=86400, stale-while-revalidate=3600`) |
| `/api/v1/theme/*.json`（预设） | 24 小时 | 365 天（`immutable`） |
| `/api/v1/theme/community-*.json` | 1 小时 (`max-age=3600`) | 不使用 CDN 缓存 |
| `/api/v1/index-data.json` | 1 小时 (`max-age=3600`) | 24 小时 (`s-maxage=86400`) |
| `/api/v1/today/weather.js` | 1 小时 (`max-age=3600`) | 24 小时 (`s-maxage=86400`) |
| `/api/v1/diy/theme.json?id=` | 5 分钟 (`max-age=300`) | 不使用 CDN 缓存 |
| `/api/v1/diy/themes.json` | 1 分钟 (`max-age=60`) | 不使用 CDN 缓存 |
| `/api/v1/diy/submit.json` | 不缓存（POST） | 不使用 CDN 缓存 |
| `/api/v1/diy/like.json` | 不缓存（POST） | 不使用 CDN 缓存 |
| `/api/v1/ai/generate.json` | 不缓存 | 不使用 CDN 缓存 |
| `/api/v1/admin/*` | 不缓存 | 不使用 CDN 缓存 |

### 客户端缓存

| 数据 | 存储 | TTL | 说明 |
|------|------|-----|------|
| 社区主题列表 | sessionStorage | 5 分钟 | 命中缓存时瞬间渲染，后台静默拉取 |
| 提交记录状态 | localStorage | 10 分钟 | 缓存 DB 状态（收录中/已过期） |
| 今日主题 | localStorage | 至次日 | 集成方推荐实现，含降级回退 |
| 点赞状态 | localStorage | 永久 | 客户端防重复点击 |

### 优雅降级

- **Redis 不可用** — 所有社区功能（投稿、点赞、审核、列表）返回空数据或 503，`dbAvailable` 标记为 `false`。客户端缓存确保已加载数据仍可见
- **每日主题分发** — Redis 不可用时社区主题自动降级为纯日池轮换 + 节假日逻辑，不影响 `/api/v1/today.json` 输出
- **AI 生成降级** — DeepSeek Key 未设置时自动降级为内置规则引擎，无需任何外部依赖
- **客户端降级** — 所有列表页优先展示缓存数据，请求失败时缓存内容持续可见

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | [Astro](https://astro.build/) 6.x（SSR 模式） |
| **部署适配器** | `@astrojs/vercel` + `@astrojs/netlify`（通过 `ADAPTER` 环境变量切换） |
| **运行时** | Node.js（ES Modules） |
| **样式方案** | CSS 自定义属性（完全主题驱动，零 CSS 框架依赖） |
| **数据库** | [Upstash Redis](https://upstash.com/)（Serverless Redis，HTTPS REST API） |
| **AI 引擎** | DeepSeek API（用户自带 Key，浏览器端直调，不经服务器）或内置规则引擎 |
| **农历计算** | `lunar-javascript`（构建时使用，运行时通过预计算映射检索） |
| **ID 生成** | `nanoid`（8 字符） |
| **前端交互** | 原生 JavaScript（无前端框架依赖） |
| **部署目标** | Vercel + Netlify 双平台（Astro SSR 运行时计算） |
| **CI/CD** | GitHub Actions（push 时部署 Netlify，cron/manual 并行部署双平台）；Vercel Git Integration（push 自动部署） |
| **对比度算法** | APCA 0.98G-4g（WCAG 3.0 候选标准） |
| **声音交互** | Web Audio API（声明式声音微交互） |
| **设计工具** | Figma Plugin API（设计工具集成） |

---

## 本地开发

### 前置条件

- Node.js 18+
- npm 9+
- （可选）Upstash Redis 实例（不配置时社区功能降级为只读）
- （可选）DeepSeek API Key（AI 生成使用，在页面中直接配置，服务器不需要）

### 安装与运行

```bash
git clone <repo-url>
cd themeDist

npm install
npm run dev
# 访问 http://localhost:4321
```

构建命令：

```bash
npm run build                    # 默认 Vercel 适配器
ADAPTER=netlify npm run build    # Netlify 适配器

npm run preview                  # 预览生产构建
```

### 本地环境变量

创建 `.env.local` 文件：

```env
ADMIN_ACCOUNT=admin
ADMIN_PASSWORD=your-secure-password
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=your-token
KV_URL=rediss://default:your-token@xxx.upstash.io:6379
```

> `KV_URL` 与 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 二选一即可，底层都是 Upstash Redis。

---

## 部署

项目支持 **Vercel** 和 **Netlify** 双平台同时部署，同一份 `main` 分支代码自动适配两个平台。

### 双平台适配原理

`astro.config.mjs` 通过环境变量 `ADAPTER` 在构建时切换适配器：

```js
const adapter = process.env.ADAPTER === 'netlify' ? netlify() : vercel();
```

- **Vercel**：默认（不设 `ADAPTER`），使用 `@astrojs/vercel`
- **Netlify**：构建时注入 `ADAPTER=netlify`，使用 `@astrojs/netlify`

### Vercel

1. 推送仓库到 GitHub
2. 在 Vercel 中导入项目（Framework 自动检测为 Astro）
3. 在 Vercel Dashboard 设置环境变量
4. `/api/v1/today.json` 由 Astro SSR 端点（`src/pages/api/v1/today.json.ts`）动态处理，Vercel 与 Netlify 使用相同的代码路径。

### Netlify

采用 **GitHub Actions 自动构建并部署**到 Netlify 的方式。`/api/v1/today.json` 由 Astro SSR 端点统一处理。

**触发方式：**

| 事件 | 说明 |
|------|------|
| `push` (branches: `main`) | 推送即部署 Netlify（与 Vercel Git Integration 同步） |
| `schedule` (cron: `0 0 1 * *`) | 每月 1 号 UTC 午夜重建（刷新农历映射、预渲染数据）并并行部署双平台 |
| `workflow_dispatch` | GitHub 页面手动触发，并行部署双平台 |

> 主题每日轮换由 Astro SSR 实时计算，无需定时重建。每月重建仅用于刷新农历→公历日期映射和预渲染快照。

**GitHub Secrets 配置：**

| Secret | 说明 | 获取位置 |
|--------|------|---------|
| `NETLIFY_AUTH_TOKEN` | Netlify 个人访问令牌 | Netlify User settings → Personal access tokens |
| `NETLIFY_SITE_ID` | Netlify 站点 ID | Netlify Site settings → General → Site ID |
| `URL` | 站点公开 URL | `https://your-site.netlify.app` |

**Netlify Runtime 环境变量：**

Netlify Dashboard → Site settings → Environment variables → 添加：

| 变量 | 必填 | 说明 |
|------|------|------|
| `KV_REST_API_URL` | 是 | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | 是 | Upstash Redis 访问令牌 |
| `ADMIN_ACCOUNT` | 是 | 管理员用户名 |
| `ADMIN_PASSWORD` | 是 | 管理员密码 |
| `URL` | 是 | 站点公开 URL |

### 环境变量对照

| 变量 | Vercel | Netlify | 本地开发 |
|------|--------|---------|---------|
| `ADMIN_ACCOUNT` | 手动设置 | 手动设置 | `.env.local` |
| `ADMIN_PASSWORD` | 手动设置 | 手动设置 | `.env.local` |
| `URL` | 手动设置 | 手动设置 | 不强制 |
| `KV_REST_API_URL` | Vercel KV 自动注入 | 手动设置 | `.env.local` |
| `KV_REST_API_TOKEN` | Vercel KV 自动注入 | 手动设置 | `.env.local` |
| `OPENAI_API_KEY` | 可选（服务端降级用） | 可选（服务端降级用） | `.env.local`（可选） |

> **注意**：Vercel KV 本质是 Upstash Redis。Netlify 上需手动设置 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`，值与 Vercel 自动注入的 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 一致。代码同时兼容 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 命名（优先级更高）。
>
> **AI 密钥说明**：`OPENAI_API_KEY` 仅作为服务端规则引擎的增强备选，非必需。推荐用户在提交页面使用客户端 DeepSeek 集成（自带 Key，浏览器直调 DeepSeek API，不经本服务器）。

---

## 未来计划

| 功能 | 说明 | 状态 |
|------|------|------|
| **社区主题纳入每日轮换池** | 社区主题有机会被 `/api/v1/today.json` 选中（约 30% 天数） | ✅ 已完成 |
| **社区主题投稿与审核** | 投稿后进入待审队列，管理员审核通过后发布 | ✅ 已完成 |
| **XSS 安全防护** | CSS/HTML 注入过滤（@import/url()/expression/事件处理器），声明式扩展渲染 | ✅ 已完成 |
| **CSRF 保护** | 管理员写操作需 Double Submit Cookie 校验 | ✅ 已完成 |
| **主题分类与标签** | 支持为主题添加标签（暗色/亮色/节日/极简等），按分类浏览 | ✅ 已完成 |
| **AI 辅助主题生成** | 根据文字描述，通过 DeepSeek（客户端直调）或规则引擎生成主题 | ✅ 已完成 |
| **客户端缓存优化** | sessionStorage（5min TTL）+ localStorage（10min TTL）减少重复请求 | ✅ 已完成 |
| **LIVE SENSING 沙箱** | 提交页 16:9 比例全屏沙箱实时预览 | ✅ 已完成 |
| **双平台同步部署** | 一套代码自动部署 Vercel + Netlify 双平台 | ✅ 已完成 |
| **农历节日支持** | 35+ 农历节日，OmniConfig 运行时通过 Lunar.fromDate() 计算 | ✅ 已完成 |
| **系统监控台** | themedist-monitor 独立监控站点，11 个 API 端点覆盖状态/安全/告警/拨测/徽章 | ✅ 已完成 |
| **Shadcn UI 适配器** | HSL 变量转换 + 前景色自动推断 | ✅ 已完成 |
| **WCAG 无障碍诊断** | 对比度评估 + AA/AAA 合规检查 | ✅ 已完成 |
| **色阶生成** | 黑白插值法 Tailwind 风格 50~950 色阶 | ✅ 已完成 |
| **天气自适应主题** | Open-Meteo 免费 API + IP 地理位置 | ✅ 已完成 |
| **系统状态覆盖** | maintenance / mourning / incident 主题覆盖 | ✅ 已完成 |
| **图片取色 API** | K-means 聚类提取 + UI 语义映射，纯 JS 零原生依赖 | ✅ 已完成 |
| **Shiki 代码高亮主题** | TextMate Token 颜色映射，VS Code / Shiki 兼容 | ✅ 已完成 |
| **动态 SVG 纹理** | 主题色生成几何图案 CSS background-image | ✅ 已完成 |
| **全场景 API 展厅** | /lab 页面，5 模块联动演示 | ✅ 已完成 |
| **WCAG 自动修复** | HSL 亮度调整自动修复对比度问题，亮度调整上限 ±25% | ✅ 已完成 |
| **APCA 对比度评估** | APCA 0.98G-4g（WCAG 3.0 候选标准）Lc 值计算 | ✅ 已完成 |
| **暗色/亮色双主题** | `?dual=true` 单次调用返回 light + dark 变体，支持 class/data 模式 | ✅ 已完成 |
| **智能轮询** | `/api/v1/events` 替代 WebSocket/SSE，动态调整轮询间隔 | ✅ 已完成 |
| **访客主题锁定/切换** | `setPin()` / `setMode()` SDK 方法，用户可锁定或手动切换主题 | ✅ 已完成 |
| **i18n 节日池** | `?locale=` 参数支持 hi-IN / ja-JP / en-US / pt-BR 地区专属节日 | ✅ 已完成 |
| **主题复刻** | 用户可 fork 现有主题并提交修改 | ✅ 已完成 |
| **内容审核** | 基于规则的自动内容审核（`/api/v1/admin/moderate.json`） | ✅ 已完成 |
| **分层限流 / API 密钥** | `/api/v1/admin/api-keys.json` 密钥管理，分层速率限制 | ✅ 已完成 |
| **渐变变量** | `--color-gradient-primary/accent/bg/ambient` 四个渐变 CSS 变量 | ✅ 已完成 |
| **声音微交互** | Web Audio API 声明式声音效果（`type: 'sound'` 扩展） | ✅ 已完成 |
| **Edge 中间件 FOUC 消除** | Astro 中间件注入 `<link>` 预加载 CSS 变量，消除无样式闪烁 | ✅ 已完成 |
| **React / Vue / Svelte SDKs** | `@themedist/react`、`@themedist/vue`、`@themedist/svelte` 官方框架绑定 | ✅ 已完成 |
| **CLI 工具** | `npx themedist init` 自动检测项目类型并生成集成配置 | ✅ 已完成 |
| **Figma 插件** | Figma Plugin API 设计工具集成 | ✅ 已完成 |
| **Atmosphere 取色模式** | `?mode=atmosphere` 增强取色，含基于情绪的动画生成 | ✅ 已完成 |
| **RSS / Webhook 通知** | 每日主题更新后推送通知 | 待规划 |
| **多管理员支持** | 审核权限分离，支持多个管理员账号协同操作 | 待规划 |
| **主题使用统计** | 各主题被 API 请求的次数、点赞趋势等可视化数据 | 待规划 |
| **设计令牌导出** | W3C DTCG 规范 JSON 导出 | ✅ 已完成 |
| **动态 Favicon** | 主色 SVG 图标 | ✅ 已完成 |
| **颜色相似度搜索** | RGB 欧几里得距离排序 | ✅ 已完成 |
| **智能推荐引擎** | Jaccard + 颜色距离加权 | ✅ 已完成 |
| **匿名遥测** | HyperLogLog + Sorted Set | ✅ 已完成 |
| **趋势排行榜** | 热度聚合 Top 20 | ✅ 已完成 |
| **自定义轮换池** | 创建/轮换双端点 | ✅ 已完成 |
| **自动字体注入** | Google Fonts @import | ✅ 已完成 |
| **GitHub 动态徽章** | shields.io 风格 | ✅ 已完成 |
| **AI 逆向描述** | CSS→中文风格分析 | ✅ 已完成 |
| **API 速率限制** | 投稿/点赞接口滑动窗口限流（投稿 3次/分钟，点赞 10次/分钟），超限 429 | ✅ 已完成 |
| **Extensions 类型支持** | 支持 `floating`（浮动字符）和 `decorative`（装饰 HTML），`javascript` 类型拒绝并返回 warnings | ✅ 已完成 |
| **智能格式化** | theme-builder 各编辑器独立格式化按钮，智能检测当前 tab 格式化对应内容 | ✅ 已完成 |
| **Extensions 实时校验** | submit + theme-builder 两端实时检测不支持类型并提示，提交后 warnings 展示 | ✅ 已完成 |
| **存储格式归一化** | `extensions` 字段统一为 `null` 或数组（不再出现 `undefined`），JSON 始终完整 | ✅ 已完成 |
| **渲染一致性** | share 页 iframe、首页 Apply、theme-builder 预览、submit 预览四路径 extensions 渲染逻辑统一 | ✅ 已完成 |
| **SDK / Web Component** | 官方轻量化 `<themedist-runner>` 自定义元素，Shadow DOM 隔离装饰，一行标签接入 | ✅ 已完成 |
| **Tailwind CSS 原生适配** | RGB 通道变量 + `/api/v1/tailwind-config.json` 一键生成 Tailwind 配置 | ✅ 已完成 |
| **暗色/亮色协同适配** | `/api/v1/today.css` 自动输出 `@media (prefers-color-scheme)` 适配块 | ✅ 已完成 |
| **时区感知** | 支持 `?tz=America/New_York` 查询参数，按目标时区计算今日主题 | ✅ 已完成 |
| **主题参数覆盖** | 支持 `?overrides=--radii:0px` 查询参数，微调 CSS 变量 | ✅ 已完成 |
| **调色盘 SVG 徽章** | `/api/v1/today/palette.svg` 返回可嵌入 README 的动态配色徽章 | ✅ 已完成 |
| **OG 社交分享卡片** | `/api/v1/theme/[id]/og.svg` 返回 1200×630 主题展示卡片 | ✅ 已完成 |
| **随机主题接口** | `/api/v1/theme/random.json` 从全池随机返回主题 | ✅ 已完成 |

---

## 许可证

本项目基于 **GNU General Public License v3.0 (GPL-3.0)** 发布。详见 [LICENSE](LICENSE) 文件。

Copyright (C) 2026 Tony
