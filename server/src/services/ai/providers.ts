import type { AiJobType } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Provider abstraction (FR-053, spec §10): Claude (primary) → OpenAI (fallback) →
 * Gemini. `AI_DRIVER=mock` (dev/test/CI) returns deterministic, zero-cost content
 * with no network; `live` calls the real provider REST APIs with ordered fallback.
 */

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'mock';

export interface GenerationRequest {
  prompt: string;
  jobType: AiJobType;
  /** Hint for the mock so JSON-shaped jobs (pros/cons/faq) return valid JSON. */
  entityName?: string;
}

export interface GenerationResult {
  text: string;
  provider: ProviderId;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

// USD per 1M tokens (input, output). Approximate public list prices.
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-3-5-sonnet-latest': { in: 3, out: 15 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gemini-1.5-pro': { in: 1.25, out: 5 },
  mock: { in: 0, out: 0 },
};

const estimateTokens = (s: string): number => Math.max(1, Math.ceil(s.length / 4));

function costFor(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? { in: 0, out: 0 };
  return Number(((tokensIn / 1e6) * p.in + (tokensOut / 1e6) * p.out).toFixed(6));
}

const JSON_JOBS: AiJobType[] = ['pros', 'cons', 'faq'];

/** Deterministic, offline mock generation (default driver). */
function generateMock(req: GenerationRequest): GenerationResult {
  const name = req.entityName?.trim() || 'this product';
  let text: string;
  if (req.jobType === 'pros') {
    text = JSON.stringify({
      pros: [`Great value for ${name}`, 'Solid build quality', 'Reliable performance'],
      cons: ['Limited colour options', 'No carrying case included'],
    });
  } else if (req.jobType === 'cons') {
    text = JSON.stringify({
      pros: [`${name} is easy to use`, 'Good battery life'],
      cons: ['Premium price', 'App could be better'],
    });
  } else if (req.jobType === 'faq') {
    text = JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({
        question: `Q${i + 1}: What should I know about ${name}?`,
        answer: `Answer ${i + 1}: ${name} is designed for everyday use and offers good value.`,
      })),
    );
  } else if (req.jobType === 'title') {
    text = `${name} — Best Value Pick (2026 Review)`;
  } else if (req.jobType === 'meta_description') {
    text = `Discover ${name}: features, pros & cons, and price. Read our expert review and buy smart.`;
  } else {
    text = `${name} is a strong choice in its category. This AI-generated draft summarises its key ` +
      `features, value, and ideal use cases for buyers. Reviewed and ready for editor approval.`;
  }
  const tokensInput = estimateTokens(req.prompt);
  const tokensOutput = estimateTokens(text);
  return { text, provider: 'mock', model: 'mock', tokensInput, tokensOutput, costUsd: 0 };
}

async function callAnthropic(req: GenerationRequest): Promise<GenerationResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: req.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    content: { text: string }[];
    usage?: { input_tokens: number; output_tokens: number };
  };
  const text = data.content?.map((c) => c.text).join('').trim() ?? '';
  const tokensInput = data.usage?.input_tokens ?? estimateTokens(req.prompt);
  const tokensOutput = data.usage?.output_tokens ?? estimateTokens(text);
  return {
    text,
    provider: 'anthropic',
    model: env.ANTHROPIC_MODEL,
    tokensInput,
    tokensOutput,
    costUsd: costFor(env.ANTHROPIC_MODEL, tokensInput, tokensOutput),
  };
}

async function callOpenAI(req: GenerationRequest): Promise<GenerationResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENAI_API_KEY ?? ''}` },
    body: JSON.stringify({ model: env.OPENAI_MODEL, messages: [{ role: 'user', content: req.prompt }] }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  const tokensInput = data.usage?.prompt_tokens ?? estimateTokens(req.prompt);
  const tokensOutput = data.usage?.completion_tokens ?? estimateTokens(text);
  return {
    text,
    provider: 'openai',
    model: env.OPENAI_MODEL,
    tokensInput,
    tokensOutput,
    costUsd: costFor(env.OPENAI_MODEL, tokensInput, tokensOutput),
  };
}

async function callGemini(req: GenerationRequest): Promise<GenerationResult> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GOOGLE_AI_MODEL}:generateContent` +
    `?key=${env.GOOGLE_AI_API_KEY ?? ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: req.prompt }] }] }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() ?? '';
  const tokensInput = data.usageMetadata?.promptTokenCount ?? estimateTokens(req.prompt);
  const tokensOutput = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(text);
  return {
    text,
    provider: 'gemini',
    model: env.GOOGLE_AI_MODEL,
    tokensInput,
    tokensOutput,
    costUsd: costFor(env.GOOGLE_AI_MODEL, tokensInput, tokensOutput),
  };
}

const CALLERS: Record<Exclude<ProviderId, 'mock'>, (r: GenerationRequest) => Promise<GenerationResult>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

/** Has a usable API key (so we know which live providers to try / show as active). */
export function providerConfigured(p: Exclude<ProviderId, 'mock'>): boolean {
  if (p === 'anthropic') return Boolean(env.ANTHROPIC_API_KEY);
  if (p === 'openai') return Boolean(env.OPENAI_API_KEY);
  return Boolean(env.GOOGLE_AI_API_KEY);
}

/** Ordered live providers: primary first, then the others as fallback (§10). */
export function providerOrder(): Exclude<ProviderId, 'mock'>[] {
  const all: Exclude<ProviderId, 'mock'>[] = ['anthropic', 'openai', 'gemini'];
  const primary = env.AI_PRIMARY_PROVIDER;
  return [primary, ...all.filter((p) => p !== primary)];
}

/**
 * Generate content for one job. Mock driver is offline + deterministic; live driver
 * tries the primary provider then falls back through the rest. JSON_JOBS callers must
 * still validate the returned text (see validation.ts).
 */
export async function generate(req: GenerationRequest): Promise<GenerationResult> {
  if (env.AI_DRIVER === 'mock') return generateMock(req);

  const order = providerOrder().filter(providerConfigured);
  if (order.length === 0) {
    logger.warn('AI_DRIVER=live but no provider API keys configured — falling back to mock');
    return generateMock(req);
  }
  let lastErr: unknown;
  for (const p of order) {
    try {
      return await CALLERS[p](req);
    } catch (err) {
      lastErr = err;
      logger.warn({ provider: p, err }, 'AI provider failed; trying fallback');
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All AI providers failed');
}

export const __test__ = { generateMock, costFor, estimateTokens, JSON_JOBS };
