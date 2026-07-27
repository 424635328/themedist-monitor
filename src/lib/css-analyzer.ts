import postcss from 'postcss';

export interface CssAuditResult {
  safe: boolean;
  issues: string[];
  warnings: string[];
}

// Canonical finding messages — shared by all scan layers so results dedupe cleanly
const MSG_EXPRESSION = 'CSS expression() detected — possible IE injection vector';
const MSG_BEHAVIOR = 'CSS behavior property detected — possible binary behavior injection';
const MSG_MOZ_BINDING = '-moz-binding detected — possible XBL injection';
const MSG_JS_PROTO = 'javascript: URI scheme detected in CSS value';
const MSG_DATA_HTML = 'data:text/html URI detected — potential HTML injection';

const EXPRESSION = /expression\s*\(/i;
const BEHAVIOR = /behavior\s*:/i;
const MOZ_BINDING = /-moz-binding/i;
const JS_PROTO = /javascript\s*:/i;
const DATA_HTML = /data\s*:\s*text\/html/i;

// url(...) token, quoted or unquoted
const URL_TOKEN = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^'")\s][^)\s]*))\s*\)/gi;
// @import target, quoted, url(...)-wrapped, or bare
const IMPORT_TARGET = /@import\s+(?:url\s*\(\s*)?(['"]?)([^'")\s;]+)\1/gi;

const TRUSTED_CDNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'jsdelivr.net',
  'use.fontawesome.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'netdna.bootstrapcdn.com',
  'code.jquery.com',
  'ajax.googleapis.com',
  'ajax.aspnetcdn.com',
  'cdn.shopify.com',
  'storage.googleapis.com',
  'github.com',
  'raw.githubusercontent.com',
  'githubusercontent.com',
];

function isTrustedUrl(url: string): boolean {
  try {
    // Resolve protocol-relative references before parsing
    const u = new URL(url.startsWith('//') ? `https:${url}` : url);
    return TRUSTED_CDNS.some((cdn) => u.hostname === cdn || u.hostname.endsWith('.' + cdn));
  } catch {
    return false;
  }
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Decode CSS escape sequences (\65 → "e", \: → ":") so encoded payloads
// like expr\65 ssion( or java\73 cript: can't slip past the pattern scan.
function cssUnescape(css: string): string {
  return css
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?/g, (_, hex: string) => {
      const cp = parseInt(hex, 16);
      if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return '�';
      return String.fromCodePoint(cp);
    })
    .replace(/\\([^0-9a-fA-F\r\n])/g, '$1');
}

function addUnique(list: string[], msg: string) {
  if (!list.includes(msg)) list.push(msg);
}

// Classify a single url(...) target extracted from CSS
function auditUrlTarget(target: string, issues: string[], warnings: string[]) {
  const t = target.trim();
  if (JS_PROTO.test(t)) {
    addUnique(issues, MSG_JS_PROTO);
  } else if (DATA_HTML.test(t)) {
    addUnique(issues, MSG_DATA_HTML);
  } else if (/^(https?:)?\/\//i.test(t) && !isTrustedUrl(t)) {
    addUnique(warnings, `External url() reference: "${t}" — potential beacon/exfiltration`);
  }
}

function auditImportTarget(target: string, warnings: string[]) {
  if (!isTrustedUrl(target)) {
    addUnique(warnings, `Untrusted @import: "${target}" — verify before deploying`);
  }
}

// Pattern battery — run over both raw and escape-decoded text
function scanText(css: string, issues: string[], warnings: string[]) {
  if (EXPRESSION.test(css)) addUnique(issues, MSG_EXPRESSION);
  if (BEHAVIOR.test(css)) addUnique(issues, MSG_BEHAVIOR);
  if (MOZ_BINDING.test(css)) addUnique(issues, MSG_MOZ_BINDING);
  if (JS_PROTO.test(css)) addUnique(issues, MSG_JS_PROTO);
  if (DATA_HTML.test(css)) addUnique(issues, MSG_DATA_HTML);

  URL_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_TOKEN.exec(css)) !== null) {
    auditUrlTarget(m[1] ?? m[2] ?? m[3] ?? '', issues, warnings);
  }

  IMPORT_TARGET.lastIndex = 0;
  while ((m = IMPORT_TARGET.exec(css)) !== null) {
    auditImportTarget(m[2], warnings);
  }
}

// Structure-aware pass: walk the PostCSS AST so at-rule names and declaration
// properties are audited after escape-decoding, independent of text layout.
function scanAst(css: string, issues: string[], warnings: string[]): boolean {
  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch {
    return false;
  }

  root.walkAtRules((at) => {
    const name = cssUnescape(at.name).toLowerCase();
    if (name === 'import') {
      const params = cssUnescape(at.params);
      const target = params.replace(/^url\s*\(\s*/i, '').replace(/\)\s*$/, '').replace(/^['"]|['"]$/g, '').trim();
      if (target) auditImportTarget(target, warnings);
    }
  });

  root.walkDecls((decl) => {
    const prop = cssUnescape(decl.prop).toLowerCase();
    const value = cssUnescape(decl.value);
    if (prop === 'behavior') addUnique(issues, MSG_BEHAVIOR);
    if (prop === '-moz-binding') addUnique(issues, MSG_MOZ_BINDING);
    if (EXPRESSION.test(value)) addUnique(issues, MSG_EXPRESSION);
    if (JS_PROTO.test(value)) addUnique(issues, MSG_JS_PROTO);
    if (DATA_HTML.test(value)) addUnique(issues, MSG_DATA_HTML);

    URL_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_TOKEN.exec(value)) !== null) {
      auditUrlTarget(m[1] ?? m[2] ?? m[3] ?? '', issues, warnings);
    }
  });

  return true;
}

function detectVarExplosion(css: string, warnings: string[]) {
  const varDecls = css.match(/--[\w-]+/g);
  if (!varDecls) return;

  const unique = new Set(varDecls);
  if (unique.size > 50) {
    addUnique(warnings, `Large number of CSS custom properties (${unique.size}) — possible DoS via var() explosion`);
  }
}

export function auditCustomCss(css: unknown): CssAuditResult {
  if (typeof css !== 'string' || css.trim().length === 0) {
    return { safe: true, issues: [], warnings: [] };
  }

  const issues: string[] = [];
  const warnings: string[] = [];
  const cleaned = stripComments(css);
  const decoded = cssUnescape(cleaned);

  // Layer 1+2: pattern battery over raw and escape-decoded text
  scanText(cleaned, issues, warnings);
  scanText(decoded, issues, warnings);

  // Layer 3: AST walk (escape-aware at-rule/property inspection)
  const parsed = scanAst(cleaned, issues, warnings);
  if (!parsed) {
    addUnique(warnings, 'CSS could not be parsed as a stylesheet — audited via pattern scan only');
  }

  detectVarExplosion(cleaned, warnings);

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
    const decoded = cssUnescape(stripComments(value));

    if (JS_PROTO.test(value) || JS_PROTO.test(decoded)) {
      addUnique(issues, `cssVar "${key}" contains javascript: URI`);
    }
    if (DATA_HTML.test(value) || DATA_HTML.test(decoded)) {
      addUnique(issues, `cssVar "${key}" contains data:text/html URI`);
    }
    if (EXPRESSION.test(value) || EXPRESSION.test(decoded)) {
      addUnique(issues, `cssVar "${key}" contains expression()`);
    }

    URL_TOKEN.lastIndex = 0;
    if (URL_TOKEN.test(decoded)) {
      addUnique(warnings, `cssVar "${key}" contains url() reference`);
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    warnings,
  };
}
