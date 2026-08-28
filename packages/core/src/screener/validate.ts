import { METRICS, getMetric } from '../metrics/registry.js';
import { excludedSectors, type SectorClass } from '../metrics/types.js';
import { parseExpr, exprIdentifiers, isPredicate, ExprParseError } from './expr.js';
import { screenerDefinition, type FilterNode, type ScreenerDefinition } from './dsl.js';

export interface ValidationIssue {
  readonly path: string;
  readonly code:
    | 'schema'
    | 'unknown_metric'
    | 'unhandled_sector'
    | 'bad_expr'
    | 'expr_not_predicate'
    | 'unknown_param'
    | 'unused_param'
    | 'empty_rank'
    | 'rank_method_mismatch';
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly definition?: ScreenerDefinition;
  readonly issues: readonly ValidationIssue[];
  /** Every registry key the screener reads, including via expressions and ranking. */
  readonly metricsUsed: readonly string[];
}

interface MetricRef {
  key: string;
  path: string;
  /** Refs inside a sector profile are exempt from the applicability check for that sector. */
  profileSector?: SectorClass;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Walk a filter tree, collecting metric references and expression issues. */
function walk(
  node: FilterNode,
  path: string,
  refs: MetricRef[],
  issues: ValidationIssue[],
  profileSector?: SectorClass,
): void {
  const n = node as Record<string, unknown>;

  if (Array.isArray(n['all'])) {
    (n['all'] as FilterNode[]).forEach((c, i) => walk(c, `${path}.all[${i}]`, refs, issues, profileSector));
    return;
  }
  if (Array.isArray(n['any'])) {
    (n['any'] as FilterNode[]).forEach((c, i) => walk(c, `${path}.any[${i}]`, refs, issues, profileSector));
    return;
  }
  if (isRecord(n['not'])) {
    walk(n['not'] as FilterNode, `${path}.not`, refs, issues, profileSector);
    return;
  }
  if (Array.isArray(n['of'])) {
    (n['of'] as FilterNode[]).forEach((c, i) => walk(c, `${path}.of[${i}]`, refs, issues, profileSector));
    return;
  }

  for (const wrapper of ['streak', 'history', 'cross'] as const) {
    const inner = n[wrapper];
    if (isRecord(inner) && typeof inner['metric'] === 'string') {
      refs.push({ key: inner['metric'], path: `${path}.${wrapper}`, ...(profileSector ? { profileSector } : {}) });
      return;
    }
  }

  if (typeof n['expr'] === 'string') {
    try {
      const ast = parseExpr(n['expr']);
      if (!isPredicate(ast)) {
        issues.push({
          path: `${path}.expr`,
          code: 'expr_not_predicate',
          message: `expression must compare two values, got a bare arithmetic term: ${n['expr']}`,
        });
      }
      for (const id of exprIdentifiers(ast)) {
        refs.push({ key: id, path: `${path}.expr`, ...(profileSector ? { profileSector } : {}) });
      }
    } catch (err) {
      issues.push({
        path: `${path}.expr`,
        code: 'bad_expr',
        message: err instanceof ExprParseError ? err.message : String(err),
      });
    }
    return;
  }

  if (typeof n['metric'] === 'string') {
    refs.push({ key: n['metric'], path, ...(profileSector ? { profileSector } : {}) });
  }
}

function collectParamRefs(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    const m = /^\{\{([a-z0-9_]+)\}\}$/.exec(value);
    if (m?.[1]) into.add(m[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectParamRefs(v, into);
    return;
  }
  if (isRecord(value)) {
    for (const v of Object.values(value)) collectParamRefs(v, into);
  }
}

/**
 * Full validation: shape, registry keys, sector applicability, expressions, parameters,
 * and ranking coherence. This is what `pnpm screeners:validate` runs in CI.
 */
export function validateScreener(input: unknown): ValidationResult {
  const parsed = screenerDefinition.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        code: 'schema' as const,
        message: i.message,
      })),
      metricsUsed: [],
    };
  }
  const def = parsed.data;
  const issues: ValidationIssue[] = [];
  const refs: MetricRef[] = [];

  walk(def.filters, 'filters', refs, issues);
  for (const [sector, profile] of Object.entries(def.sector_profiles)) {
    walk(profile.with, `sector_profiles.${sector}.with`, refs, issues, sector as SectorClass);
  }

  const rankGroups: Array<[string, { metric: string }[] | undefined]> = [
    ['rank.by', def.rank?.by],
    ['rank.components', def.rank?.components],
    ['rank.then_rank_by', def.rank?.then_rank_by],
    ['rank.tie_break', def.rank?.tie_break],
  ];
  for (const [path, group] of rankGroups) {
    group?.forEach((c, i) => refs.push({ key: c.metric, path: `${path}[${i}]` }));
  }

  // --- unknown metric keys -------------------------------------------------
  for (const ref of refs) {
    if (!getMetric(ref.key)) {
      issues.push({
        path: ref.path,
        code: 'unknown_metric',
        message: `"${ref.key}" is not in the metric registry`,
      });
    }
  }

  // --- sector applicability ------------------------------------------------
  // A screener referencing a metric that is undefined for some sector class must either
  // exclude that class from its universe or route it to a sector profile. Screening banks
  // on current ratio and quietly getting nonsense is the bug this check exists to prevent.
  const excluded = new Set<string>(def.universe.sector_class_exclude);
  const only = def.universe.sector_class_only;
  const profiled = new Set(Object.keys(def.sector_profiles));
  for (const ref of refs) {
    const metric = getMetric(ref.key);
    if (!metric) continue;
    // A criterion inside `sector_profiles.<x>.with` only ever runs for sector class <x>,
    // so it is checked against that class alone — a bank profile is allowed, and expected,
    // to use bank-only metrics.
    const sectorsToCheck = ref.profileSector
      ? excludedSectors(metric).filter((s) => s === ref.profileSector)
      : excludedSectors(metric);
    for (const sector of sectorsToCheck) {
      if (excluded.has(sector)) continue;
      if (only && !only.includes(sector)) continue;
      if (profiled.has(sector)) continue;
      issues.push({
        path: ref.path,
        code: 'unhandled_sector',
        message:
          `"${ref.key}" is not computable for sector class "${sector}" ` +
          `(${metric.null_when}) — exclude it in universe.sector_class_exclude ` +
          `or add a sector_profiles.${sector} entry`,
      });
    }
  }

  // --- parameters ----------------------------------------------------------
  const used = new Set<string>();
  collectParamRefs(def.universe, used);
  collectParamRefs(def.filters, used);
  collectParamRefs(def.sector_profiles, used);
  collectParamRefs(def.rank, used);
  for (const name of used) {
    if (!(name in def.params)) {
      issues.push({ path: 'params', code: 'unknown_param', message: `{{${name}}} is not declared in params` });
    }
  }
  for (const name of Object.keys(def.params)) {
    if (!used.has(name)) {
      issues.push({ path: `params.${name}`, code: 'unused_param', message: `parameter "${name}" is never referenced` });
    }
  }

  // --- ranking coherence ---------------------------------------------------
  if (def.rank) {
    const { method, by, components, select } = def.rank;
    if (method === 'single' && (!by || by.length === 0)) {
      issues.push({ path: 'rank.by', code: 'empty_rank', message: 'rank.method "single" requires rank.by' });
    }
    if (method !== 'single' && (!components || components.length === 0)) {
      issues.push({
        path: 'rank.components',
        code: 'empty_rank',
        message: `rank.method "${method}" requires rank.components`,
      });
    }
    if (select && method !== 'decile_composite') {
      issues.push({
        path: 'rank.select',
        code: 'rank_method_mismatch',
        message: 'rank.select only applies to method "decile_composite"',
      });
    }
  }

  const metricsUsed = [...new Set(refs.map((r) => r.key))].filter((k) => k in METRICS).sort();
  return { ok: issues.length === 0, definition: def, issues, metricsUsed };
}
