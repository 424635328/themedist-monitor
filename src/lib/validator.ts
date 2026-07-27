import type { TodayJsonResponse } from '@/types';

const REQUIRED_TOP_LEVEL = ['date', 'preset', 'presetName', 'cssVars', 'layerContext', 'apiVersion'];
const REQUIRED_CSS_VARS = ['--color-primary', '--color-bg'];
const MIN_CSS_VARS = 44;
const MAX_CSS_VARS = 60;
const CSS_VAR_PADDING_PREFIXES = [
  '--color-primary-light',
  '--color-primary-dark',
  '--color-secondary-light',
  '--color-secondary-dark',
  '--color-bg-deep',
  '--color-bg-alt',
];
const DEFAULT_CSS_VARS: Record<string, string> = {
  '--color-primary': '#6366f1',
  '--color-bg': '#0f0f17',
  '--color-primary-light': '#818cf8',
  '--color-primary-dark': '#4f46e5',
  '--color-secondary-light': '#a5b4fc',
  '--color-secondary-dark': '#6366f1',
  '--color-bg-deep': '#07070d',
  '--color-bg-alt': '#1a1a2e',
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTodayJson(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not a valid JSON object'] };
  }

  const obj = data as TodayJsonResponse;

  for (const field of REQUIRED_TOP_LEVEL) {
    if (!(field in obj)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (obj.cssVars && typeof obj.cssVars === 'object') {
    const vars = Object.keys(obj.cssVars);
    if (vars.length < MIN_CSS_VARS) {
      errors.push(`cssVars has ${vars.length} variables, expected at least ${MIN_CSS_VARS}`);
    }
    if (vars.length > MAX_CSS_VARS) {
      errors.push(`cssVars has ${vars.length} variables, expected at most ${MAX_CSS_VARS}`);
    }
    for (const requiredVar of REQUIRED_CSS_VARS) {
      if (!(requiredVar in obj.cssVars)) {
        errors.push(`Missing required cssVar: "${requiredVar}"`);
      }
    }
  } else {
    errors.push('cssVars is missing or not an object');
  }

  if (obj.available !== undefined && typeof obj.available !== 'number') {
    errors.push('"available" should be a number');
  }

  if (obj.apiVersion !== undefined && typeof obj.apiVersion !== 'string') {
    errors.push('"apiVersion" should be a string');
  }

  if (obj.customCss !== undefined && obj.customCss !== null && typeof obj.customCss !== 'string') {
    errors.push('"customCss" should be a string or null');
  }

  if (obj.extensions !== undefined && obj.extensions !== null && !Array.isArray(obj.extensions)) {
    errors.push('"extensions" should be an array or null');
  }

  if (obj.logoText !== undefined && obj.logoText !== null && typeof obj.logoText !== 'string') {
    errors.push('"logoText" should be a string or null');
  }

  if (obj.logoColors !== undefined && obj.logoColors !== null && !Array.isArray(obj.logoColors)) {
    errors.push('"logoColors" should be an array or null');
  }

  if (obj.dailyIsCommunity !== undefined && typeof obj.dailyIsCommunity !== 'boolean') {
    errors.push('"dailyIsCommunity" should be a boolean');
  }

  if (obj.layerContext !== undefined) {
    if (typeof obj.layerContext !== 'object' || obj.layerContext === null) {
      errors.push('"layerContext" should be an object');
    }
  }

  if (obj.clickEffect !== null && obj.clickEffect !== undefined) {
    if (typeof obj.clickEffect !== 'object') {
      errors.push('"clickEffect" should be an object or null');
    } else if (!Array.isArray(obj.clickEffect.spawn)) {
      errors.push('"clickEffect.spawn" should be an array');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// CSS value sanitization — neutralizes XSS vectors in individual cssVar values
// ---------------------------------------------------------------------------

const DANGEROUS_URL_SCHEME = /url\s*\(\s*(['"]?)\s*(javascript|data)\s*:/gi;
const EXPRESSION_CALL = /expression\s*\(/gi;
const JS_SCHEME = /javascript\s*:/gi;
const HTML_TEMPLATE = /data\s*:\s*text\s*\/\s*html/gi;
const HTML_TAGS = /<\/?(?:script|iframe|embed|object|style|link|form|input|svg|math)[\s>/]/gi;
const ON_EVENT = /\bon[a-z]+\s*=/gi;
const ESCAPED_DANGLING = /\\(['"])/g;
const CONTROL_CHARS = /[\x00-\x08\x0e-\x1f]/g;
const NON_URL_FN_GLOBAL = /url\s*\(\s*(['"]?)(?!https?:\/\/|data:image\/(?:png|jpe?g|gif|svg\+xml|webp)|data:font\/(?:woff2?|ttf|otf)|var\(|#)[^'")\s]*?\1\s*\)/gi;

const CSS_VAR_DERIVATION_MAP: Record<string, string[]> = {
  '--color-primary': ['--color-primary-light', '--color-primary-dark', '--color-accent', '--color-surface', '--color-btn', '--color-link', '--color-accent-2'],
  '--color-secondary': ['--color-secondary-light', '--color-secondary-dark', '--color-accent', '--color-muted'],
  '--color-bg': ['--color-bg-deep', '--color-bg-alt', '--color-bg-card', '--color-surface', '--color-bg-light'],
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '');
  const h = m.length === 3
    ? m[0] + m[0] + m[1] + m[1] + m[2] + m[2]
    : m.length === 6 ? m : null;
  if (!h) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

function deriveFromContext(key: string, cssVars: Record<string, string>): string | null {
  const relatedKeys = CSS_VAR_DERIVATION_MAP[key];
  if (!relatedKeys) return null;

  for (const relKey of relatedKeys) {
    const relValue = cssVars[relKey];
    if (!relValue) continue;
    const trimmed = relValue.trim();

    if (key === '--color-bg') {
      if (relKey === '--color-surface' || relKey === '--color-bg-card') {
        const rgb = hexToRgb(trimmed);
        if (rgb) return rgbToHex(rgb.r * 0.6, rgb.g * 0.6, rgb.b * 0.6);
      }
      if (relKey === '--color-bg-deep') {
        const rgb = hexToRgb(trimmed);
        if (rgb) return rgbToHex(rgb.r * 1.2, rgb.g * 1.2, rgb.b * 1.2);
      }
      if (trimmed.startsWith('#')) return trimmed;
    }

    if (key === '--color-primary') {
      if (relKey === '--color-accent') return trimmed;
      if (relKey.endsWith('-light') || relKey.endsWith('-dark')) {
        const rgb = hexToRgb(trimmed);
        if (rgb) {
          const factor = relKey.endsWith('-light') ? 0.75 : 1.25;
          return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
        }
      }
      if (trimmed.startsWith('#')) return trimmed;
    }

    if (key === '--color-secondary') {
      if (trimmed.startsWith('#')) return trimmed;
    }
  }
  return null;
}

function sanitizeCssValue(key: string, value: string): { safe: string; changed: boolean; reason: string } {
  let sanitized = value;
  let changed = false;
  const reasons: string[] = [];

  sanitized = sanitized.replace(CONTROL_CHARS, '');
  if (sanitized !== value) { changed = true; reasons.push('control chars'); }

  // Neutralize dangerous patterns — use replace result comparison (avoids global regex .test() lastIndex issues)
  let before = sanitized;
  sanitized = sanitized.replace(HTML_TAGS, '');
  if (sanitized !== before) { changed = true; reasons.push('HTML tags stripped'); }

  before = sanitized;
  sanitized = sanitized.replace(ON_EVENT, '');
  if (sanitized !== before) { changed = true; reasons.push('event handler stripped'); }

  before = sanitized;
  sanitized = sanitized.replace(JS_SCHEME, 'void:');
  if (sanitized !== before) { changed = true; reasons.push('javascript: URI neutralized'); }

  before = sanitized;
  sanitized = sanitized.replace(HTML_TEMPLATE, 'data:text/plain');
  if (sanitized !== before) { changed = true; reasons.push('data:text/html neutralized'); }

  before = sanitized;
  sanitized = sanitized.replace(EXPRESSION_CALL, 'none(');
  if (sanitized !== before) { changed = true; reasons.push('expression() neutralized'); }

  before = sanitized;
  sanitized = sanitized.replace(DANGEROUS_URL_SCHEME, 'url($1blocked:');
  if (sanitized !== before) { changed = true; reasons.push('dangerous url() scheme neutralized'); }

  before = sanitized;
  sanitized = sanitized.replace(NON_URL_FN_GLOBAL, () => 'none');
  if (sanitized !== before) { changed = true; reasons.push('non-media url() neutralized'); }

  before = sanitized;
  sanitized = sanitized.replace(ESCAPED_DANGLING, '');
  if (sanitized !== before) {
    changed = true;
    reasons.push('dangling quotes removed');
  }

  sanitized = sanitized.trim();

  return { safe: sanitized, changed, reason: reasons.join('; ') };
}

// ---------------------------------------------------------------------------
// Auto-fix cssVars: sanitize existing values, derive missing vars, fill gaps
// ---------------------------------------------------------------------------

export interface AutoFixResult {
  fixed: boolean;
  data: TodayJsonResponse;
  details: Array<{ key: string; action: 'sanitized' | 'derived' | 'filled'; detail: string }>;
}

export function autoFixCssVars(data: TodayJsonResponse): AutoFixResult {
  const details: AutoFixResult['details'] = [];
  if (!data.cssVars || typeof data.cssVars !== 'object') return { fixed: false, data, details };
  const count = Object.keys(data.cssVars).length;
  // Trigger auto-fix when count is below MIN but above a floor (at least ~half of MIN)
  if (count < Math.floor(MIN_CSS_VARS / 2) || count >= MIN_CSS_VARS) return { fixed: false, data, details };

  // Clone cssVars to avoid mutating the caller's original data (preserves audit trail)
  const cssVars = { ...data.cssVars } as Record<string, string>;
  data = { ...data, cssVars };

  // Phase 1: Sanitize all existing values
  for (const [key, value] of Object.entries(cssVars)) {
    if (typeof value !== 'string') continue;
    const { safe, changed, reason } = sanitizeCssValue(key, value);
    if (changed) {
      cssVars[key] = safe;
      details.push({ key, action: 'sanitized', detail: reason });
    }
  }

  // Phase 2: Derive missing required vars from related vars in context
  for (const key of REQUIRED_CSS_VARS) {
    if (key in cssVars) continue;
    const derived = deriveFromContext(key, cssVars);
    if (derived) {
      cssVars[key] = derived;
      details.push({ key, action: 'derived', detail: `inferred from related var` });
    }
  }

  // Phase 3: Fill remaining required gaps with safe defaults
  for (const [key, value] of Object.entries(DEFAULT_CSS_VARS)) {
    if (!(key in cssVars)) {
      cssVars[key] = value;
      details.push({ key, action: 'filled', detail: `default ${value}` });
    }
    if (Object.keys(cssVars).length >= MIN_CSS_VARS) break;
  }

  // Phase 4: If still below MIN, add padding vars to reach threshold
  if (Object.keys(cssVars).length < MIN_CSS_VARS) {
    for (const key of CSS_VAR_PADDING_PREFIXES) {
      if (key in cssVars) continue;
      const baseKey = key.replace(/-(light|dark|deep|alt)$/, '');
      const baseVal = cssVars[baseKey];
      let padVal: string;
      if (baseVal && /^#[0-9a-f]{3,8}$/i.test(baseVal.trim())) {
        const rgb = hexToRgb(baseVal.trim());
        if (rgb) {
          const factor = key.includes('light') ? 1.3 : key.includes('dark') ? 0.7 : key.includes('deep') ? 0.4 : 1.2;
          padVal = rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
        } else { padVal = baseVal; }
      } else {
        padVal = DEFAULT_CSS_VARS[key] || '#888888';
      }
      cssVars[key] = padVal;
      details.push({ key, action: 'filled', detail: `padding ${padVal}` });
      if (Object.keys(cssVars).length >= MIN_CSS_VARS) break;
    }
  }

  return { fixed: details.length > 0, data, details };
}
