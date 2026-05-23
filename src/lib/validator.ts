import type { TodayJsonResponse } from '@/types';

const REQUIRED_TOP_LEVEL = ['date', 'preset', 'presetName', 'cssVars'];
const REQUIRED_CSS_VARS = ['--color-primary', '--color-bg'];
const MIN_CSS_VARS = 28;
const MAX_CSS_VARS = 34;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTodayJson(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not a valid JSON object'] };
  }

  const obj = data as TodayJsonResponse;

  for (const field of REQUIRED_TOP_LEVEL) {
    if (!(field in obj)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (obj.cssVars && typeof obj.cssVars === 'object') {
    const vars = Object.keys(obj.cssVars);
    if (vars.length < MIN_CSS_VARS) {
      errors.push(`cssVars has ${vars.length} variables, expected at least ${MIN_CSS_VARS}`);
    }
    if (vars.length > MAX_CSS_VARS) {
      errors.push(`cssVars has ${vars.length} variables, expected at most ${MAX_CSS_VARS}`);
    }
    for (const requiredVar of REQUIRED_CSS_VARS) {
      if (!(requiredVar in obj.cssVars)) {
        errors.push(`Missing required cssVar: "${requiredVar}"`);
      }
    }
  } else {
    errors.push('cssVars is missing or not an object');
  }

  if (obj.available !== undefined && typeof obj.available !== 'number') {
    errors.push('"available" should be a number');
  }

  return { valid: errors.length === 0, errors };
}
