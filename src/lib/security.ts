// SecurityCheckResult is defined inline below
import { auditCustomCss, auditCssVars } from './css-analyzer';
import { sanitizeHtml, sanitizeExtensions } from './html-sanitizer';

// NOTE: no 'g' flag — these are used with .test() which is stateful
// with 'g', causing phantom matches across invocations (lastIndex bug).
const MALICIOUS_PATTERNS: RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /alert\s*\(/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /onclick\s*=/i,
  /onmouseover\s*=/i,
  /<[^>]*on\w+\s*=[^>]*>/i,
  /document\.cookie/i,
  /eval\s*\(/i,
  /<iframe\b[^>]*>/i,
  /expression\s*\(/i,
  /-moz-binding/i,
  /data\s*:\s*text\/html/i,
];

export interface ExtendedSecurityResult {
  isSafe: boolean;
  flaggedReasons: string[];
  cssAudit: { safe: boolean; issues: string[]; warnings: string[] };
  htmlAudit: { modified: boolean; flagged: string[] };
}

function scanValue(value: unknown, path: string, results: { isSafe: boolean; flaggedReasons: string[] }) {
  if (typeof value === 'string') {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(value)) {
        results.isSafe = false;
        results.flaggedReasons.push(`Malicious content detected in "${path}": ${pattern.source.slice(0, 60)}`);
        break;
      }
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
      .replace(/onerror\s*=/gi, 'blocked=')
      .replace(/onload\s*=/gi, 'blocked=')
      .replace(/onclick\s*=/gi, 'blocked=')
      .replace(/onmouseover\s*=/gi, 'blocked=');
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
