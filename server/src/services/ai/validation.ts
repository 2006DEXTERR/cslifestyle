import type { AiJobType } from '@prisma/client';

/**
 * Quality validation (spec §10.5). Each generated job is validated before it can be
 * stored as `done` and approved. JSON-shaped jobs (pros/cons/faq) must parse to the
 * expected structure; text jobs must meet length bounds and contain no unresolved
 * `{{placeholders}}` or model-refusal phrases.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** Parsed JSON value for structured jobs (pros/cons/faq), when valid. */
  parsed?: unknown;
}

const REFUSAL = /\b(as an ai|i cannot|i can't|i'm sorry|i am unable|cannot help)\b/i;
const HAS_PLACEHOLDER = /\{\{\s*\w+\s*\}\}/;

const MAX_LEN: Partial<Record<AiJobType, number>> = {
  title: 80,
  meta_description: 175,
};
const MIN_LEN: Partial<Record<AiJobType, number>> = {
  description: 40,
  guide: 80,
  verdict: 80,
  category_description: 30,
};

function validateText(text: string, jobType: AiJobType, errors: string[]): void {
  if (HAS_PLACEHOLDER.test(text)) errors.push('Contains unresolved {{placeholder}}');
  if (REFUSAL.test(text)) errors.push('Looks like a model refusal, not content');
  const max = MAX_LEN[jobType];
  if (max && text.length > max) errors.push(`Exceeds max length ${max} (${text.length})`);
  const min = MIN_LEN[jobType];
  if (min && text.length < min) errors.push(`Below min length ${min} (${text.length})`);
}

function parseJson(text: string, errors: string[]): unknown {
  try {
    return JSON.parse(text);
  } catch {
    errors.push('Expected valid JSON');
    return undefined;
  }
}

export function validateGeneration(text: string, jobType: AiJobType): ValidationResult {
  const errors: string[] = [];
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { valid: false, errors: ['Empty generation'] };

  if (jobType === 'pros' || jobType === 'cons') {
    const parsed = parseJson(trimmed, errors) as { pros?: unknown; cons?: unknown } | undefined;
    if (parsed) {
      if (!Array.isArray(parsed.pros) || parsed.pros.length === 0) errors.push('Missing non-empty "pros" array');
      if (!Array.isArray(parsed.cons) || parsed.cons.length === 0) errors.push('Missing non-empty "cons" array');
    }
    return { valid: errors.length === 0, errors, parsed };
  }

  if (jobType === 'faq') {
    const parsed = parseJson(trimmed, errors) as { question?: unknown; answer?: unknown }[] | undefined;
    if (parsed) {
      if (!Array.isArray(parsed) || parsed.length !== 5) errors.push('Expected exactly 5 FAQ items');
      else if (!parsed.every((f) => typeof f?.question === 'string' && typeof f?.answer === 'string'))
        errors.push('Each FAQ item needs string question + answer');
    }
    return { valid: errors.length === 0, errors, parsed };
  }

  validateText(trimmed, jobType, errors);
  return { valid: errors.length === 0, errors };
}
