'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const translations = {
  zh: {
    'nav.subtitle': '双平台监控',
    'nav.platforms': 'Vercel · Netlify',
    'footer.text': 'ThemeDist Pulse — 监控仪表盘',
    'page.title': '仪表盘',
    'page.subtitle': '监控 ThemeDist 在 Vercel、Netlify 和 DIY 社区主题的运行状态',
    'page.lastRun': '上次运行：',
    'page.runMonitor': '运行监控',
    'page.running': '运行中...',
    'page.alertWith': '检查完成，发现',
    'page.alertUnit': '条告警',
    'page.allPassed': '所有检查通过——未发现问题',
    'page.checkFailed': '监控检查失败',

    'liveStatus.title': '实时状态',
    'liveStatus.refresh': '刷新',
    'liveStatus.online': '在线',
    'liveStatus.slow': '响应缓慢',
    'liveStatus.outage': '服务中断',
    'liveStatus.checking': '检查中...',
    'liveStatus.error': '错误',
    'liveStatus.healthy': '健康',
    'liveStatus.degraded': '降级',
    'liveStatus.unknown': '未知',
    'liveStatus.database': '数据库',
    'liveStatus.redis': 'Redis / API',
	    'liveStatus.justNow': '刚刚更新',
	    'liveStatus.minAgo': '分钟前更新',
	    'liveStatus.hourAgo': '小时前更新',
	    'liveStatus.dayAgo': '天前更新',

    'metrics.title': '核心指标',
    'metrics.loading': '加载中...',
    'metrics.ms': 'ms',
    'metrics.vercelAvg': 'Vercel 平均',
    'metrics.netlifyAvg': 'Netlify 平均',
    'metrics.themes': '主题数',
    'metrics.latencyTrend': '延迟趋势 (24h)',
    'metrics.cdnHitRate': 'CDN 缓存命中率',
    'metrics.hit': '命中',
    'metrics.miss': '未命中',
    'metrics.responseTime': '响应时间 (近期)',

    'theme.title': '今日主题',
    'theme.noData': '暂无主题数据。请先运行监控检查。',
    'theme.auditTitle': '今日主题审计',
    'theme.unsafe': '不安全',
    'theme.securityPassed': '安全通过',
    'theme.presetName': '预设名称',
    'theme.presetId': '预设 ID',
    'theme.author': '作者',
    'theme.themeCount': '主题数量',
    'theme.available': '个可用',
    'theme.date': '日期：',
    'theme.schemaValid': 'Schema 有效',
    'theme.schemaInvalid': 'Schema 无效',
    'theme.schemaErrors': 'Schema 错误：',
    'theme.flaggedIssues': '标记的安全问题',
    'theme.malicious': '⚠ 恶意',

    'alerts.title': '告警',
    'alerts.all': '全部',
    'alerts.unresolved': '未解决',
    'alerts.noAlerts': '暂无告警记录。',
    'alerts.allClear': '无未解决告警。一切正常！',
    'alerts.outage': '宕机',
    'alerts.security': '安全',
    'alerts.database': '数据库',
    'alerts.schema': 'Schema',
    'alerts.resolved': '已解决',
    'alerts.copy': '复制',
    'alerts.copied': '已复制！',

    'failover.title': '容灾与集成指南',
    'failover.bestPractices': 'ThemeDist 消费者最佳实践',
    'failover.tip1': '始终使用 /api/today-safe 代理端点——它在返回前会清洗 XSS。',
    'failover.tip2': '实现本地回退主题。如果请求失败或返回无效数据，优雅降级。',
    'failover.tip3': '测量主源延迟；如果超过 3 秒，自动切换到备用平台。',
    'failover.tip4': '在应用前验证 Schema——检查 cssVars["--color-primary"] 是否存在。',
    'failover.tip5': '在 README 中订阅徽章端点，随时了解平台健康状态。',
    'failover.vanillaJs': 'Vanilla JS 集成',
    'failover.reactHook': 'React Hook 集成',
    'failover.copied': '已复制！',
    'failover.copy': '复制',
    'failover.badges': 'README 状态徽章',
  },
  en: {
    'nav.subtitle': 'Dual-Platform Monitor',
    'nav.platforms': 'Vercel · Netlify',
    'footer.text': 'ThemeDist Pulse — Monitoring Dashboard for',
    'page.title': 'Dashboard',
    'page.subtitle': 'Monitoring ThemeDist across Vercel, Netlify, and DIY community themes',
    'page.lastRun': 'Last run: ',
    'page.runMonitor': 'Run Monitor',
    'page.running': 'Running...',
    'page.alertWith': 'Check complete with',
    'page.alertUnit': 'alert(s)',
    'page.allPassed': 'All checks passed — no issues detected',
    'page.checkFailed': 'Monitor check failed',

    'liveStatus.title': 'Live Status',
    'liveStatus.refresh': 'Refresh',
    'liveStatus.online': 'Online',
    'liveStatus.slow': 'Slow',
    'liveStatus.outage': 'Outage',
    'liveStatus.checking': 'Checking...',
    'liveStatus.error': 'Error',
    'liveStatus.healthy': 'Healthy',
    'liveStatus.degraded': 'Degraded',
    'liveStatus.unknown': 'Unknown',
    'liveStatus.database': 'Database',
    'liveStatus.redis': 'Redis / API',
	    'liveStatus.justNow': 'Updated just now',
	    'liveStatus.minAgo': 'min ago',
	    'liveStatus.hourAgo': 'h ago',
	    'liveStatus.dayAgo': 'd ago',

    'metrics.title': 'Metrics',
    'metrics.loading': 'Loading metrics...',
    'metrics.ms': 'ms',
    'metrics.vercelAvg': 'Vercel Avg',
    'metrics.netlifyAvg': 'Netlify Avg',
    'metrics.themes': 'Themes',
    'metrics.latencyTrend': 'Latency Trend (24h)',
    'metrics.cdnHitRate': 'CDN Cache Hit Rate',
    'metrics.hit': 'HIT',
    'metrics.miss': 'MISS',
    'metrics.responseTime': 'Response Time (Recent)',

    'theme.title': "Today's Theme",
    'theme.noData': 'No theme data yet. Run a monitor check.',
    'theme.auditTitle': "Today's Theme Audit",
    'theme.unsafe': 'Unsafe',
    'theme.securityPassed': 'Security Passed',
    'theme.presetName': 'Preset Name',
    'theme.presetId': 'Preset ID',
    'theme.author': 'Author',
    'theme.themeCount': 'Theme Count',
    'theme.available': 'available',
    'theme.date': 'Date: ',
    'theme.schemaValid': 'Schema Valid',
    'theme.schemaInvalid': 'Schema Invalid',
    'theme.schemaErrors': 'Schema Errors:',
    'theme.flaggedIssues': 'Flagged Security Issues',
    'theme.malicious': '⚠ Malicious',

    'alerts.title': 'Alerts',
    'alerts.all': 'All',
    'alerts.unresolved': 'Unresolved',
    'alerts.noAlerts': 'No alerts recorded yet.',
    'alerts.allClear': 'No unresolved alerts. All clear!',
    'alerts.outage': 'Outage',
    'alerts.security': 'Security',
    'alerts.database': 'Database',
    'alerts.schema': 'Schema',
    'alerts.resolved': 'Resolved',
    'alerts.copy': 'Copy',
    'alerts.copied': 'Copied!',

    'failover.title': 'Failover & Integration Guide',
    'failover.bestPractices': 'Best Practices for ThemeDist Consumers',
    'failover.tip1': 'Always use the /api/today-safe proxy endpoint — it sanitizes XSS before returning.',
    'failover.tip2': 'Implement a local fallback theme. If the fetch fails or returns invalid data, degrade gracefully.',
    'failover.tip3': 'Measure primary source latency; if >3s, switch to the secondary platform automatically.',
    'failover.tip4': 'Validate the schema before applying — check for cssVars["--color-primary"] existence.',
    'failover.tip5': 'Subscribe to the badge endpoints in your README to stay aware of platform health.',
    'failover.vanillaJs': 'Vanilla JS Integration',
    'failover.reactHook': 'React Hook Integration',
    'failover.copied': 'Copied!',
    'failover.copy': 'Copy',
    'failover.badges': 'Status Badges for Your README',
  },
};

type Lang = 'zh' | 'en';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (k: string) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');

  const t = useCallback(
    (key: string): string => {
      const dict = translations[lang] as Record<string, string>;
      return dict[key] ?? key;
    },
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}
