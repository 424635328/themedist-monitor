import { describe, expect, it } from 'vitest';
import { auditCssVars, auditCustomCss } from '../src/lib/css-analyzer';

describe('auditCustomCss', () => {
  it('treats empty/non-string input as safe', () => {
    expect(auditCustomCss(undefined).safe).toBe(true);
    expect(auditCustomCss('').safe).toBe(true);
    expect(auditCustomCss(42).safe).toBe(true);
  });

  it('passes ordinary CSS', () => {
    const result = auditCustomCss('.hero { color: #fff; background: var(--bg); }');
    expect(result.safe).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    ['expression()', 'a { width: expression(alert(1)); }', 'expression'],
    ['behavior property', 'a { behavior: url(evil.htc); }', 'behavior'],
    ['-moz-binding', 'a { -moz-binding: url(x.xml#p); }', '-moz-binding'],
    ['javascript: URI', 'a { background: url(javascript:alert(1)); }', 'javascript'],
    ['data:text/html URI', 'a { background: url(data:text/html,<script>1</script>); }', 'data:text/html'],
  ])('flags %s as a hard issue', (_label, css, needle) => {
    const result = auditCustomCss(css);
    expect(result.safe).toBe(false);
    expect(result.issues.some((i) => i.toLowerCase().includes(needle))).toBe(true);
  });

  it('catches payloads hidden by CSS comments', () => {
    const result = auditCustomCss('a { width: expr/* split */ession(alert(1)); }');
    // comment stripping re-joins the token
    expect(result.safe).toBe(false);
  });

  it('warns on untrusted external url() references', () => {
    const result = auditCustomCss('a { background: url("https://evil.example/beacon.png"); }');
    expect(result.safe).toBe(true); // warning, not hard issue
    expect(result.warnings.some((w) => w.includes('evil.example'))).toBe(true);
  });

  it('does not warn on trusted CDN url() references', () => {
    const result = auditCustomCss(
      "@font-face { src: url('https://fonts.gstatic.com/s/font.woff2'); }"
    );
    expect(result.warnings).toEqual([]);
  });

  it('warns on untrusted @import targets', () => {
    const result = auditCustomCss('@import "https://evil.example/steal.css";');
    expect(result.warnings.some((w) => w.includes('evil.example'))).toBe(true);
  });

  it('does not warn on trusted @import targets', () => {
    const result = auditCustomCss('@import url("https://fonts.googleapis.com/css2?family=Inter");');
    expect(result.warnings).toEqual([]);
  });

  it('warns on suspiciously many custom properties (DoS heuristic)', () => {
    const css = Array.from({ length: 60 }, (_, i) => `--v${i}: ${i};`).join('\n');
    const result = auditCustomCss(`:root { ${css} }`);
    expect(result.warnings.some((w) => w.includes('DoS'))).toBe(true);
  });
});

describe('escape/structure evasion (AST + decode layer)', () => {
  it('decodes CSS hex escapes hiding expression()', () => {
    const result = auditCustomCss('a { width: expr\\65 ssion(alert(1)); }');
    expect(result.safe).toBe(false);
    expect(result.issues.some((i) => i.includes('expression'))).toBe(true);
  });

  it('decodes CSS hex escapes hiding javascript: protocol', () => {
    const result = auditCustomCss('a { background: url(java\\73 cript:alert(1)); }');
    expect(result.safe).toBe(false);
    expect(result.issues.some((i) => i.includes('javascript'))).toBe(true);
  });

  it('decodes escaped at-rule names hiding @import', () => {
    const result = auditCustomCss('@\\69 mport "https://evil.example/x.css";');
    expect(result.warnings.some((w) => w.includes('evil.example'))).toBe(true);
  });

  it('catches unquoted @import url(...) targets', () => {
    const result = auditCustomCss('@import url(https://evil.example/x.css);');
    expect(result.warnings.some((w) => w.includes('evil.example'))).toBe(true);
  });

  it('stays silent for trusted unquoted @import url(...) targets', () => {
    const result = auditCustomCss('@import url(https://fonts.googleapis.com/css2?family=Inter);');
    expect(result.warnings).toEqual([]);
  });

  it('catches unquoted external url() references', () => {
    const result = auditCustomCss('a { background: url(https://evil.example/beacon.png); }');
    expect(result.warnings.some((w) => w.includes('evil.example'))).toBe(true);
  });

  it('catches protocol-relative url() references', () => {
    const result = auditCustomCss('a { background: url(//evil.example/p.png); }');
    expect(result.warnings.some((w) => w.includes('//evil.example'))).toBe(true);
  });

  it('still audits CSS that fails to parse, via pattern scan', () => {
    const result = auditCustomCss('a { width: expression(alert(1))');
    expect(result.safe).toBe(false);
  });

  it('does not double-report the same finding across scan layers', () => {
    const result = auditCustomCss('a { width: expression(alert(1)); }');
    const expressionHits = result.issues.filter((i) => i.includes('expression'));
    expect(expressionHits).toHaveLength(1);
  });
});

describe('auditCssVars', () => {
  it('treats missing input as safe', () => {
    expect(auditCssVars(undefined).safe).toBe(true);
  });

  it('passes ordinary variable values', () => {
    const result = auditCssVars({ '--color-bg': '#0a0a0f', '--radius': '8px' });
    expect(result.safe).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('flags javascript: URIs as hard issues', () => {
    const result = auditCssVars({ '--x': 'javascript:alert(1)' });
    expect(result.safe).toBe(false);
    expect(result.issues.some((i) => i.includes('--x'))).toBe(true);
  });

  it('warns on external url() references in values', () => {
    const result = auditCssVars({ '--bg': 'url(https://evil.example/track.gif)' });
    expect(result.safe).toBe(true);
    expect(result.warnings.some((w) => w.includes('--bg'))).toBe(true);
  });

  it('decodes hex escapes hiding javascript: in variable values', () => {
    const result = auditCssVars({ '--x': 'java\\73 cript:alert(1)' });
    expect(result.safe).toBe(false);
  });

  it('flags expression() in variable values', () => {
    const result = auditCssVars({ '--w': 'expression(alert(1))' });
    expect(result.safe).toBe(false);
  });
});
