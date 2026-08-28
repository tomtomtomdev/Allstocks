/**
 * Metric registry types. The registry is the single source of truth for what a screener
 * may reference: it generates the wide serving view, the `metric` enum in the screener
 * JSON Schema, and the metric picker in the rule builder.
 *
 * See docs/02-DATA-DICTIONARY.md.
 */

export const SECTOR_CLASSES = [
  'non_financial',
  'bank',
  'insurance',
  'multifinance',
  'property',
  'reit',
  'utility_regulated',
  'mining',
  'holding',
] as const;
export type SectorClass = (typeof SECTOR_CLASSES)[number];

export const METRIC_CATEGORIES = [
  'valuation',
  'profitability',
  'growth',
  'quality',
  'leverage',
  'liquidity',
  'cashflow',
  'dividend',
  'momentum',
  'size',
  'forensic',
  'banking',
  'ownership',
  'market',
] as const;
export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export type MetricUnit =
  | 'idr'
  | 'ratio'
  | 'pct'
  | 'x'
  | 'years'
  | 'count'
  | 'score'
  | 'rank'
  | 'bool';

export type MetricWindow =
  | 'point'
  | 'ttm'
  | 'fy'
  | 'avg3y'
  | 'avg5y'
  | 'cagr3y'
  | 'cagr5y'
  | 'cagr10y'
  | 'd20'
  | 'd60'
  | 'd250';

export interface MetricDef {
  /** snake_case, stable forever; renames go through the alias table. */
  readonly key: string;
  readonly label: string;
  readonly label_id?: string;
  readonly category: MetricCategory;
  readonly unit: MetricUnit;
  /** Human-readable formula, shown in the UI hover card. */
  readonly formula: string;
  readonly direction: 'higher_better' | 'lower_better' | 'none';
  readonly window?: MetricWindow;
  /** 'all', or the sector classes for which this metric is meaningful. */
  readonly applies_to: 'all' | readonly SectorClass[];
  /** Documented reason the value may be NULL. NULL never means zero — see §5. */
  readonly null_when: string;
  readonly precision: number;
  /**
   * True for metrics that are properties of the market or the security rather than
   * a computed financial ratio (e.g. board, index membership, IHSG trend).
   */
  readonly is_context?: boolean;
}

export function appliesTo(def: MetricDef, sector: SectorClass): boolean {
  return def.applies_to === 'all' || def.applies_to.includes(sector);
}

/** Sector classes for which a metric is NOT computable — drives the DSL applicability check. */
export function excludedSectors(def: MetricDef): SectorClass[] {
  if (def.applies_to === 'all') return [];
  return SECTOR_CLASSES.filter((s) => !def.applies_to.includes(s));
}
