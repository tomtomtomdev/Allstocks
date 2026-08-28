import type { MetricDef, SectorClass } from './types.js';
import { SECTOR_CLASSES } from './types.js';

/** Every sector class except the financial ones — the common `applies_to` for ratios
 *  built on current assets, inventory, EBITDA or working capital. */
const NON_FINANCIAL: readonly SectorClass[] = SECTOR_CLASSES.filter(
  (s) => s !== 'bank' && s !== 'insurance' && s !== 'multifinance',
);

const FINANCIALS_ONLY: readonly SectorClass[] = ['bank'];

function def(d: MetricDef): MetricDef {
  return Object.freeze(d);
}

/**
 * M0 registry. Covers every key referenced by the screeners in `screeners/`, plus the
 * common surrounding metrics. Grows to the full ~130 in M2 (docs/06-ROADMAP.md).
 */
const DEFS: readonly MetricDef[] = [
  // ---- size & market ------------------------------------------------------
  def({ key: 'market_cap', label: 'Market cap', category: 'size', unit: 'idr',
    formula: 'close x shares_outstanding', direction: 'none', window: 'point',
    applies_to: 'all', null_when: 'share count unknown at as_of', precision: 0 }),
  def({ key: 'enterprise_value', label: 'Enterprise value', category: 'size', unit: 'idr',
    formula: 'market_cap + total_debt - cash - short_term_investments + minority_interest',
    direction: 'none', window: 'point', applies_to: NON_FINANCIAL,
    null_when: 'not meaningful for deposit-funded businesses', precision: 0 }),
  def({ key: 'total_debt', label: 'Total debt', category: 'leverage', unit: 'idr',
    formula: 'short_term_debt + current_portion_ltd + long_term_debt + lease_liabilities',
    direction: 'lower_better', window: 'point', applies_to: 'all',
    null_when: 'no statement visible at as_of', precision: 0 }),
  def({ key: 'net_debt', label: 'Net debt', category: 'leverage', unit: 'idr',
    formula: 'total_debt - cash - short_term_investments', direction: 'lower_better',
    window: 'point', applies_to: NON_FINANCIAL, null_when: 'no statement visible', precision: 0 }),
  def({ key: 'long_term_debt', label: 'Long-term debt', category: 'leverage', unit: 'idr',
    formula: 'as reported', direction: 'lower_better', window: 'point', applies_to: 'all',
    null_when: 'line item absent', precision: 0 }),
  def({ key: 'working_capital', label: 'Working capital', category: 'liquidity', unit: 'idr',
    formula: 'current_assets - current_liabilities', direction: 'higher_better', window: 'point',
    applies_to: NON_FINANCIAL, null_when: 'banks do not present a classified balance sheet', precision: 0 }),
  def({ key: 'free_float_mcap', label: 'Free-float market cap', category: 'size', unit: 'idr',
    formula: 'market_cap x free_float_pct', direction: 'higher_better', window: 'point',
    applies_to: 'all', null_when: 'free float not published', precision: 0 }),
  def({ key: 'avg_daily_value_20d', label: 'Avg daily value (20d)', category: 'size', unit: 'idr',
    formula: 'mean(value_idr) over the last 20 trading days', direction: 'higher_better',
    window: 'd20', applies_to: 'all', null_when: 'fewer than 20 trading days since listing', precision: 0 }),

  // ---- valuation ----------------------------------------------------------
  def({ key: 'pe_ttm', label: 'P/E (TTM)', category: 'valuation', unit: 'x',
    formula: 'market_cap / net_profit_attributable_ttm', direction: 'lower_better', window: 'ttm',
    applies_to: 'all', null_when: 'TTM earnings are zero or negative — a negative P/E is not cheap', precision: 2 }),
  def({ key: 'pe_avg3y', label: 'P/E on 3-year average EPS', category: 'valuation', unit: 'x',
    formula: 'close / mean(eps, last 3 FY)', direction: 'lower_better', window: 'avg3y',
    applies_to: 'all', null_when: 'fewer than 3 fiscal years, or average EPS <= 0', precision: 2 }),
  def({ key: 'pb', label: 'P/B', category: 'valuation', unit: 'x',
    formula: 'market_cap / equity_attributable', direction: 'lower_better', window: 'point',
    applies_to: 'all', null_when: 'book value is zero or negative', precision: 2 }),
  def({ key: 'ps_ttm', label: 'P/S (TTM)', category: 'valuation', unit: 'x',
    formula: 'market_cap / revenue_ttm', direction: 'lower_better', window: 'ttm',
    applies_to: 'all', null_when: 'incomplete TTM', precision: 2 }),
  def({ key: 'pcf_ttm', label: 'P/CF (TTM)', category: 'valuation', unit: 'x',
    formula: 'market_cap / cfo_ttm', direction: 'lower_better', window: 'ttm',
    applies_to: 'all', null_when: 'CFO is zero or negative', precision: 2 }),
  def({ key: 'ev_ebitda', label: 'EV/EBITDA', category: 'valuation', unit: 'x',
    formula: 'enterprise_value / ebitda_ttm', direction: 'lower_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'EBITDA <= 0, or not meaningful for financials', precision: 2 }),
  def({ key: 'ev_ebit', label: 'EV/EBIT', category: 'valuation', unit: 'x',
    formula: 'enterprise_value / ebit_ttm', direction: 'lower_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'EBIT <= 0, or not meaningful for financials', precision: 2 }),
  def({ key: 'ebit_ev', label: 'Earnings yield (EBIT/EV)', category: 'valuation', unit: 'pct',
    formula: 'ebit_ttm / enterprise_value  — Greenblatt’s yield form', direction: 'higher_better',
    window: 'ttm', applies_to: NON_FINANCIAL, null_when: 'EV <= 0 or incomplete TTM', precision: 4 }),
  def({ key: 'fcf_yield', label: 'FCF yield', category: 'valuation', unit: 'pct',
    formula: '(cfo_ttm - capex_ttm) / market_cap', direction: 'higher_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'incomplete TTM cash-flow statement', precision: 4 }),
  def({ key: 'shareholder_yield', label: 'Shareholder yield', category: 'valuation', unit: 'pct',
    formula: '(dividends_paid + net_buyback) / market_cap', direction: 'higher_better', window: 'ttm',
    applies_to: 'all', null_when: 'financing cash flow not itemised', precision: 4 }),
  def({ key: 'graham_number', label: 'Graham Number', category: 'valuation', unit: 'idr',
    formula: 'sqrt(22.5 x eps_ttm x bvps)', direction: 'higher_better', window: 'ttm',
    applies_to: 'all', null_when: 'EPS or book value per share is zero or negative', precision: 2 }),
  def({ key: 'graham_mos_pct', label: 'Graham margin of safety', category: 'valuation', unit: 'pct',
    formula: '(graham_number - close) / graham_number x 100', direction: 'higher_better',
    window: 'point', applies_to: 'all', null_when: 'graham_number is NULL', precision: 2 }),
  def({ key: 'ncav_per_share', label: 'NCAV per share', category: 'valuation', unit: 'idr',
    formula: '(current_assets - total_liabilities) / shares_outstanding', direction: 'higher_better',
    window: 'point', applies_to: NON_FINANCIAL, null_when: 'no classified balance sheet', precision: 2 }),

  // ---- profitability ------------------------------------------------------
  def({ key: 'roe', label: 'Return on equity', category: 'profitability', unit: 'pct',
    formula: 'net_profit_attributable_ttm / mean(equity_attributable, 4q)', direction: 'higher_better',
    window: 'ttm', applies_to: 'all', null_when: 'average equity is zero or negative', precision: 2 }),
  def({ key: 'roic', label: 'Return on invested capital', category: 'profitability', unit: 'pct',
    formula: 'ebit_ttm x (1 - effective_tax_rate) / mean(total_debt + equity_total - cash)',
    direction: 'higher_better', window: 'ttm', applies_to: NON_FINANCIAL,
    null_when: 'invested capital <= 0, or not meaningful for financials', precision: 2 }),
  def({ key: 'roc_greenblatt', label: 'Return on capital (Greenblatt)', category: 'profitability', unit: 'pct',
    formula: 'ebit_ttm / (net_working_capital + net_fixed_assets)  — the book’s definition, not generic ROIC',
    direction: 'higher_better', window: 'ttm', applies_to: NON_FINANCIAL,
    null_when: 'denominator <= 0, or not meaningful for financials', precision: 2 }),
  def({ key: 'net_margin', label: 'Net margin', category: 'profitability', unit: 'pct',
    formula: 'net_profit_attributable_ttm / revenue_ttm', direction: 'higher_better', window: 'ttm',
    applies_to: 'all', null_when: 'revenue is zero', precision: 2 }),
  def({ key: 'gross_margin', label: 'Gross margin', category: 'profitability', unit: 'pct',
    formula: 'gross_profit_ttm / revenue_ttm', direction: 'higher_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'no cost of goods sold line', precision: 2 }),
  def({ key: 'operating_margin', label: 'Operating margin', category: 'profitability', unit: 'pct',
    formula: 'operating_profit_ttm / revenue_ttm', direction: 'higher_better', window: 'ttm',
    applies_to: 'all', null_when: 'revenue is zero', precision: 2 }),

  // ---- income statement aggregates ---------------------------------------
  def({ key: 'revenue_ttm', label: 'Revenue (TTM)', category: 'size', unit: 'idr',
    formula: 'sum of the last four discrete quarters (docs/02 §4.5)', direction: 'higher_better',
    window: 'ttm', applies_to: 'all', null_when: 'a quarter is missing — never annualised', precision: 0 }),
  def({ key: 'ebit_ttm', label: 'EBIT (TTM)', category: 'profitability', unit: 'idr',
    formula: 'sum of the last four discrete quarters', direction: 'higher_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'a quarter is missing', precision: 0 }),
  def({ key: 'net_profit_attributable', label: 'Net profit attributable', category: 'profitability', unit: 'idr',
    formula: 'as reported, attributable to owners of the parent', direction: 'higher_better', window: 'fy',
    applies_to: 'all', null_when: 'statement not visible at as_of', precision: 0 }),
  def({ key: 'eps_basic', label: 'EPS (basic)', category: 'profitability', unit: 'idr',
    formula: 'as reported', direction: 'higher_better', window: 'fy', applies_to: 'all',
    null_when: 'statement not visible at as_of', precision: 2 }),
  def({ key: 'equity_attributable', label: 'Equity attributable to owners', category: 'quality', unit: 'idr',
    formula: 'as reported', direction: 'higher_better', window: 'point', applies_to: 'all',
    null_when: 'statement not visible at as_of', precision: 0 }),

  // ---- growth -------------------------------------------------------------
  def({ key: 'revenue_growth_yoy', label: 'Revenue growth YoY', category: 'growth', unit: 'pct',
    formula: 'latest discrete quarter vs. the same quarter a year earlier', direction: 'higher_better',
    window: 'ttm', applies_to: 'all', null_when: 'prior-year quarter missing', precision: 2 }),
  def({ key: 'eps_growth_q_yoy', label: 'Quarterly EPS growth YoY', category: 'growth', unit: 'pct',
    formula: 'discrete quarter EPS vs. the same quarter a year earlier', direction: 'higher_better',
    window: 'ttm', applies_to: 'all', null_when: 'prior-year quarter missing or base <= 0', precision: 2 }),
  def({ key: 'eps_cagr_3y', label: 'EPS CAGR (3y)', category: 'growth', unit: 'pct',
    formula: 'compound annual growth of EPS over 3 fiscal years', direction: 'higher_better',
    window: 'cagr3y', applies_to: 'all', null_when: 'base year EPS <= 0, or fewer than 3 years', precision: 2 }),
  def({ key: 'eps_cagr_5y', label: 'EPS CAGR (5y)', category: 'growth', unit: 'pct',
    formula: 'compound annual growth of EPS over 5 fiscal years', direction: 'higher_better',
    window: 'cagr5y', applies_to: 'all', null_when: 'base year EPS <= 0, or fewer than 5 years', precision: 2 }),
  def({ key: 'revenue_cagr_5y', label: 'Revenue CAGR (5y)', category: 'growth', unit: 'pct',
    formula: 'compound annual growth of revenue over 5 fiscal years', direction: 'higher_better',
    window: 'cagr5y', applies_to: 'all', null_when: 'fewer than 5 fiscal years', precision: 2 }),
  def({ key: 'eps_growth_10y_pct', label: 'EPS growth over 10 years', category: 'growth', unit: 'pct',
    formula: 'Graham’s method: 3-year averages at both ends, aggregate change',
    direction: 'higher_better', window: 'cagr10y', applies_to: 'all',
    null_when: 'fewer than 10 fiscal years, or base average <= 0', precision: 2 }),
  def({ key: 'peg_lynch', label: 'PEG (Lynch, dividend-adjusted)', category: 'growth', unit: 'ratio',
    formula: '(eps_cagr_3y_pct + dividend_yield_pct) / pe_ttm  — higher is better',
    direction: 'higher_better', window: 'ttm', applies_to: 'all',
    null_when: 'P/E or growth is NULL', precision: 2 }),

  // ---- quality / leverage / liquidity ------------------------------------
  def({ key: 'current_ratio', label: 'Current ratio', category: 'liquidity', unit: 'x',
    formula: 'current_assets / current_liabilities', direction: 'higher_better', window: 'point',
    applies_to: NON_FINANCIAL, null_when: 'banks and insurers do not present a classified balance sheet', precision: 2 }),
  def({ key: 'debt_to_equity', label: 'Debt to equity', category: 'leverage', unit: 'x',
    formula: 'total_debt / equity_attributable', direction: 'lower_better', window: 'point',
    applies_to: NON_FINANCIAL, null_when: 'equity <= 0, or leverage is the business model', precision: 2 }),
  def({ key: 'interest_coverage', label: 'Interest coverage', category: 'leverage', unit: 'x',
    formula: 'ebit_ttm / interest_expense_ttm', direction: 'higher_better', window: 'ttm',
    applies_to: NON_FINANCIAL, null_when: 'no interest expense, or financials', precision: 2 }),
  def({ key: 'years_positive_eps', label: 'Consecutive profitable years', category: 'quality', unit: 'years',
    formula: 'count back from the latest audited FY while net profit > 0', direction: 'higher_better',
    window: 'fy', applies_to: 'all', null_when: 'no audited FY visible', precision: 0 }),
  def({ key: 'years_consecutive_dividend', label: 'Consecutive dividend years', category: 'dividend', unit: 'years',
    formula: 'count back while a cash dividend was paid in each fiscal year', direction: 'higher_better',
    window: 'fy', applies_to: 'all', null_when: 'corporate-action history incomplete', precision: 0 }),
  def({ key: 'piotroski_f', label: 'Piotroski F-score', category: 'forensic', unit: 'score',
    formula: '9 binary tests on profitability, leverage and efficiency', direction: 'higher_better',
    window: 'ttm', applies_to: NON_FINANCIAL, null_when: 'two comparable fiscal years unavailable', precision: 0 }),
  def({ key: 'altman_z2', label: 'Altman Z″', category: 'forensic', unit: 'score',
    formula: '3.25 + 6.56 WC/TA + 3.26 RE/TA + 6.72 EBIT/TA + 1.05 BVE/TL', direction: 'higher_better',
    window: 'point', applies_to: NON_FINANCIAL, null_when: 'undefined for banks and insurers', precision: 2 }),
  def({ key: 'beneish_m', label: 'Beneish M-score', category: 'forensic', unit: 'score',
    formula: '8-variable manipulation score; above -1.78 is a flag', direction: 'lower_better',
    window: 'fy', applies_to: NON_FINANCIAL, null_when: 'two consecutive fiscal years unavailable', precision: 2 }),
  def({ key: 'dividend_yield', label: 'Dividend yield', category: 'dividend', unit: 'pct',
    formula: 'dividend_ttm_per_share / close', direction: 'higher_better', window: 'ttm',
    applies_to: 'all', null_when: 'no dividend in the trailing twelve months', precision: 2 }),

  // ---- banking ------------------------------------------------------------
  def({ key: 'car', label: 'Capital adequacy ratio', category: 'banking', unit: 'pct',
    formula: 'total capital / risk-weighted assets', direction: 'higher_better', window: 'point',
    applies_to: FINANCIALS_ONLY, null_when: 'not a bank', precision: 2 }),
  def({ key: 'ldr', label: 'Loan-to-deposit ratio', category: 'banking', unit: 'pct',
    formula: 'loans_gross / deposits_total', direction: 'none', window: 'point',
    applies_to: FINANCIALS_ONLY, null_when: 'not a bank', precision: 2 }),
  def({ key: 'npl_gross_pct', label: 'Gross NPL ratio', category: 'banking', unit: 'pct',
    formula: 'npl_gross / loans_gross', direction: 'lower_better', window: 'point',
    applies_to: FINANCIALS_ONLY, null_when: 'not a bank', precision: 2 }),

  // ---- momentum & market context -----------------------------------------
  def({ key: 'return_6m', label: 'Total return (6m)', category: 'momentum', unit: 'pct',
    formula: 'dividend-adjusted price return over 126 trading days', direction: 'higher_better',
    window: 'd250', applies_to: 'all', null_when: 'fewer than 126 trading days of history', precision: 2 }),
  def({ key: 'rs_rank_6m', label: 'Relative strength rank (6m)', category: 'momentum', unit: 'rank',
    formula: 'percentile of return_6m within the screening universe, 1-99', direction: 'higher_better',
    window: 'd250', applies_to: 'all', null_when: 'return_6m is NULL', precision: 0 }),
  def({ key: 'dist_from_52w_high_pct', label: 'Distance from 52-week high', category: 'momentum', unit: 'pct',
    formula: '(high_52w - close) / high_52w x 100', direction: 'lower_better', window: 'd250',
    applies_to: 'all', null_when: 'fewer than 52 weeks of history', precision: 2 }),
  def({ key: 'sma50_above_sma200', label: 'SMA50 above SMA200', category: 'momentum', unit: 'bool',
    formula: 'close SMA(50) > close SMA(200)', direction: 'higher_better', window: 'd250',
    applies_to: 'all', null_when: 'fewer than 200 trading days', precision: 0 }),
  def({ key: 'volume_surge_20d', label: 'Volume surge', category: 'momentum', unit: 'x',
    formula: 'mean volume 5d / mean volume 60d', direction: 'higher_better', window: 'd60',
    applies_to: 'all', null_when: 'fewer than 60 trading days', precision: 2 }),
  def({ key: 'foreign_net_20d', label: 'Foreign net flow (20d)', category: 'ownership', unit: 'ratio',
    formula: 'sum(foreign_buy - foreign_sell, 20d) / avg_daily_value_20d', direction: 'higher_better',
    window: 'd20', applies_to: 'all', null_when: 'foreign-flow data not exposed by the provider', precision: 4 }),
  def({ key: 'ihsg_above_sma200', label: 'IHSG above its 200-day average', category: 'market', unit: 'bool',
    formula: 'index close > index SMA(200)', direction: 'higher_better', window: 'd250',
    applies_to: 'all', null_when: 'index history incomplete', precision: 0, is_context: true }),
];

export const METRICS: Readonly<Record<string, MetricDef>> = Object.freeze(
  Object.fromEntries(DEFS.map((d) => [d.key, d])),
);

export const METRIC_KEYS: readonly string[] = Object.freeze(DEFS.map((d) => d.key));

export function getMetric(key: string): MetricDef | undefined {
  return METRICS[key];
}

/** Duplicate keys in the registry are a build-time bug, not a runtime one. */
{
  const seen = new Set<string>();
  for (const d of DEFS) {
    if (seen.has(d.key)) throw new Error(`duplicate metric key in registry: ${d.key}`);
    seen.add(d.key);
  }
}
