"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';

// ================= 类型定义 =================
interface DirectoryItem {
  preset: string;
  name: string;
  primary?: string;
}

interface Extension {
  type?: string;
  html?: string;
  char?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  fontSize?: string;
  animation?: string;
  opacity?: number;
}

interface ThemePayload {
  date: string;
  preset: string;
  presetName: string;
  cssVars: Record<string, string>;
  customCss?: string;
  extensions?: Extension[];
  logoText?: string;
  logoColors?: string[];
}

// 需要进行直观分析检视的 CSS 变量清单
const MONITORED_VARS = [
  '--color-primary',
  '--color-secondary',
  '--color-accent',
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-border',
];

export default function ThemeDist() {
  const { t } = useLanguage();
  // ================= 状态管理 =================
  const [activeTheme, setActiveTheme] = useState<ThemePayload | null>(null);
  const [directory, setDirectory] = useState<DirectoryItem[]>([]);
  const [computedVars, setComputedVars] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 存储预设卡片的 ref 以便自动滚动对齐
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ================= 核心逻辑：加载主题数据 =================
  const loadPreset = async (preset: string) => {
    setIsLoading(true);
    const todayString = new Date().toISOString().slice(0, 10);
    const isToday = preset === 'today';
    const cacheKey = isToday ? 'td_today' : `td_preset_${preset}`;

    // 1. 尝试检测本地缓存
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData) as ThemePayload;
        // 如果是今日预设，需校验缓存日期是否匹配
        if (!isToday || parsed.date === todayString) {
          applyTheme(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('读取本地缓存时出错:', e);
    }

    // 2. 组装 API 请求地址
    const url = isToday
      ? 'https://themedist.netlify.app/api/v1/today.json'
      : `https://themedist.netlify.app/api/v1/theme/${preset}.json`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      const themePayload: ThemePayload = {
        date: isToday ? data.date : todayString,
        preset: data.preset,
        presetName: data.presetName,
        cssVars: data.cssVars,
        customCss: data.customCss,
        extensions: data.extensions,
        logoText: data.logoText,
        logoColors: data.logoColors,
      };

      // 如果包含目录信息，更新目录状态
      if (isToday && data.directory) {
        setDirectory(data.directory);
      }

      // 写入缓存并应用主题
      try {
        localStorage.setItem(cacheKey, JSON.stringify(themePayload));
      } catch (e) {
        console.warn('写入本地缓存时出错:', e);
      }

      applyTheme(themePayload);
    } catch (err) {
      console.warn('ThemeDist API 加载失败，启动本地缓存降级策略:', err);
      // 降级恢复：尝试寻找已有的 td_today 缓存
      try {
        const fallback = localStorage.getItem('td_today');
        if (fallback) {
          applyTheme(JSON.parse(fallback));
        }
      } catch (e) {
        console.error('降级加载本地缓存失败:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ================= 应用主题属性 =================
  const applyTheme = (data: ThemePayload) => {
    if (!data) return;
    setActiveTheme(data);
  };

  // ================= 页面初始化加载 =================
  useEffect(() => {
    const init = async () => {
      await loadPreset('today');
    };
    init();
  }, []);

  // 当主题应用、变更后，更新 :root 样式变量以及提取计算后的属性值
  useEffect(() => {
    if (!activeTheme) return;

    // A. 注入 CSS 变量至 :root
    if (activeTheme.cssVars) {
      Object.entries(activeTheme.cssVars).forEach(([key, val]) => {
        document.documentElement.style.setProperty(key, val);
      });
    }

    // B. 获取当前计算后的真实样式供变量检视器渲染
    const rootStyles = getComputedStyle(document.documentElement);
    const newComputed: Record<string, string> = {};
    MONITORED_VARS.forEach((vName) => {
      newComputed[vName] = rootStyles.getPropertyValue(vName).trim();
    });
    setComputedVars(newComputed);

    // C. 检查是否存在目录信息（防降级情况下无目录）
    if (directory.length === 0) {
      const fetchDirectoryOnly = async () => {
        try {
          const res = await fetch('https://themedist.netlify.app/api/v1/today.json');
          const data = await res.json();
          if (data.directory) {
            setDirectory(data.directory);
          }
        } catch (e) {
          console.log('读取备份目录清单失败。');
        }
      };
      fetchDirectoryOnly();
    }
  }, [activeTheme, directory.length]);

  // 控制选中项卡片自动平滑滚动至可视区域
  useEffect(() => {
    if (activeTheme?.preset) {
      const activeCard = cardRefs.current[activeTheme.preset];
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeTheme?.preset]);

  // 计算 Logo 的渐变与阴影样式
  const getLogoStyle = (): React.CSSProperties => {
    if (activeTheme?.logoColors && activeTheme.logoColors.length > 0) {
      return {
        background: `linear-gradient(135deg, ${activeTheme.logoColors.join(',')})`,
        boxShadow: `0 4px 20px ${activeTheme.logoColors[0]}`,
      };
    }
    return {
      background: 'var(--color-primary)',
      boxShadow: '0 4px 20px var(--color-primary)',
    };
  };

  return (
    <>
      {/* 1. 静态基础样式与动画 */}
      <style dangerouslySetInnerHTML={{ __html: staticStyles }} />

      {/* 2. 运行时动态生成的额外 CSS */}
      {activeTheme?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: activeTheme.customCss }} />
      )}

      {/* 3. 氛围光球背景 */}
      <div className="ambient-bg">
        <div className="glow-orb orb-1" id="ambient-orb-1"></div>
        <div className="glow-orb orb-2" id="ambient-orb-2"></div>
      </div>

      {/* 4. 用于注入 API 自定义 HTML 扩展的挂载容器 */}
      <div
        id="exts-container"
        dangerouslySetInnerHTML={{
          __html:
            activeTheme?.extensions
              ?.filter((ext) => ext.type === 'decorative' && ext.html)
              .map((ext) => ext.html!)
              .join('') || '',
        }}
      />
      {/* 5. floating 类型扩展（浮动字符） */}
      {activeTheme?.extensions
        ?.filter((ext) => ext.type === 'floating' && ext.char)
        .map((ext, i) => {
          const cssParts: string[] = ['position:fixed', 'pointer-events:none', 'z-index:0'];
          if (ext.top) cssParts.push(`top:${ext.top}`);
          if (ext.left) cssParts.push(`left:${ext.left}`);
          if (ext.right) cssParts.push(`right:${ext.right}`);
          if (ext.bottom) cssParts.push(`bottom:${ext.bottom}`);
          if (ext.fontSize) cssParts.push(`font-size:${ext.fontSize}`);
          if (ext.animation) cssParts.push(`animation:${ext.animation}`);
          const opacity = Number(ext.opacity);
          if (!Number.isNaN(opacity)) cssParts.push(`opacity:${Math.max(0, Math.min(1, opacity))}`);
          return (
            <div
              key={`floating-${i}`}
              style={{ cssText: cssParts.join(';') } as React.CSSProperties}
            >
              {String(ext.char).slice(0, 4)}
            </div>
          );
        })}

      {/* 6. 页面主体容器 */}
      <div className="container">
        {/* 顶部导航 */}
        <header>
          <div className="logo-container">
            <div className="logo-mark" style={getLogoStyle()}></div>
            <div className="logo-text" id="logo-text">
              {activeTheme?.logoText || 'ThemeDist'}
            </div>
          </div>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span id="nav-date">{activeTheme?.date || 'LOADING'}</span>
          </div>
        </header>

        {/* 巨幕区 */}
        <section className="hero-section">
          <h1>
            {t('demo.hero1')}
            <br />
            <span>{t('demo.hero2')}</span>
          </h1>
          <p className="hero-subtitle">
            {t('demo.heroSub')}
          </p>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
            onClick={() => loadPreset('today')}
            disabled={isLoading}
          >
            ⚡ {isLoading ? t('demo.loading') : t('demo.restore')}
          </button>
        </section>

        {/* 核心展示：今日状态与变量检视 */}
        <section className="theme-dashboard">
          <div className="meta-panel">
            <div>
              <div className="meta-label">{t('demo.currentPreset')}</div>
              <div className="meta-value" id="theme-name">
                {activeTheme?.presetName || '...'}
              </div>
              <div className="meta-label">{t('alerts.modal.status')}</div>
              <div className="preset-chip" id="preset-id">
                {activeTheme?.preset || '...'}
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <div className="meta-label">{t('demo.status')}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {t('demo.cssDesc')}
              </p>
            </div>
          </div>

          <div>
            <div className="meta-label" style={{ marginBottom: '1rem' }}>
              {t('demo.activeVars')}
            </div>
            <div className="variables-spec" id="spec-container">
              {MONITORED_VARS.map((vName) => {
                const val = computedVars[vName] || '';
                return (
                  <div className="spec-item" key={vName}>
                    <div
                      className="color-swatch"
                      style={{ background: `var(${vName})` }}
                    ></div>
                    <div className="spec-info">
                      <div className="spec-name">{vName}</div>
                      <div className="spec-val" title={val}>
                        {val || t('demo.loading')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 交互式组件效果演练 */}
        <section className="lab-section">
          <h2 className="section-title">✨ {t('demo.uiTest')}</h2>
          <div className="showcase-grid">
            <div className="showcase-card">
              <h3>{t('demo.buttons')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn btn-primary">{t('demo.primaryAction')}</button>
                <button className="btn btn-secondary">{t('demo.secondaryAction')}</button>
              </div>
            </div>
            <div className="showcase-card">
              <h3>{t('demo.fields')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="input-demo"
                  placeholder={t('demo.fieldPlaceholder')}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {t('demo.focusHint')}
                </p>
              </div>
            </div>
            <div className="showcase-card">
              <h3>{t('demo.shadows')}</h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                {t('demo.glassCaption')}
              </p>
              <div
                style={{
                  background: 'var(--glass-bg)',
                  padding: '1rem',
                  borderRadius: 'var(--radii)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {t('demo.glassLabel')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 主题实验室：目录 */}
        <section className="lab-section">
          <h2 className="section-title">🧪 {t('demo.lab')}</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {t('demo.labDesc')}
          </p>
          <div className="directory-grid" id="directory-container">
            {directory.map((item) => {
              const isActive = item.preset === activeTheme?.preset;
              return (
                <div
                  key={item.preset}
                  ref={(el) => {
                    cardRefs.current[item.preset] = el;
                  }}
                  className={`theme-preset-card ${isActive ? 'active' : ''}`}
                  onClick={() => loadPreset(item.preset)}
                >
                  <div className="preset-card-title">{item.name}</div>
                  <div className="preset-card-meta">
                    <div
                      className="preset-color-dot"
                      style={{ background: item.primary || 'var(--color-primary)' }}
                    ></div>
                    <div className="preset-tag">{item.preset}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 页脚 */}
        <footer>
          {t('demo.footer')}
        </footer>
      </div>
    </>
  );
}

// ================= 基础/默认的 CSS 样式串 =================
const staticStyles = `
  :root {
    --color-primary: #b8860b;
    --color-secondary: #ffd700;
    --color-accent: #ffd700;
    --color-bg: #0a0500;
    --color-surface: #19140f;
    --color-text: #fffce8;
    --color-text-muted: #d4af37;
    --color-border: rgba(255, 215, 0, 0.15);
    --font-heading: 'Inter', system-ui, -apple-system, sans-serif;
    --font-body: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --text-base: clamp(0.95rem, 0.9rem + 0.3vw, 1.1rem);
    --radii: 1rem;
    --content-max: 75rem;
    --glass-bg: rgba(25, 20, 15, 0.7);
    --glass-blur: blur(16px);
    --ambient-1: rgba(255, 215, 0, 0.12);
    --ambient-2: rgba(255, 255, 255, 0.05);
    --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.3);
    --space-unit: 0.25rem;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--text-base);
    line-height: 1.6;
    overflow-x: hidden;
    min-height: 100vh;
    position: relative;
    transition: background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
                color 0.4s ease, 
                border-color 0.4s ease;
  }

  .ambient-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.65;
    transition: background 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .orb-1 {
    width: 50vw;
    height: 50vw;
    top: -10vw;
    left: -10vw;
    background: var(--ambient-1);
  }
  .orb-2 {
    width: 45vw;
    height: 45vw;
    bottom: 5vw;
    right: -10vw;
    background: var(--ambient-2);
  }

  .container {
    max-width: var(--content-max);
    margin: 0 auto;
    padding: 2.5rem 1.5rem;
    position: relative;
    z-index: 1;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4rem;
  }
  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .logo-mark {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    transition: all 0.5s ease;
  }
  .logo-text {
    font-family: var(--font-heading);
    font-weight: 800;
    font-size: 1.5rem;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.5s ease;
  }
  .status-badge {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    padding: 0.35rem 0.75rem;
    border-radius: 2rem;
    background: var(--glass-bg);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #10b981;
    box-shadow: 0 0 8px #10b981;
  }

  .hero-section {
    text-align: center;
    margin-bottom: 4rem;
  }
  .hero-section h1 {
    font-family: var(--font-heading);
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -0.04em;
    margin-bottom: 1rem;
    transition: color 0.5s ease;
  }
  .hero-section h1 span {
    color: var(--color-primary);
    text-shadow: 0 0 40px rgba(var(--color-primary), 0.2);
  }
  .hero-subtitle {
    font-size: clamp(1.1rem, 2vw, 1.25rem);
    color: var(--color-text-muted);
    max-width: 36rem;
    margin: 0 auto 2rem auto;
  }

  .theme-dashboard {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--color-border);
    border-radius: var(--radii);
    padding: 2.5rem;
    box-shadow: var(--shadow-md);
    margin-bottom: 4rem;
    display: grid;
    grid-template-columns: 1.2fr 1.8fr;
    gap: 3rem;
  }
  @media (max-width: 768px) {
    .theme-dashboard {
      grid-template-columns: 1fr;
      gap: 2rem;
      padding: 1.5rem;
    }
  }

  .meta-panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .meta-label {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }
  .meta-value {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: var(--color-text);
  }
  .preset-chip {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    background: rgba(var(--color-primary), 0.1);
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    width: fit-content;
  }

  .variables-spec {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  @media (max-width: 480px) {
    .variables-spec {
      grid-template-columns: 1fr;
    }
  }
  .spec-item {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .color-swatch {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.35rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
    transition: background 0.5s ease;
  }
  .spec-info {
    overflow: hidden;
  }
  .spec-name {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .spec-val {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: bold;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .showcase-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 4rem;
  }
  @media (max-width: 768px) {
    .showcase-grid {
      grid-template-columns: 1fr;
    }
  }
  .showcase-card {
    background: var(--glass-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radii);
    padding: 1.75rem;
    transition: transform 0.3s ease;
  }
  .showcase-card:hover {
    transform: translateY(-4px);
  }
  .showcase-card h3 {
    font-family: var(--font-heading);
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid transparent;
    width: 100%;
    text-align: center;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--color-primary);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }
  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }
  .btn-secondary {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-text);
  }
  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }

  .input-demo {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-family: var(--font-body);
    outline: none;
    transition: border-color 0.3s ease;
  }
  .input-demo:focus {
    border-color: var(--color-primary);
  }

  .lab-section {
    margin-bottom: 4rem;
  }
  .section-title {
    font-family: var(--font-heading);
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .directory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    max-height: 24rem;
    overflow-y: auto;
    padding-right: 0.5rem;
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.15);
    border-radius: var(--radii);
    padding: 1.25rem;
  }
  .directory-grid::-webkit-scrollbar {
    width: 6px;
  }
  .directory-grid::-webkit-scrollbar-track {
    background: transparent;
  }
  .directory-grid::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  .theme-preset-card {
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }
  .theme-preset-card:hover {
    border-color: var(--color-primary);
    transform: scale(1.02);
  }
  .theme-preset-card.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 15px rgba(var(--color-primary), 0.15);
    background: rgba(255, 255, 255, 0.02);
  }
  .preset-card-title {
    font-weight: bold;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .preset-card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .preset-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .preset-tag {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  footer {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    font-family: var(--font-mono);
  }

  #exts-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
`;