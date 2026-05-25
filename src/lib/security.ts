import { auditCustomCss, auditCssVars } from './css-analyzer';
import { sanitizeHtml, sanitizeExtensions } from './html-sanitizer';

// NOTE: no 'g' flag — these are used with .test() which is stateful
// with 'g', causing phantom matches across invocations (lastIndex bug).

// Patterns that ALWAYS indicate a threat, regardless of field context
const STRONG_PATTERNS: RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /document\.cookie/i,
  /eval\s*\(/i,
  /<iframe\b[^>]*>/i,
  /expression\s*\(/i,
  /-moz-binding/i,
  /data\s*:\s*text\/html/i,
  /<\/style/i,
];

// Pattern that only matters in executable contexts (CSS, HTML, script).
// In display-text fields (name, title, etc.) it's a false positive —
// those are rendered as text nodes, not evaluated.
const ALERT_PATTERN = /alert\s*\(/i;

// Fields where alert( is harmless — they are rendered as plain text.
const LOW_RISK_FIELDS = new Set([
  'name', 'title', 'author', 'description', 'label',
  'presetName', 'preset', 'bio', 'location', 'company',
  'date', 'version', 'type', 'category', 'tags',
]);

function getLeafField(path: string): string {
  const last = path.split('.').pop() || '';
  return last.replace(/\[\d+\]/g, '');
}

function safeSnippet(value: string, maxLen = 120): string {
  const cleaned = value.replace(/[<>]/g, '');
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '…';
}

export interface ExtendedSecurityResult {
  isSafe: boolean;
  flaggedReasons: string[];
  cssAudit: { safe: boolean; issues: string[]; warnings: string[] };
  htmlAudit: { modified: boolean; flagged: string[] };
}

function scanValue(value: unknown, path: string, results: { isSafe: boolean; flaggedReasons: string[] }) {
  if (typeof value === 'string') {
    // Strong patterns — flag unconditionally
    for (const pattern of STRONG_PATTERNS) {
      if (pattern.test(value)) {
        results.isSafe = false;
        results.flaggedReasons.push(
          `${getLeafField(path)}:"${safeSnippet(value)}" matches ${pattern.source} @ ${path}`
        );
        return;
      }
    }
    // alert() is only suspicious outside of display-text fields
    const leafField = getLeafField(path);
    if (!LOW_RISK_FIELDS.has(leafField) && ALERT_PATTERN.test(value)) {
      results.isSafe = false;
      results.flaggedReasons.push(
        `${leafField}:"${safeSnippet(value)}" matches alert( @ ${path}`
      );
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, results));
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      scanValue(val, `${path}.${key}`, results);
    }
  }
}

export function scanForXSS(data: unknown): { isSafe: boolean; flaggedReasons: string[] } {
  const result: { isSafe: boolean; flaggedReasons: string[] } = { isSafe: true, flaggedReasons: [] };
  scanValue(data, 'root', result);
  return result;
}

export function scanExtended(data: Record<string, unknown>): ExtendedSecurityResult {
  const base = scanForXSS(data);
  const cssAudit = auditCustomCss(data.customCss);
  const cssVarsAudit = auditCssVars(data.cssVars as Record<string, string> | undefined);
  const htmlAudit = sanitizeExtensions(data.extensions);

  const allIssues = [
    ...cssAudit.issues,
    ...cssVarsAudit.issues,
    ...htmlAudit.flagged,
  ];

  // Only hard security issues make it unsafe; CSS warnings don't
  const isSafe = base.isSafe && allIssues.length === 0;

  return {
    isSafe,
    flaggedReasons: [...base.flaggedReasons, ...allIssues],
    cssAudit: {
      safe: cssAudit.safe && cssVarsAudit.safe,
      issues: [...cssAudit.issues, ...cssVarsAudit.issues],
      warnings: [...cssAudit.warnings, ...cssVarsAudit.warnings],
    },
    htmlAudit,
  };
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '[REMOVED]')
      .replace(/javascript\s*:/gi, 'blocked:')
      .replace(/alert\s*\(/gi, 'blocked(')
      .replace(/on\w+\s*=/gi, 'blocked=')
      .replace(/<\/style/gi, 'blocked');
  }
  return value;
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : sanitizeValue(item)
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = sanitizeValue(value);
    }
  }
  return result;
}

// --- Community / DIY theme scanning ---

interface ThemeEntry {
  id?: string;
  preset?: string;
  name?: string;
  author?: string;
  status?: string;
  customCss?: string;
  cssVars?: Record<string, string>;
  extensions?: Array<{ type?: string; html?: string; [k: string]: unknown }>;
}

interface ThemeScanResult {
  id: string;
  name: string;
  author: string;
  status: string;
  flaggedReasons: string[];
  bypassedSanitizers: string[];
}

export function scanThemeEntry(theme: ThemeEntry): ThemeScanResult | null {
  const reasons: string[] = [];
  const bypassed: string[] = [];
  const id = theme.id || theme.preset || 'unknown';
  const name = theme.name || 'unknown';
  const author = theme.author || '';
  const status = theme.status || 'unknown';

  // themedist docs say: name ≤100 chars, HTML tags stripped
  // themedist docs say: author ≤50 chars, HTML tags stripped
  // Check if these sanitizers were bypassed
  if (typeof theme.name === 'string' && /<[a-z]/i.test(theme.name)) {
    bypassed.push('name HTML tag stripping bypassed');
  }
  if (author && /<[a-z]/i.test(author)) {
    bypassed.push('author HTML tag stripping bypassed');
  }
  // Check for JS function calls in author (should be blocked by author field validation)
  if (author && /fetch\s*\(|eval\s*\(|document\./i.test(author)) {
    reasons.push(`author field contains executable JS: "${safeSnippet(author)}"`);
    bypassed.push('author field JS injection not blocked');
  }

  // Scan cssVars — each value is CSS, executable context. Particularly
  // dangerous: </style> breakout can escape the <style> block into raw HTML.
  if (theme.cssVars && typeof theme.cssVars === 'object') {
    for (const [key, value] of Object.entries(theme.cssVars)) {
      if (typeof value !== 'string') continue;
      let cssFlagged = false;
      for (const pattern of STRONG_PATTERNS) {
        if (pattern.test(value)) {
          reasons.push(`cssVars["${key}"] matches "${pattern.source.slice(0, 50)}": ${safeSnippet(value)}`);
          cssFlagged = true;
          break;
        }
      }
      if (!cssFlagged && ALERT_PATTERN.test(value)) {
        reasons.push(`cssVars["${key}"] matches "alert(": ${safeSnippet(value)}`);
      }
    }
  }

  // Scan customCss — CSS is an executable context, all patterns apply.
  // themedist docs say: @import, url(http), expression(), javascript: stripped on submission.
  if (typeof theme.customCss === 'string' && theme.customCss.trim()) {
    for (const pattern of STRONG_PATTERNS) {
      if (pattern.test(theme.customCss)) {
        reasons.push(`customCss matches "${pattern.source.slice(0, 50)}": ${safeSnippet(theme.customCss)}`);
        if (pattern.source.includes('javascript')) bypassed.push('CSS javascript: protocol stripping bypassed');
        else if (pattern.source.includes('expression')) bypassed.push('CSS expression() stripping bypassed');
        else if (pattern.source.includes('script')) bypassed.push('CSS script injection not blocked');
        else if (pattern.source.includes('cookie')) bypassed.push('CSS document.cookie access not blocked');
        break;
      }
    }
    if (!reasons.length && ALERT_PATTERN.test(theme.customCss)) {
      reasons.push(`customCss matches "alert(": ${safeSnippet(theme.customCss)}`);
    }
    if (/url\s*\(\s*['"]?http/i.test(theme.customCss)) {
      bypassed.push('CSS url(http) external reference stripping bypassed');
    }
    if (/@import/i.test(theme.customCss)) {
      bypassed.push('CSS @import stripping bypassed');
    }
  }

  // Scan extension HTML — also executable context.
  // themedist docs say: <script>, <iframe>, on* events, javascript: protocol stripped on submission.
  if (Array.isArray(theme.extensions)) {
    for (let i = 0; i < theme.extensions.length; i++) {
      const ext = theme.extensions[i];
      if (typeof ext?.html === 'string' && ext.html.trim()) {
        const html = ext.html;
        let extFlagged = false;
        for (const pattern of STRONG_PATTERNS) {
          if (pattern.test(html)) {
            reasons.push(`extensions[${i}].html matches "${pattern.source.slice(0, 50)}": ${safeSnippet(html)}`);
            extFlagged = true;
            const src = pattern.source;
            if (/on\\w+/.test(src)) bypassed.push('HTML on* event handler stripping bypassed');
            else if (/script/.test(src)) bypassed.push('HTML <script> tag stripping bypassed');
            else if (/iframe/.test(src)) bypassed.push('HTML <iframe> tag stripping bypassed');
            else if (/javascript/.test(src)) bypassed.push('HTML javascript: protocol stripping bypassed');
            else if (/cookie/.test(src)) bypassed.push('HTML document.cookie access not blocked');
            break;
          }
        }
        if (!extFlagged && ALERT_PATTERN.test(html)) {
          reasons.push(`extensions[${i}].html matches "alert(": ${safeSnippet(html)}`);
        }
      }
    }
  }

  if (reasons.length === 0) return null;

  // Deduplicate bypassed sanitizer list
  const uniqueBypassed = [...new Set(bypassed)];

  return { id, name, author, status, flaggedReasons: reasons, bypassedSanitizers: uniqueBypassed };
}
