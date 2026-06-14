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
