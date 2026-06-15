import { describe, it, expect } from 'vitest';
import { renderPrompt, JOB_TO_TEMPLATE, DEFAULT_PROMPTS, PROMPT_TEMPLATE_TYPES, isPromptTemplateType } from '../../src/services/ai/prompts';
import { validateGeneration } from '../../src/services/ai/validation';
import { generate, __test__ } from '../../src/services/ai/providers';

describe('prompt templates + rendering (FR-054)', () => {
  it('renders {{placeholders}} and blanks missing vars', () => {
    expect(renderPrompt('Title for {{title}} by {{brand}}', { title: 'X1', brand: 'Acme' })).toBe('Title for X1 by Acme');
    expect(renderPrompt('Hi {{missing}}!', {})).toBe('Hi !');
  });

  it('has a default template + job→template mapping for every type', () => {
    expect(PROMPT_TEMPLATE_TYPES.length).toBe(10);
    for (const t of PROMPT_TEMPLATE_TYPES) expect(DEFAULT_PROMPTS[t].length).toBeGreaterThan(10);
    expect(JOB_TO_TEMPLATE.title).toBe('title');
    expect(JOB_TO_TEMPLATE.pros).toBe('pros_cons');
    expect(JOB_TO_TEMPLATE.verdict).toBe('comparison');
  });

  it('guards prompt-type strings', () => {
    expect(isPromptTemplateType('faq')).toBe(true);
    expect(isPromptTemplateType('nope')).toBe(false);
  });
});

describe('quality validation (§10.5)', () => {
  it('rejects empty, placeholder, and refusal text', () => {
    expect(validateGeneration('', 'description').valid).toBe(false);
    expect(validateGeneration('Buy {{title}} now from our store today!', 'description').valid).toBe(false);
    expect(validateGeneration('As an AI, I cannot help with that request here.', 'description').valid).toBe(false);
  });

  it('enforces title max length and description min length', () => {
    expect(validateGeneration('Short title', 'title').valid).toBe(true);
    expect(validateGeneration('x'.repeat(120), 'title').valid).toBe(false);
    expect(validateGeneration('too short', 'description').valid).toBe(false);
  });

  it('parses pros/cons JSON and requires both arrays', () => {
    const ok = validateGeneration(JSON.stringify({ pros: ['a'], cons: ['b'] }), 'pros');
    expect(ok.valid).toBe(true);
    expect(ok.parsed).toEqual({ pros: ['a'], cons: ['b'] });
    expect(validateGeneration(JSON.stringify({ pros: [] , cons: ['b'] }), 'pros').valid).toBe(false);
    expect(validateGeneration('not json', 'pros').valid).toBe(false);
  });

  it('requires exactly 5 well-formed FAQ items', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));
    expect(validateGeneration(JSON.stringify(five), 'faq').valid).toBe(true);
    expect(validateGeneration(JSON.stringify(five.slice(0, 3)), 'faq').valid).toBe(false);
  });
});

describe('provider abstraction — mock driver (FR-053)', () => {
  it('generates deterministic, zero-cost content for text jobs', async () => {
    const r = await generate({ prompt: 'p', jobType: 'title', entityName: 'Acme Buds' });
    expect(r.provider).toBe('mock');
    expect(r.costUsd).toBe(0);
    expect(r.text).toContain('Acme Buds');
    expect(r.tokensOutput).toBeGreaterThan(0);
  });

  it('returns valid JSON for pros/cons and faq jobs', async () => {
    const pros = await generate({ prompt: 'p', jobType: 'pros', entityName: 'Widget' });
    expect(validateGeneration(pros.text, 'pros').valid).toBe(true);
    const faq = await generate({ prompt: 'p', jobType: 'faq', entityName: 'Widget' });
    expect(validateGeneration(faq.text, 'faq').valid).toBe(true);
  });

  it('computes non-zero cost for a priced model', () => {
    expect(__test__.costFor('claude-3-5-sonnet-latest', 1_000_000, 1_000_000)).toBeCloseTo(18, 5);
    expect(__test__.costFor('mock', 1000, 1000)).toBe(0);
  });
});
