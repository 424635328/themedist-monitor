const MALICIOUS_PATTERNS: RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /alert\s*\(/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /<[^>]*on\w+\s*=[^>]*>/gi,
  /document\.cookie/gi,
  /eval\s*\(/gi,
  /<iframe\b[^>]*>/gi,
  /expression\s*\(/gi,
  /-moz-binding/gi,
  /data\s*:\s*text\/html/gi,
];

export interface SecurityCheckResult {
  isSafe: boolean;
  flaggedReasons: string[];
}

function scanValue(value: unknown, path: string, results: SecurityCheckResult) {
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

export function scanForXSS(data: unknown): SecurityCheckResult {
  const result: SecurityCheckResult = { isSafe: true, flaggedReasons: [] };
  scanValue(data, 'root', result);
  return result;
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
