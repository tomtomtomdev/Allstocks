/**
 * Log redaction. Credentials must never reach a log line, a trace attribute, or an error
 * message — docs/00-BUILD-SPEC.md §8.2. `redact` is applied by the logger's formatter;
 * the unit test asserts a token never survives serialization.
 */

/** Keys whose values are dropped wholesale, at any depth. */
export const REDACTED_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'access_token',
  'refresh_token',
  'accesstoken',
  'refreshtoken',
  'token',
  'sealed_blob',
  'wrapped_dek',
  'allstocks_kek',
  'kek',
  'dek',
  'secret',
  'api_key',
  'apikey',
]);

const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi;
const LONG_OPAQUE = /\b[A-Za-z0-9_-]{40,}\b/g;

export const REDACTION = '[redacted]';

/** Scrub token-shaped substrings out of free text. */
export function redactString(value: string): string {
  return value.replace(JWT_LIKE, REDACTION).replace(BEARER, `Bearer ${REDACTION}`).replace(LONG_OPAQUE, REDACTION);
}

/** Deep-redact a value for logging. Cycles are collapsed rather than throwing. */
export function redact(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? REDACTION : redact(v, seen);
  }
  return out;
}
