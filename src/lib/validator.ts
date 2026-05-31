import type { TodayJsonResponse } from '@/types';

const REQUIRED_TOP_LEVEL = ['date', 'preset', 'presetName', 'cssVars', 'layerContext', 'apiVersion'];
const REQUIRED_CSS_VARS = ['--color-primary', '--color-bg'];
const MIN_CSS_VARS = 48;
const MAX_CSS_VARS = 60;

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

  // Validate apiVersion
  if (obj.apiVersion !== undefined && typeof obj.apiVersion !== 'string') {
    errors.push('"apiVersion" should be a string');
  }

  // Validate customCss
  if (obj.customCss !== undefined && obj.customCss !== null && typeof obj.customCss !== 'string') {
    errors.push('"customCss" should be a string or null');
  }

  // Validate extensions
  if (obj.extensions !== undefined && obj.extensions !== null && !Array.isArray(obj.extensions)) {
    errors.push('"extensions" should be an array or null');
  }

  // Validate logoText
  if (obj.logoText !== undefined && obj.logoText !== null && typeof obj.logoText !== 'string') {
    errors.push('"logoText" should be a string or null');
  }

  // Validate logoColors
  if (obj.logoColors !== undefined && obj.logoColors !== null && !Array.isArray(obj.logoColors)) {
    errors.push('"logoColors" should be an array or null');
  }

  // Validate dailyIsCommunity
  if (obj.dailyIsCommunity !== undefined && typeof obj.dailyIsCommunity !== 'boolean') {
    errors.push('"dailyIsCommunity" should be a boolean');
  }

  // Validate layerContext
  if (obj.layerContext !== undefined) {
    if (typeof obj.layerContext !== 'object' || obj.layerContext === null) {
      errors.push('"layerContext" should be an object');
    }
  }

  // Validate clickEffect
  if (obj.clickEffect !== null && obj.clickEffect !== undefined) {
    if (typeof obj.clickEffect !== 'object') {
      errors.push('"clickEffect" should be an object or null');
    } else if (!Array.isArray(obj.clickEffect.spawn)) {
      errors.push('"clickEffect.spawn" should be an array');
    }
  }

  return { valid: errors.length === 0, errors };
}
