import { describe, expect, it } from 'vitest';
import { parseExpr, exprIdentifiers, isPredicate, ExprParseError } from '../src/screener/expr.js';

describe('expr grammar', () => {
  it('parses a comparison over metric keys', () => {
    const ast = parseExpr('long_term_debt <= working_capital');
    expect(isPredicate(ast)).toBe(true);
    expect([...exprIdentifiers(ast)]).toEqual(['long_term_debt', 'working_capital']);
  });

  it('respects operator precedence', () => {
    const ast = parseExpr('pe_ttm * pb <= 22.5');
    expect(ast).toMatchObject({
      kind: 'compare',
      op: '<=',
      left: { kind: 'binary', op: '*' },
      right: { kind: 'num', value: 22.5 },
    });
  });

  it('handles parentheses and unary minus', () => {
    const ast = parseExpr('-(net_debt + total_debt) / market_cap > 0');
    expect(isPredicate(ast)).toBe(true);
    expect([...exprIdentifiers(ast)].sort()).toEqual(['market_cap', 'net_debt', 'total_debt']);
  });

  it('reports a bare arithmetic term as not a predicate', () => {
    expect(isPredicate(parseExpr('market_cap / 2'))).toBe(false);
  });

  // The grammar is the boundary that keeps user input out of SQL. These must never parse.
  it.each([
    "'; DROP TABLE fact_metric; --",
    'market_cap; DELETE FROM screener',
    'SELECT * FROM dim_security',
    'market_cap || pg_sleep(10)',
    'market_cap /* comment */ > 0',
    'CAST(market_cap AS text) > 0',
    'market_cap > (SELECT max(close) FROM fact_price_daily)',
  ])('rejects %s', (src) => {
    expect(() => parseExpr(src)).toThrow(ExprParseError);
  });

  it('rejects unbalanced parentheses and trailing input', () => {
    expect(() => parseExpr('(market_cap > 0')).toThrow(ExprParseError);
    expect(() => parseExpr('market_cap > 0 0')).toThrow(ExprParseError);
  });
});
