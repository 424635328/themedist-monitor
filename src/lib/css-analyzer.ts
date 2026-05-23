export interface CssAuditResult {
  safe: boolean;
  issues: string[];
  warnings: string[];
}

const URL_FN = /url\(\s*(['"]?)((?:https?|data):\/\/[^'")\s]+)\1\s*\)/gi;
const IMPORT_RULE = /@import\s+(?:url\s*)?\(?\s*['"]([^'"]+)['"]/gi;
const EXPRESSION = /expression\s*\(/gi;
const BEHAVIOR = /behavior\s*:/gi;
const MOZ_BINDING = /-moz-binding/gi;
const JS_PROTO = /javascript\s*:/gi;
const DATA_HTML = /data\s*:\s*text\/html/gi;
const CSS_VAR_REF = /var\(\s*--[^)]+\)/g;

const TRUSTED_CDNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

function isTrustedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return TRUSTED_CDNS.some((cdn) => u.hostname.endsWith(cdn));
  } catch {
    return false;
  }
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseAtRules(css: string, issues: string[], warnings: string[]) {
  let match: RegExpExecArray | null;

  IMPORT_RULE.lastIndex = 0;
  while ((match = IMPORT_RULE.exec(css)) !== null) {
    const target = match[1];
    if (!isTrustedUrl(target)) {
      issues.push(`Untrusted @import: "${target}" — imports external stylesheets`);
    }
  }

  // Check @font-face for external src
  const fontFaceSrc = /@font-face\s*\{[^}]*src\s*:\s*url\(/gi;
  if (fontFaceSrc.test(css)) {
    warnings.push('@font-face with external src detected');
  }

  // Check @keyframes - mostly harmless but flag for review
  if (/@keyframes\s/.test(css)) {
    warnings.push('@keyframes animation detected');
  }
}

function parseProperties(css: string, issues: string[], warnings: string[]) {
  EXPRESSION.lastIndex = 0;
  if (EXPRESSION.test(css)) {
    issues.push('CSS expression() detected — possible IE injection vector');
  }

  BEHAVIOR.lastIndex = 0;
  if (BEHAVIOR.test(css)) {
    issues.push('CSS behavior property detected — possible binary behavior injection');
  }

  MOZ_BINDING.lastIndex = 0;
  if (MOZ_BINDING.test(css)) {
    issues.push('-moz-binding detected — possible XBL injection');
  }

  JS_PROTO.lastIndex = 0;
  if (JS_PROTO.test(css)) {
    issues.push('javascript: URI scheme detected in CSS value');
  }

  DATA_HTML.lastIndex = 0;
  if (DATA_HTML.test(css)) {
    issues.push('data:text/html URI detected — potential HTML injection');
  }

  // Check url() references
  URL_FN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_FN.exec(css)) !== null) {
    const url = m[2];
    if (!isTrustedUrl(url)) {
      warnings.push(`External url() reference: "${url}" — potential beacon/exfiltration`);
    }
  }
}

function detectInfiniteRecursion(css: string, warnings: string[]) {
  const varDecls = css.match(/--[\w-]+/g);
  if (!varDecls) return;

  const unique = new Set(varDecls);
  if (unique.size > 50) {
    warnings.push(`Large number of CSS custom properties (${unique.size}) — possible DoS via var() explosion`);
  }
}

export function auditCustomCss(css: unknown): CssAuditResult {
  if (typeof css !== 'string' || css.trim().length === 0) {
    return { safe: true, issues: [], warnings: [] };
  }

  const issues: string[] = [];
  const warnings: string[] = [];
  const cleaned = stripComments(css);

  parseAtRules(cleaned, issues, warnings);
  parseProperties(cleaned, issues, warnings);
  detectInfiniteRecursion(cleaned, warnings);

  return {
    safe: issues.length === 0,
    issues,
    warnings,
  };
}

export function auditCssVars(cssVars: Record<string, string> | undefined): CssAuditResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!cssVars || typeof cssVars !== 'object') {
    return { safe: true, issues: [], warnings: [] };
  }

  for (const [key, value] of Object.entries(cssVars)) {
    if (typeof value !== 'string') continue;

    JS_PROTO.lastIndex = 0;
    if (JS_PROTO.test(value)) {
      issues.push(`cssVar "${key}" contains javascript: URI`);
    }

    URL_FN.lastIndex = 0;
    while (URL_FN.test(value)) {
      warnings.push(`cssVar "${key}" contains url() reference`);
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    warnings,
  };
}
