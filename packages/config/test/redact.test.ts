import { describe, expect, it } from 'vitest';
import { redact, redactString, REDACTION } from '../src/redact.js';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

describe('log redaction', () => {
  it('drops credential-bearing keys at any depth', () => {
    const out = redact({
      ticker: 'BBCA',
      session: { access_token: JWT, refresh_token: 'r-123', user: { password: 'hunter2' } },
      headers: { Authorization: `Bearer ${JWT}`, 'x-request-id': 'abc' },
    });
    const text = JSON.stringify(out);
    expect(text).not.toContain(JWT);
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('r-123');
    expect(text).toContain('BBCA');
    expect(text).toContain('abc');
  });

  it('scrubs token-shaped strings out of free text', () => {
    expect(redactString(`request failed with ${JWT}`)).toBe(`request failed with ${REDACTION}`);
    expect(redactString('Bearer abcdefghijklmnopqrstuvwxyz012345')).toBe(`Bearer ${REDACTION}`);
  });

  it('redacts inside error messages', () => {
    const out = redact(new Error(`401 for token ${JWT}`)) as { message: string };
    expect(out.message).not.toContain(JWT);
  });

  it('survives cycles', () => {
    const a: Record<string, unknown> = { ticker: 'TLKM' };
    a['self'] = a;
    expect(() => JSON.stringify(redact(a))).not.toThrow();
  });
});
