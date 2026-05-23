import { NextResponse } from 'next/server';
import { sanitizeObject } from '@/lib/security';
import { validateTodayJson } from '@/lib/validator';

export async function GET() {
  const errors: string[] = [];
  let rawData: Record<string, unknown> | null = null;

  // Try Vercel first, fall back to Netlify
  for (const platform of ['vercel', 'netlify'] as const) {
    const urls = {
      vercel: 'https://themedist.vercel.app/api/today.json',
      netlify: 'https://themedist.netlify.app/api/today.json',
    };

    try {
      const res = await fetch(urls[platform], {
        headers: { 'User-Agent': 'ThemeDist-Monitor/1.0' },
      });
      const data = await res.json();
      if (data && typeof data === 'object') {
        rawData = data as Record<string, unknown>;
        break;
      }
    } catch (err) {
      errors.push(`${platform}: ${(err as Error).message}`);
    }
  }

  if (!rawData) {
    return NextResponse.json(
      { error: 'Failed to fetch from both platforms', errors },
      { status: 502 }
    );
  }

  const sanitized = sanitizeObject(rawData);
  const validation = validateTodayJson(sanitized);

  return NextResponse.json({
    ...sanitized,
    _meta: {
      sanitized: true,
      schemaValid: validation.valid,
      schemaErrors: validation.valid ? undefined : validation.errors,
      timestamp: new Date().toISOString(),
    },
  });
}
