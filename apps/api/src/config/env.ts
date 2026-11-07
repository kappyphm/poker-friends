import 'dotenv/config';
import { z } from 'zod';

/**
 * Central environment config. Every variable the API reads is declared and
 * validated here at startup; the process refuses to boot with a clear,
 * variable-naming error instead of failing later at runtime. Nothing else
 * in the codebase may read `process.env` directly.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    CLIENT_URL: z.url().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
    DEV_AUTH: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    // An empty value in .env (as shipped in .env.example) counts as unset.
    GOOGLE_CLIENT_ID: z
      .string()
      .min(1)
      .or(z.literal(''))
      .optional()
      .transform((v) => (v ? v : undefined)),
    GOOGLE_CLIENT_SECRET: z
      .string()
      .min(1)
      .or(z.literal(''))
      .optional()
      .transform((v) => (v ? v : undefined)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((env, ctx) => {
    // Google OAuth is the only real login: its credentials become mandatory
    // as soon as the dev-login shortcut is switched off.
    if (!env.DEV_AUTH) {
      if (!env.GOOGLE_CLIENT_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['GOOGLE_CLIENT_ID'],
          message: 'GOOGLE_CLIENT_ID is required when DEV_AUTH is not true',
        });
      }
      if (!env.GOOGLE_CLIENT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['GOOGLE_CLIENT_SECRET'],
          message: 'GOOGLE_CLIENT_SECRET is required when DEV_AUTH is not true',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`)
    .join('\n');
  process.stderr.write(`Invalid environment configuration:\n${problems}\n`);
  process.exit(1);
}

export const config = parsed.data;

export type AppConfig = typeof config;

// Named re-exports for ergonomic imports across the codebase.
export const NODE_ENV = config.NODE_ENV;
export const PORT = config.PORT;
export const CLIENT_URL = config.CLIENT_URL;
export const DATABASE_URL = config.DATABASE_URL;
export const SESSION_SECRET = config.SESSION_SECRET;
export const DEV_AUTH = config.DEV_AUTH;
export const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;
export const LOG_LEVEL = config.LOG_LEVEL;
