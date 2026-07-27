import { describe, expect, it } from 'vitest';
import { sanitizeExtensions, sanitizeHtml } from '../src/lib/html-sanitizer';

describe('sanitizeHtml', () => {
  it('leaves clean allowed HTML untouched', () => {
    const input = '<div class="box"><p>Hello <strong>world</strong></p></div>';
    const result = sanitizeHtml(input);
    expect(result.clean).toBe(input);
    expect(result.modified).toBe(false);
    expect(result.flagged).toEqual([]);
  });

  it('strips quoted event handlers', () => {
    const result = sanitizeHtml('<div onclick="alert(1)">hi</div>');
    expect(result.clean).not.toContain('onclick');
    expect(result.modified).toBe(true);
    expect(result.flagged.some((f) => f.includes('event handler'))).toBe(true);
  });

  it('strips unquoted event handlers', () => {
    const result = sanitizeHtml('<img src=x onerror=alert(1)>');
    expect(result.clean).not.toContain('onerror');
    expect(result.modified).toBe(true);
  });

  it('strips javascript: protocol in href', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(String(result.clean)).not.toMatch(/href\s*=\s*['"]?\s*javascript/i);
    expect(result.modified).toBe(true);
  });

  it('strips data:text/html in src', () => {
    const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(String(result.clean)).not.toContain('data:text/html');
    expect(result.modified).toBe(true);
  });

  it('removes <script> blocks entirely', () => {
    const result = sanitizeHtml('before<script>document.cookie</script>after');
    expect(result.clean).toBe('beforeafter');
    expect(result.flagged).toContain('Stripped <script> tag');
  });

  it('removes <iframe> blocks entirely', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
    expect(result.clean).toBe('');
    expect(result.flagged).toContain('Stripped <iframe> tag');
  });

  it('removes disallowed tags but keeps allowed ones', () => {
    const result = sanitizeHtml('<div><marquee>hi</marquee></div>');
    expect(String(result.clean)).not.toContain('<marquee');
    expect(String(result.clean)).toContain('<div>');
    expect(result.modified).toBe(true);
  });

  it('keeps allowed SVG elements', () => {
    const input = '<svg viewbox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"></circle></svg>';
    const result = sanitizeHtml(input);
    expect(result.clean).toBe(input);
    expect(result.modified).toBe(false);
  });

  it('passes non-string input through', () => {
    const result = sanitizeHtml(123);
    expect(result.clean).toBe(123);
    expect(result.modified).toBe(false);
  });
});

describe('sanitizeExtensions', () => {
  it('passes non-array input through', () => {
    const result = sanitizeExtensions({ html: '<script>x</script>' });
    expect(result.modified).toBe(false);
  });

  it('sanitizes html-bearing string fields inside each extension', () => {
    const result = sanitizeExtensions([
      { type: 'widget', html: '<div onclick="evil()">a</div>' },
      { type: 'footer', html: '<p>fine</p>' },
    ]);
    expect(result.modified).toBe(true);
    const cleaned = result.clean as Array<{ html: string }>;
    expect(cleaned[0].html).not.toContain('onclick');
    expect(cleaned[1].html).toBe('<p>fine</p>');
  });

  it('does not mutate the original extension objects', () => {
    const original = [{ type: 'widget', html: '<div onclick="evil()">a</div>' }];
    sanitizeExtensions(original);
    expect(original[0].html).toContain('onclick');
  });
});
