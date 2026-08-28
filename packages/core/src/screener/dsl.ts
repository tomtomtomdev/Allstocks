import { z } from 'zod';
import { SECTOR_CLASSES } from '../metrics/types.js';

/**
 * Screener definition language. This is the source of truth: the JSON Schema in
 * docs/schema/screener.schema.json must accept exactly what these schemas accept.
 * See docs/03-SCREENER-DSL.md.
 */

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase slug');
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'must be x.y.z');
const paramRef = z.string().regex(/^\{\{[a-z0-9_]+\}\}$/);
const numberOrParam = z.union([z.number(), paramRef]);

export const sectorClass = z.enum(SECTOR_CLASSES);
export const comparisonOp = z.enum(['>', '>=', '<', '<=', '==', '!=']);
export const leafOp = z.enum(['>', '>=', '<', '<=', '==', '!=', 'between', 'in', 'not_in']);

const leafCommon = {
  label: z.string().optional(),
  weight: z.number().optional(),
  severity: z.enum(['hard', 'soft']).default('hard'),
};

export const metricLeaf = z.object({
  metric: z.string(),
  op: leafOp,
  value: z.unknown().optional(),
  percentile_of: z.enum(['universe', 'sector', 'subsector']).optional(),
  compare_to: z.enum(['sector_median', 'sector_mean', 'universe_median', 'subsector_median']).optional(),
  ...leafCommon,
});

export const exprLeaf = z.object({ expr: z.string().min(1).max(500), ...leafCommon });

export const streakLeaf = z.object({
  streak: z.object({
    metric: z.string(),
    op: comparisonOp,
    value: numberOrParam,
    periods: z.union([z.number().int().min(2), paramRef]),
    grain: z.enum(['fy', 'quarter']),
    allow_gaps: z.number().int().min(0).default(0),
  }),
  ...leafCommon,
});

export const historyLeaf = z.object({
  history: z.object({
    metric: z.string(),
    op: comparisonOp,
    value: numberOrParam,
    periods: z.union([z.number().int().min(2), paramRef]),
    grain: z.enum(['fy', 'quarter']),
    quantifier: z.string().regex(/^(all|any|atLeast:\d+)$/),
  }),
  ...leafCommon,
});

export const crossLeaf = z.object({
  cross: z.object({
    metric: z.string(),
    op: z.enum(['>', '>=', '<', '<=']),
    percentile: z.union([z.number().min(0).max(1), paramRef]),
    within: z.enum(['universe', 'sector', 'subsector']).default('universe'),
  }),
  ...leafCommon,
});

export type FilterNode =
  | { all: FilterNode[] }
  | { any: FilterNode[] }
  | { not: FilterNode }
  | { atLeast: number; of: FilterNode[] }
  | z.infer<typeof metricLeaf>
  | z.infer<typeof exprLeaf>
  | z.infer<typeof streakLeaf>
  | z.infer<typeof historyLeaf>
  | z.infer<typeof crossLeaf>;

// Input and output types differ (leaf `severity` has a default), so the recursive
// annotation types the parsed output and leaves the input open.
export const filterNode: z.ZodType<FilterNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(filterNode).min(1) }),
    z.object({ any: z.array(filterNode).min(1) }),
    z.object({ not: filterNode }),
    z.object({ atLeast: z.number().int().min(1), of: z.array(filterNode).min(2) }),
    streakLeaf,
    historyLeaf,
    crossLeaf,
    exprLeaf,
    metricLeaf,
  ]),
);

export const rankComponent = z.object({
  metric: z.string(),
  dir: z.enum(['asc', 'desc']),
  weight: z.number().optional(),
});

export const rankSpec = z.object({
  method: z.enum(['single', 'sum_of_ranks', 'decile_composite', 'z_weighted']).default('single'),
  scope: z.enum(['pre_filter', 'post_filter']).default('post_filter'),
  by: z.array(rankComponent).optional(),
  components: z.array(rankComponent).optional(),
  select: z.object({ composite_decile: z.number().int().min(1).max(10) }).optional(),
  then_rank_by: z.array(rankComponent).optional(),
  tie_break: z.array(rankComponent).optional(),
  winsorize: z.number().min(0).max(0.2).optional(),
  limit: numberOrParam.optional(),
});

export const universeSpec = z.object({
  exchange: z.array(z.literal('IDX')).default(['IDX']),
  boards: z.array(z.enum(['main', 'development', 'acceleration'])).default(['main', 'development']),
  exclude_flags: z
    .array(z.enum(['special_monitoring', 'suspension', 'full_call_auction', 'going_concern', 'delisted']))
    .default([]),
  index_any: z.array(z.string()).nullable().optional(),
  sector_class_exclude: z.array(sectorClass).default([]),
  sector_class_only: z.array(sectorClass).optional(),
  min_avg_daily_value_idr: numberOrParam.optional(),
  min_market_cap_idr: numberOrParam.optional(),
  max_market_cap_idr: numberOrParam.optional(),
  min_years_listed: numberOrParam.optional(),
  require_ttm: z.boolean().default(true),
});

export const paramSpec = z.object({
  type: z.enum(['number', 'integer', 'boolean', 'string', 'enum']),
  default: z.unknown(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.unknown()).optional(),
  label: z.string().optional(),
});

export const sourceSpec = z.object({
  type: z.enum(['book', 'stockbit_preset', 'custom']),
  title: z.string().optional(),
  author: z.string().optional(),
  edition: z.string().optional(),
  locator: z.string().optional(),
  fidelity: z.enum(['faithful', 'adapted', 'inspired']).optional(),
  adaptations: z.array(z.string()).optional(),
  provider_id: z.string().optional(),
  derived_from: z.string().optional(),
});

export const screenerDefinition = z.object({
  id: slug,
  version: semver,
  name: z.string().min(1),
  name_id: z.string().optional(),
  summary: z.string().optional(),
  notes_md: z.string().optional(),
  source: sourceSpec,
  params: z.record(paramSpec).default({}),
  universe: universeSpec,
  filters: filterNode,
  sector_profiles: z
    .record(z.object({ replace: z.array(z.string()).default([]), with: filterNode }))
    .default({}),
  rank: rankSpec.optional(),
  explain: z.boolean().default(true),
  min_data_completeness: z.number().min(0).max(1).default(0.9),
});

export type ScreenerDefinition = z.infer<typeof screenerDefinition>;
export type RankSpec = z.infer<typeof rankSpec>;
export type UniverseSpec = z.infer<typeof universeSpec>;

/** A screener whose `source.type` is a Stockbit preset carries no DSL — it is a passthrough. */
export function isPassthrough(d: Pick<ScreenerDefinition, 'source'>): boolean {
  return d.source.type === 'stockbit_preset';
}
