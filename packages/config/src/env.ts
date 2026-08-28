import { z } from 'zod';

/**
 * Environment contract. Parsed once at boot; a missing or malformed variable stops the
 * process rather than surfacing as a confusing failure three layers down.
 * See docs/00-BUILD-SPEC.md §10.
 */

const base64Key32 = z
  .string()
  .refine((v) => {
    try {
      return Buffer.from(v, 'base64').length === 32;
    } catch {
      return false;
    }
  }, 'must be 32 bytes, base64-encoded (openssl rand -base64 32)');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  /** Key-encryption key wrapping each user's data key. Never logged, never committed. */
  ALLSTOCKS_KEK: base64Key32,
  ALLSTOCKS_MULTI_USER: z.coerce.boolean().default(false),

  /** Discovered during M1 and configured, never hardcoded in source. */
  STOCKBIT_BASE_URL: z.string().url().optional(),
  /** Politeness ceiling: configurable downward only. */
  STOCKBIT_RATE_LIMIT_RPS: z.coerce.number().positive().max(5).default(2),
  STOCKBIT_MAX_CONCURRENCY: z.coerce.number().int().positive().max(4).default(1),
  STOCKBIT_DAILY_REQUEST_BUDGET: z.coerce.number().int().positive().default(5000),
  STOCKBIT_LOGIN_MODE: z.enum(['browser', 'refresh_token']).default('browser'),

  FX_SOURCE_URL: z.string().url().optional(),
  INGEST_TZ: z.string().default('Asia/Jakarta'),
  INGEST_CRON_ENABLED: z.coerce.boolean().default(true),
  SCREENERS_ENABLED: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return parsed.data;
}
