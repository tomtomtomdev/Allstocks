import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateScreener } from '../src/index.js';

const dir = join(import.meta.dirname, '..', '..', '..', 'screeners');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

const base = {
  id: 'test-screener',
  version: '1.0.0',
  name: 'Test',
  source: { type: 'book' as const },
  universe: {},
  filters: { all: [{ metric: 'roe', op: '>=' as const, value: 10 }] },
};

describe('shipped screeners', () => {
  it('finds definitions to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s validates', (file) => {
    const result = validateScreener(JSON.parse(readFileSync(join(dir, file), 'utf8')));
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('validateScreener', () => {
  it('rejects an unknown metric key', () => {
    const r = validateScreener({ ...base, filters: { all: [{ metric: 'roe_but_better', op: '>=', value: 1 }] } });
    expect(r.issues.map((i) => i.code)).toContain('unknown_metric');
  });

  it('rejects screening banks on current ratio', () => {
    const r = validateScreener({ ...base, filters: { all: [{ metric: 'current_ratio', op: '>=', value: 2 }] } });
    const sectors = r.issues.filter((i) => i.code === 'unhandled_sector');
    expect(sectors.length).toBeGreaterThan(0);
    expect(sectors.some((i) => i.message.includes('bank'))).toBe(true);
  });

  it('accepts current ratio once financials are excluded', () => {
    const r = validateScreener({
      ...base,
      universe: { sector_class_exclude: ['bank', 'insurance', 'multifinance'] },
      filters: { all: [{ metric: 'current_ratio', op: '>=', value: 2 }] },
    });
    expect(r.issues).toEqual([]);
  });

  it('accepts current ratio once banks have a sector profile', () => {
    const r = validateScreener({
      ...base,
      universe: { sector_class_exclude: ['insurance', 'multifinance'] },
      filters: { all: [{ metric: 'current_ratio', op: '>=', value: 2 }] },
      sector_profiles: {
        bank: { replace: ['current_ratio'], with: { all: [{ metric: 'car', op: '>=', value: 12 }] } },
      },
    });
    expect(r.issues).toEqual([]);
  });

  it('flags an undeclared parameter reference', () => {
    const r = validateScreener({ ...base, universe: { min_market_cap_idr: '{{floor}}' } });
    expect(r.issues.map((i) => i.code)).toContain('unknown_param');
  });

  it('flags a declared but unused parameter', () => {
    const r = validateScreener({ ...base, params: { floor: { type: 'number', default: 1 } } });
    expect(r.issues.map((i) => i.code)).toContain('unused_param');
  });

  it('flags a composite rank with no components', () => {
    const r = validateScreener({ ...base, rank: { method: 'sum_of_ranks', limit: 30 } });
    expect(r.issues.map((i) => i.code)).toContain('empty_rank');
  });

  it('reports every metric the screener reads, including via expressions', () => {
    const r = validateScreener({
      ...base,
      universe: { sector_class_exclude: ['bank', 'insurance', 'multifinance'] },
      filters: { all: [{ expr: 'pe_ttm * pb <= 22.5' }, { metric: 'roe', op: '>=', value: 10 }] },
      rank: { method: 'single', by: [{ metric: 'graham_mos_pct', dir: 'desc' }] },
    });
    expect(r.metricsUsed).toEqual(['graham_mos_pct', 'pb', 'pe_ttm', 'roe']);
  });
});
