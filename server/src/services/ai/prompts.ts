import type { AiJobType } from '@prisma/client';
import { getSetting, setSetting } from '../settings.service';

/**
 * Admin-editable prompt templates (FR-054, spec §10). The 10 template types from
 * §10 are stored as JSON Settings rows in the `ai_prompts` group, keyed
 * `ai.prompt.<type>`. Defaults below are used until an admin overrides a template
 * via PUT /api/ai/prompts/{type}. Templates use `{{var}}` placeholders rendered by
 * `renderPrompt`.
 */
export const PROMPT_TEMPLATE_TYPES = [
  'title',
  'meta',
  'description',
  'pros_cons',
  'faq',
  'guide',
  'comparison',
  'category',
  'schema',
  'internal_links',
] as const;

export type PromptTemplateType = (typeof PROMPT_TEMPLATE_TYPES)[number];

export function isPromptTemplateType(v: string): v is PromptTemplateType {
  return (PROMPT_TEMPLATE_TYPES as readonly string[]).includes(v);
}

const SETTING_GROUP = 'ai_prompts';
const keyFor = (t: PromptTemplateType): string => `ai.prompt.${t}`;

/** Map a queue job type to the prompt template it renders from. */
export const JOB_TO_TEMPLATE: Record<AiJobType, PromptTemplateType> = {
  title: 'title',
  meta_description: 'meta',
  description: 'description',
  pros: 'pros_cons',
  cons: 'pros_cons',
  faq: 'faq',
  verdict: 'comparison',
  guide: 'guide',
  category_description: 'category',
};

export const DEFAULT_PROMPTS: Record<PromptTemplateType, string> = {
  title:
    'Write a concise, SEO-optimised product title (max 70 chars) for the Amazon India product ' +
    '"{{title}}" by {{brand}} in the {{category}} category. Return only the title text.',
  meta:
    'Write a compelling meta description (max 160 chars) for the product "{{title}}" by {{brand}} ' +
    '({{category}}). Include a benefit and a call to action. Return only the description.',
  description:
    'Write an engaging, factual 120-180 word product description for "{{title}}" by {{brand}} in ' +
    '{{category}}. Highlight key features: {{features}}. Avoid hype and unverifiable claims. ' +
    'Return only the description text.',
  pros_cons:
    'List the pros and cons of the product "{{title}}" by {{brand}} ({{category}}). ' +
    'Return STRICT JSON: {"pros": string[], "cons": string[]} with 3-5 items each. No prose.',
  faq:
    'Generate exactly 5 frequently asked questions with helpful answers for the product ' +
    '"{{title}}" by {{brand}} ({{category}}). Return STRICT JSON: ' +
    '[{"question": string, "answer": string}] with 5 items. No prose.',
  guide:
    'Write a structured buying guide section for "{{title}}" in the {{category}} category. ' +
    'Cover what to look for, key criteria, and a recommendation. 200-300 words. Return only the text.',
  comparison:
    'Write a 250-300 word verdict comparing "{{productA}}" and "{{productB}}". Declare a clear ' +
    'winner and justify it on value, features, and use case. Return only the verdict text.',
  category:
    'Write a 60-100 word category landing description for the "{{name}}" category on an Amazon ' +
    'India affiliate site. SEO-friendly, no keyword stuffing. Return only the text.',
  schema:
    'Generate JSON-LD Product schema fields (name, description, brand) for "{{title}}" by ' +
    '{{brand}}. Return STRICT JSON only.',
  internal_links:
    'Suggest 3-5 relevant internal link anchor texts and target slugs for the product "{{title}}" ' +
    'in {{category}}. Return STRICT JSON: [{"anchor": string, "slug": string}]. No prose.',
};

/** Render `{{var}}` placeholders from `vars` (missing vars → empty string). */
export function renderPrompt(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? '');
}

/** The effective template for a type (admin override falls back to the default). */
export async function getPrompt(type: PromptTemplateType): Promise<string> {
  return (await getSetting(keyFor(type))) ?? DEFAULT_PROMPTS[type];
}

/** All 10 templates with their current (possibly default) text + whether customised. */
export async function getAllPrompts(): Promise<
  { type: PromptTemplateType; template: string; isDefault: boolean }[]
> {
  return Promise.all(
    PROMPT_TEMPLATE_TYPES.map(async (type) => {
      const stored = await getSetting(keyFor(type));
      return { type, template: stored ?? DEFAULT_PROMPTS[type], isDefault: stored == null };
    }),
  );
}

/** Persist an admin-edited template (FR-054). */
export async function setPrompt(type: PromptTemplateType, template: string): Promise<void> {
  await setSetting(keyFor(type), template, { type: 'text', group: SETTING_GROUP });
}

/** Reset a template to its built-in default (clears the override). */
export async function resetPrompt(type: PromptTemplateType): Promise<void> {
  await setSetting(keyFor(type), DEFAULT_PROMPTS[type], { type: 'text', group: SETTING_GROUP });
}
