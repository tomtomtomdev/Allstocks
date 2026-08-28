/**
 * Restricted arithmetic grammar for `expr` leaves.
 *
 *   expr       := comparison
 *   comparison := additive ( ("<=" | ">=" | "<" | ">" | "==" | "!=") additive )?
 *   additive   := multiplicative ( ("+" | "-") multiplicative )*
 *   multiplicative := unary ( ("*" | "/") unary )*
 *   unary      := "-" unary | primary
 *   primary    := NUMBER | IDENT | "(" additive ")"
 *
 * Identifiers must be registry metric keys; the parser resolves nothing itself, it only
 * produces an AST and the set of referenced identifiers. Nothing from an expression is
 * ever string-interpolated into SQL — the compiler walks this AST and binds parameters.
 */

export type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'unary'; op: '-'; operand: ExprNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: ExprNode; right: ExprNode }
  | { kind: 'compare'; op: '<' | '<=' | '>' | '>=' | '==' | '!='; left: ExprNode; right: ExprNode };

export class ExprParseError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} (at ${position})`);
    this.name = 'ExprParseError';
  }
}

type Token =
  | { t: 'num'; v: number; p: number }
  | { t: 'ident'; v: string; p: number }
  | { t: 'op'; v: string; p: number }
  | { t: 'lparen' | 'rparen'; p: number };

const COMPARE_OPS = new Set(['<', '<=', '>', '>=', '==', '!=']);

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '(') { out.push({ t: 'lparen', p: i }); i++; continue; }
    if (c === ')') { out.push({ t: 'rparen', p: i }); i++; continue; }

    if (c >= '0' && c <= '9') {
      const m = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new ExprParseError('malformed number', i);
      out.push({ t: 'num', v: Number(m[0]), p: i });
      i += m[0].length;
      continue;
    }
    if (/[a-z_]/.test(c)) {
      const m = /^[a-z_][a-z0-9_]*/.exec(src.slice(i));
      if (!m) throw new ExprParseError('malformed identifier', i);
      out.push({ t: 'ident', v: m[0], p: i });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '==' || two === '!=') {
      out.push({ t: 'op', v: two, p: i });
      i += 2;
      continue;
    }
    if ('+-*/<>'.includes(c)) {
      out.push({ t: 'op', v: c, p: i });
      i++;
      continue;
    }
    throw new ExprParseError(`unexpected character ${JSON.stringify(c)}`, i);
  }
  return out;
}

export function parseExpr(src: string): ExprNode {
  if (src.length > 500) throw new ExprParseError('expression too long', 0);
  const toks = tokenize(src);
  if (toks.length === 0) throw new ExprParseError('empty expression', 0);
  let pos = 0;

  const peek = (): Token | undefined => toks[pos];
  const eat = (): Token => {
    const t = toks[pos];
    if (!t) throw new ExprParseError('unexpected end of expression', src.length);
    pos++;
    return t;
  };

  function primary(): ExprNode {
    const t = eat();
    if (t.t === 'num') return { kind: 'num', value: t.v };
    if (t.t === 'ident') return { kind: 'ident', name: t.v };
    if (t.t === 'lparen') {
      const inner = additive();
      const close = peek();
      if (!close || close.t !== 'rparen') throw new ExprParseError('expected )', t.p);
      pos++;
      return inner;
    }
    if (t.t === 'op' && t.v === '-') return { kind: 'unary', op: '-', operand: unary() };
    throw new ExprParseError('expected a number, metric key or (', t.p);
  }

  function unary(): ExprNode {
    const t = peek();
    if (t && t.t === 'op' && t.v === '-') {
      pos++;
      return { kind: 'unary', op: '-', operand: unary() };
    }
    return primary();
  }

  function multiplicative(): ExprNode {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
        pos++;
        left = { kind: 'binary', op: t.v, left, right: unary() };
      } else return left;
    }
  }

  function additive(): ExprNode {
    let left = multiplicative();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        pos++;
        left = { kind: 'binary', op: t.v, left, right: multiplicative() };
      } else return left;
    }
  }

  const left = additive();
  const t = peek();
  let node: ExprNode = left;
  if (t && t.t === 'op' && COMPARE_OPS.has(t.v)) {
    pos++;
    node = { kind: 'compare', op: t.v as never, left, right: additive() };
  }
  if (pos !== toks.length) {
    const rest = toks[pos]!;
    throw new ExprParseError('unexpected trailing input', 'p' in rest ? rest.p : 0);
  }
  return node;
}

/** Every metric key an expression depends on. */
export function exprIdentifiers(node: ExprNode, into: Set<string> = new Set()): Set<string> {
  switch (node.kind) {
    case 'num':
      break;
    case 'ident':
      into.add(node.name);
      break;
    case 'unary':
      exprIdentifiers(node.operand, into);
      break;
    case 'binary':
    case 'compare':
      exprIdentifiers(node.left, into);
      exprIdentifiers(node.right, into);
      break;
  }
  return into;
}

/** True when the expression is a boolean test rather than a bare arithmetic value. */
export function isPredicate(node: ExprNode): boolean {
  return node.kind === 'compare';
}
