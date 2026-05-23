export interface SanitizeResult {
  clean: unknown;
  modified: boolean;
  flagged: string[];
}

const ALLOWED_TAGS = new Set([
  'div', 'span', 'p', 'br', 'hr', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
  'blockquote', 'a', 'img', 'svg', 'path', 'circle', 'rect',
]);

const ALLOWED_ATTRS = new Set([
  'class', 'id', 'style', 'href', 'src', 'alt',
  'width', 'height', 'viewbox', 'd', 'fill', 'stroke',
  'stroke-width', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry',
  'target', 'rel', 'title',
]);

const EVENT_HANDLER_RE = /^on\w+$/i;
const JS_PROTO_RE = /^\s*javascript\s*:/i;
const DATA_HTML_RE = /^\s*data\s*:\s*text\/html/i;

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function sanitizeTag(tag: string): string | null {
  const match = tag.match(/^<\/?(\w+)/);
  if (!match) return null;
  const tagName = match[1].toLowerCase();
  if (!ALLOWED_TAGS.has(tagName)) return null;
  return tagName;
}

export function sanitizeHtml(html: unknown): SanitizeResult {
  if (typeof html !== 'string') {
    return { clean: html, modified: false, flagged: [] };
  }

  const flagged: string[] = [];
  let modified = false;
  const original = html;

  // Remove event handlers (onclick, onerror, onload, etc.)
  let cleaned = html.replace(/<[^>]*\s+on\w+\s*=\s*(['"]?)[^'"]*\1[^>]*>/gi, (match) => {
    flagged.push(`Stripped event handler: ${match.slice(0, 60)}`);
    modified = true;
    return match.replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
  });

  // Strip javascript: protocol in href/src
  cleaned = cleaned.replace(/(href|src)\s*=\s*(['"])\s*javascript\s*:/gi, (match, attr) => {
    flagged.push(`Stripped javascript: in ${attr}`);
    modified = true;
    return `${attr}=`;
  });

  // Strip data:text/html
  cleaned = cleaned.replace(/(href|src)\s*=\s*(['"])data\s*:\s*text\/html/gi, (match, attr) => {
    flagged.push(`Stripped data:text/html in ${attr}`);
    modified = true;
    return `${attr}=`;
  });

  // Strip <script> tags completely
  cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, () => {
    flagged.push('Stripped <script> tag');
    modified = true;
    return '';
  });

  // Strip <iframe> tags
  cleaned = cleaned.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, () => {
    flagged.push('Stripped <iframe> tag');
    modified = true;
    return '';
  });

  // Strip unknown tags
  cleaned = cleaned.replace(/<\/?(\w+)[^>]*>/g, (match) => {
    const tn = sanitizeTag(match);
    if (tn) return match;

    // Check if it's a closing tag of an unknown element
    if (match.startsWith('</')) return '';
    if (match.endsWith('/>')) return '';

    flagged.push(`Removed disallowed tag: ${match.slice(0, 50)}`);
    modified = true;
    return '';
  });

  return { clean: cleaned, modified, flagged };
}

export function sanitizeExtensions(extensions: unknown): SanitizeResult {
  if (!Array.isArray(extensions)) {
    return { clean: extensions, modified: false, flagged: [] };
  }

  const allFlagged: string[] = [];
  let anyModified = false;

  const clean = extensions.map((ext) => {
    if (typeof ext !== 'object' || ext === null) return ext;

    const cleaned = { ...ext } as Record<string, unknown>;
    for (const [key, value] of Object.entries(cleaned)) {
      if (typeof value === 'string' && /<[a-z]/i.test(value)) {
        const result = sanitizeHtml(value);
        if (result.modified) {
          cleaned[key] = result.clean;
          anyModified = true;
          allFlagged.push(...result.flagged);
        }
      }
    }
    return cleaned;
  });

  return { clean, modified: anyModified, flagged: allFlagged };
}
