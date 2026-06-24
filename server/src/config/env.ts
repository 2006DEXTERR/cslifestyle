import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env (no-op if absent — CI/containers inject real env vars).
dotenv.config();

/**
 * Environment schema. Sensible dev defaults keep local/test boot frictionless,
 * but DATABASE_URL and REDIS_URL are REQUIRED in production (enforced below) so
 * we never silently ship pointing at localhost.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),
    API_PREFIX: z.string().startsWith('/').default('/api/v1'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://cslifestyle:cslifestyle@localhost:5432/cslifestyle?schema=public'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // Frontend base URL (used to build email verification / password reset links).
    APP_URL: z.string().url().default('http://localhost:3000'),

    // Auth / JWT
    JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me-please-32+chars'),
    ACCESS_TOKEN_TTL: z.string().default('15m'), // jsonwebtoken expiresIn syntax
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    EMAIL_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
    RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    // Optional pepper mixed into token hashes (defense in depth).
    TOKEN_PEPPER: z.string().default(''),

    // AES-256-GCM key for encrypting 2FA secrets at rest (32 bytes, hex or base64).
    ENCRYPTION_KEY: z.string().default('dev-encryption-key-change-me-32-bytes-minimum!!'),

    // Two-factor
    TWO_FACTOR_ISSUER: z.string().default('CSLifestyle'),
    BACKUP_CODES_COUNT: z.coerce.number().int().min(5).max(20).default(10),
    TWO_FACTOR_CHALLENGE_TTL: z.string().default('5m'), // login 2FA challenge token TTL

    // Email (Resend). If RESEND_API_KEY is unset, emails are logged (console provider).
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('CSLifestyle <onboarding@resend.dev>'),
    EMAIL_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

    // Rate limiting — use a Redis store (distributed) when true; else in-memory.
    RATE_LIMIT_REDIS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    // Background-job driver. 'inline' processes import jobs in-process (no Redis —
    // used in dev/test/CI). 'bullmq' enqueues to Redis-backed BullMQ queues +
    // requires the worker process (`npm run worker`). See ADR-023.
    QUEUE_DRIVER: z.enum(['inline', 'bullmq']).default('inline'),

    // AI content engine (Phase 7, spec §10). The provider abstraction calls Claude
    // (primary) → OpenAI (fallback) → Gemini. AI_DRIVER='mock' (default) generates
    // deterministic content with no external API + zero cost — used in dev/test/CI;
    // 'live' calls the real providers (keys below required). AI_CONCURRENCY = worker
    // concurrency (FR-051, default 4). Provider keys live in env or encrypted Settings.
    AI_DRIVER: z.enum(['mock', 'live']).default('mock'),
    AI_PRIMARY_PROVIDER: z.enum(['anthropic', 'openai', 'gemini']).default('anthropic'),
    AI_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-latest'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o'),
    GOOGLE_AI_API_KEY: z.string().optional(),
    GOOGLE_AI_MODEL: z.string().default('gemini-1.5-pro'),

    // Analytics & reporting (Phase 8, spec §13). ANALYTICS_DRIVER='mock' (default) keeps
    // all external adapters (PostHog / GA4 / Search Console) offline + no-op — used in
    // dev/test/CI; 'live' forwards events to whichever providers have credentials. First-
    // party analytics (DB aggregates) work regardless of driver. ANALYTICS_RETENTION_DAYS
    // bounds the raw page-view/event tables (cleanup worker). Revenue estimate inputs
    // (clicks × CVR × commission, §13.4) are configurable.
    ANALYTICS_DRIVER: z.enum(['mock', 'live']).default('mock'),
    ANALYTICS_RETENTION_DAYS: z.coerce.number().int().min(7).max(3650).default(180),
    REVENUE_DEFAULT_CVR: z.coerce.number().min(0).max(1).default(0.04),
    REVENUE_DEFAULT_COMMISSION: z.coerce.number().min(0).max(1).default(0.05),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().default('https://app.posthog.com'),
    GA4_MEASUREMENT_ID: z.string().optional(),
    GA4_API_SECRET: z.string().optional(),
    GSC_SITE_URL: z.string().optional(),

    // Marketing & communication (Phase 9). Reuses the existing email provider (Resend
    // → console fallback, ADR-015) — no keys needed offline. NEWSLETTER_DOUBLE_OPT_IN
    // gates the confirm-email step (FR — double opt-in). MARKETING_FROM_NAME brands sends.
    NEWSLETTER_DOUBLE_OPT_IN: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    MARKETING_FROM_NAME: z.string().default('CSLifestyle'),
    CAMPAIGN_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(100),

    // Media Library (Phase 10). Files are stored on disk under UPLOAD_DIR and served at
    // `/uploads` (MEDIA_BASE_URL prefixes the public URL — same-origin by default).
    // sharp generates thumbnail/webp/responsive variants. No external object store needed.
    UPLOAD_DIR: z.string().default('uploads'),
    MEDIA_BASE_URL: z.string().default(''), // '' → same-origin /uploads
    MEDIA_MAX_FILE_MB: z.coerce.number().int().min(1).max(50).default(10),

    // Affiliate — canonical Amazon associate tag + domain used to GENERATE public
    // product affiliate URLs (https://www.amazon.in/dp/{ASIN}?tag=...). The /go
    // redirect engine still reads the DB AffiliateSettings; these defaults keep the
    // presenter (sync, per-row) consistent with the seed without a DB hit.
    AMAZON_ASSOCIATE_TAG: z.string().default('cslifestyle-21'),
    AMAZON_DOMAIN: z.string().default('amazon.in'),

    // Amazon Product Advertising API (PA-API 5.0) — used ONLY by the offline
    // `products:fetch-amazon` script to look up products by keyword (no scraping).
    // Optional: unset unless you run that script. Credentials come from an approved
    // Amazon Associates + PA-API account.
    AMAZON_PAAPI_ACCESS_KEY: z.string().optional(),
    AMAZON_PAAPI_SECRET_KEY: z.string().optional(),
    AMAZON_PAAPI_PARTNER_TAG: z.string().optional(), // defaults to AMAZON_ASSOCIATE_TAG if unset
    AMAZON_PAAPI_MARKETPLACE: z.string().default('www.amazon.in'),
    AMAZON_PAAPI_REGION: z.string().default('eu-west-1'),

    // Cookies
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      const required: Array<keyof NodeJS.ProcessEnv> = [
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_ACCESS_SECRET',
        'APP_URL',
        'ENCRYPTION_KEY',
      ];
      for (const key of required) {
        if (!process.env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key as string],
            message: `${key} is required in production`,
          });
        }
      }
      if ((process.env.JWT_ACCESS_SECRET ?? '').length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'JWT_ACCESS_SECRET must be at least 32 characters in production',
        });
      }
      if ((process.env.ENCRYPTION_KEY ?? '').length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ENCRYPTION_KEY'],
          message: 'ENCRYPTION_KEY must be at least 32 characters in production',
        });
      }
    }
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  // Use console here (the logger itself depends on validated env).
  console.error('❌ Invalid environment configuration:', JSON.stringify(issues, null, 2));
  throw new Error('Environment validation failed. See errors above.');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDev = env.NODE_ENV === 'development';

/** Origins allowed by CORS, parsed from the comma-separated CORS_ORIGIN. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export type Env = typeof env;
