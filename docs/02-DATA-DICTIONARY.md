# 02 — Data Dictionary and Metric Layer

The canonical metric registry. Screeners may reference **only** keys defined here; the registry
is the single source of truth and generates (a) the wide `mv_metrics_latest` view, (b) the
`metric` enum in the screener JSON Schema, and (c) the metric picker in the rule builder.

---

## 1. Registry entry shape

```ts
interface MetricDef {
  key: string;                 // snake_case, stable forever; renames go through an alias table
  label: string;               // UI label (English) + label_id (Indonesian)
  category: 'valuation'|'profitability'|'growth'|'quality'|'leverage'|'liquidity'
          | 'cashflow'|'dividend'|'momentum'|'size'|'forensic'|'banking'|'ownership';
  unit: 'idr'|'usd'|'ratio'|'pct'|'x'|'years'|'count'|'score'|'rank'|'date';
  formula: string;             // human-readable formula shown in the UI hover card
  sql: string;                 // SQL expression over base tables/CTEs (compiler inlines this)
  deps: string[];              // base line items or other metric keys
  direction: 'higher_better'|'lower_better'|'none';
  window?: 'point'|'ttm'|'fy'|'avg3y'|'avg5y'|'cagr3y'|'cagr5y'|'cagr10y'|'d20'|'d60'|'d120'|'d250';
  applies_to: SectorClass[] | 'all';
  null_when: string;           // documented reason a value may be NULL
  precision: number;
}
```

Registry lives in `packages/core/src/metrics/*.ts`, one file per category, aggregated into a
frozen `METRICS: Record<string, MetricDef>` with a compile-time exhaustive key union.

---

## 2. Base line items (from `fact_statement` / `fact_statement_quarter`)

Typed columns, all `numeric(28,4)` in reporting currency base units. Grouped:

**Income statement (differenced to discrete quarters):** `revenue`, `cogs`, `gross_profit`,
`opex_selling`, `opex_general`, `operating_profit`, `ebit`, `depreciation`, `amortization`,
`interest_income`, `interest_expense`, `other_income_net`, `fx_gain_loss`, `pretax_profit`,
`tax_expense`, `net_profit`, `net_profit_attributable`, `minority_interest_profit`,
`eps_basic`, `eps_diluted`, `weighted_shares_basic`, `weighted_shares_diluted`,
`comprehensive_income`.

**Balance sheet (never differenced):** `cash_and_equivalents`, `short_term_investments`,
`receivables_trade`, `inventory`, `prepaid_other_current`, `current_assets`,
`ppe_gross`, `ppe_net`, `intangibles`, `goodwill`, `investments_associates`,
`deferred_tax_assets`, `other_non_current_assets`, `non_current_assets`, `total_assets`,
`payables_trade`, `short_term_debt`, `current_portion_ltd`, `accrued_other_current`,
`current_liabilities`, `long_term_debt`, `lease_liabilities`, `deferred_tax_liabilities`,
`other_non_current_liabilities`, `non_current_liabilities`, `total_liabilities`,
`paid_in_capital`, `retained_earnings`, `treasury_stock`, `other_equity`,
`equity_attributable`, `minority_interest_equity`, `equity_total`, `shares_outstanding`.

**Cash flow (differenced):** `cfo`, `cfi`, `cff`, `capex`, `acquisitions`, `asset_disposals`,
`dividends_paid`, `share_issuance`, `share_buyback`, `debt_raised`, `debt_repaid`,
`fx_effect_cash`, `net_change_cash`, `working_capital_change`, `non_cash_charges`.

**Banking extension (`sector_class = bank`):** `loans_gross`, `loans_net`, `allowance_loan_loss`,
`npl_gross`, `deposits_total`, `casa_deposits`, `time_deposits`, `net_interest_income`,
`fee_income`, `provision_expense`, `operating_expense_bank`, `car_total`, `tier1_capital`,
`rwa_total`, `earning_assets`.

**Insurance / multifinance extensions:** `gross_premium`, `net_premium`, `claims_expense`,
`financing_receivables`, `nim_multifinance`, `gearing_ratio`.

---

## 3. Derived metrics

### 3.1 Size and market data
| key | formula | notes |
| --- | --- | --- |
| `market_cap` | `close × shares_outstanding` | uses latest known share count; a corp action same-day is applied first |
| `enterprise_value` | `market_cap + total_debt − cash_and_equivalents − short_term_investments + minority_interest_equity + preferred_equity` | Carlisle/Greenblatt convention: minorities added, not netted |
| `total_debt` | `short_term_debt + current_portion_ltd + long_term_debt + lease_liabilities` | leases included from IFRS-16 adoption onward; `lease_liabilities` may be 0 pre-2020 |
| `net_debt` | `total_debt − cash_and_equivalents − short_term_investments` | |
| `avg_daily_value_20d` | `avg(value_idr) over last 20 trading days` | liquidity gate for every screener |
| `free_float_mcap` | `market_cap × free_float_pct` | |
| `years_listed` | `(as_of − listing_date)/365.25` | |

### 3.2 Valuation
`pe_ttm` = `market_cap / net_profit_attributable_ttm` (NULL if TTM ≤ 0 — we never show a
negative P/E as if it were cheap) · `pe_avg3y` = `price / (3-year average EPS)` (Graham ch.14) ·
`pb` = `market_cap / equity_attributable` · `ps_ttm` · `pcf_ttm` = `market_cap / cfo_ttm` ·
`pfcf_ttm` = `market_cap / fcf_ttm` · `ev_ebit` · `ev_ebitda` · `ev_sales` ·
`ev_op_earnings` (Acquirer's Multiple: `EV / (operating profit adjusted: EBIT + rent/lease
add-back − maintenance capex proxy)`; the exact adjustment is documented in the catalog entry) ·
`ebit_ev` = `1/ev_ebit` (Magic Formula's yield form) · `earnings_yield_ttm` ·
`fcf_yield` = `fcf_ttm / market_cap` · `owner_earnings_yield` (§3.7) ·
`graham_number` = `sqrt(22.5 × eps_ttm × bvps)` (NULL if either input ≤ 0) ·
`graham_mos_pct` = `(graham_number − close)/graham_number × 100` ·
`ncav_per_share` = `(current_assets − total_liabilities)/shares_outstanding` ·
`ncav_discount_pct` · `epv` (Earnings Power Value: normalized EBIT × (1−tax) / WACC proxy,
WACC fixed at a configured 12% for IDR and disclosed as an assumption) ·
`shareholder_yield` = `(dividends_paid + net_buyback)/market_cap`.

### 3.3 Profitability
`gross_margin`, `operating_margin`, `ebitda_margin`, `net_margin`, `roe` =
`net_profit_attributable_ttm / avg(equity_attributable, 4q)`, `roa`, `roic` =
`ebit_ttm × (1 − effective_tax_rate) / avg(invested_capital)` where
`invested_capital = total_debt + equity_total − cash_and_equivalents`,
`roc_greenblatt` = `ebit_ttm / (net_working_capital + net_fixed_assets)` with
`net_working_capital = max(0, current_assets − excess_cash − (current_liabilities − short_term_debt))`
(Greenblatt's definition, not a generic ROC — the two are not interchangeable and are stored as
separate keys), `effective_tax_rate`, `roe_5y_min` / `roe_5y_avg`, `margin_stability_5y` =
`stddev(operating_margin over 5 FY) `.

### 3.4 Growth
`revenue_growth_yoy`, `revenue_cagr_3y/5y/10y`, `eps_growth_yoy`,
`eps_growth_q_yoy` (latest discrete quarter vs. same quarter prior year — the CANSLIM "C"),
`eps_cagr_3y/5y/10y`, `eps_growth_10y_pct` (Graham's aggregate ten-year change using
3-year averages at both ends, per ch.14 — **not** a point-to-point comparison),
`bvps_cagr_5y/10y`, `fcf_cagr_5y/10y`, `dividend_cagr_5y`, `sales_accel` (latest YoY minus
prior YoY), `peg` = `pe_ttm / eps_cagr_3y_pct`, `peg_lynch` =
`(eps_cagr_3y_pct + dividend_yield_pct) / pe_ttm` (Lynch's dividend-adjusted form; **higher is
better**, ≥ 1.5 acceptable, ≥ 2.0 good — note the inverted direction vs. plain PEG).

### 3.5 Quality, leverage, liquidity
`current_ratio`, `quick_ratio`, `cash_ratio`, `working_capital`,
`debt_to_equity`, `net_debt_to_ebitda`, `interest_coverage` = `ebit_ttm / interest_expense_ttm`,
`ltd_vs_working_capital` (boolean-ish ratio for Graham: `long_term_debt / working_capital`),
`equity_ratio`, `accruals_ratio` = `(net_profit_ttm − cfo_ttm)/avg(total_assets)`,
`cfo_to_ni_3y` = `Σcfo_3y / Σnet_profit_3y` (Quality-of-Earnings guard),
`inventory_days`, `receivable_days`, `payable_days`, `ccc`,
`inventory_growth_vs_sales_growth` (Lynch's inventory check),
`dilution_5y_pct` = `shares_outstanding CAGR over 5y`,
`years_positive_eps` (count of consecutive FY with `net_profit_attributable > 0`, counted
backwards from the latest audited FY), `years_positive_fcf`, `years_consecutive_dividend`,
`years_nondecreasing_dividend`.

### 3.6 Forensic scores
- **`piotroski_f`** (0–9, Piotroski 2000): ROA > 0; CFO > 0; ΔROA > 0; CFO > net income;
  Δleverage (LTD/assets) < 0; Δcurrent ratio > 0; no new shares issued; Δgross margin > 0;
  Δasset turnover > 0. Each component stored separately in `fact_metric` as
  `piotroski_c1 … piotroski_c9` so the UI can show which points were earned.
- **`altman_z`** — non-financial version: `1.2×WC/TA + 1.4×RE/TA + 3.3×EBIT/TA + 0.6×MVE/TL + 1.0×Sales/TA`.
  For private-form/emerging markets the Z″ variant (`3.25 + 6.56×WC/TA + 3.26×RE/TA + 6.72×EBIT/TA + 1.05×BVE/TL`)
  is stored as `altman_z2` and is the one used for IDX screeners; both are exposed and the
  screeners state which they use. NULL for banks and insurers.
- **`beneish_m`** — 8-variable: DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA. Threshold
  `> −1.78` flags possible manipulation. Requires two consecutive FY; NULL otherwise.
- **`ohlson_o`**, **`montier_c`** — optional, M6.

### 3.7 Cash flow
`fcf` = `cfo_ttm − capex_ttm` · `fcf_margin` ·
`owner_earnings` = `net_profit + depreciation + amortization + other_non_cash − maintenance_capex`,
where `maintenance_capex` is proxied as `min(capex, depreciation + amortization)` and the proxy
is disclosed in the UI (Buffett's owner earnings requires judgment we cannot automate; the app
shows the proxy and the raw inputs rather than pretending precision) ·
`capex_to_cfo` · `cash_conversion` = `cfo_ttm / ebitda_ttm` · `dividend_fcf_cover`.

### 3.8 Dividend
`dividend_ttm_per_share`, `dividend_yield`, `payout_ratio` (`dividends_paid / net_profit`),
`payout_ratio_fcf`, `dividend_growth_5y`, `years_consecutive_dividend`,
`special_dividend_flag`.

### 3.9 Momentum and technical (for CANSLIM / Trending Value)
`return_1m/3m/6m/12m` (total return, dividend-adjusted) ·
`rs_rank_6m` = cross-sectional percentile of 6-month total return within the screening universe
(1–99, O'Neil-style) · `dist_from_52w_high_pct` · `dist_from_52w_low_pct` ·
`price_above_sma50/sma200` · `sma50_above_sma200` · `volatility_60d` ·
`volume_surge_20d` = `avg volume 5d / avg volume 60d` ·
`foreign_net_20d` = `Σ(foreign_buy − foreign_sell) over 20d / avg_daily_value_20d` ·
`ihsg_above_sma200` (a market-level metric, joined to every row; drives CANSLIM's "M").

### 3.10 Banking
`nim`, `cir` (cost-to-income), `ldr`, `casa_ratio`, `npl_gross_pct`, `npl_coverage`,
`car`, `tier1_ratio`, `loan_growth_yoy`, `credit_cost`, `roa_bank`, `roe_bank`,
`pre_provision_operating_profit`.

### 3.11 Ownership and flags
`insider_ownership_pct`, `institutional_ownership_pct`, `public_float_pct` (from the
shareholder composition dataset if available; NULL-tolerant), `index_membership` (array),
`board` (`main|development|acceleration`), `special_monitoring_flag`,
`full_call_auction_flag`, `suspension_flag`, `going_concern_flag` (parsed from audit opinion
text where available), `auditor_opinion` (`unqualified|qualified|adverse|disclaimer`),
`auditor_changed_flag`, `shariah_flag`.

---

## 4. Point-in-time rules

Everything the screener sees at `as_of = D` must have been public at `D`.

1. A statement is visible from `publish_date` (inclusive). Metrics for `as_of = D` use only
   statements with `publish_date ≤ D`, and among those the **highest revision** available at `D`
   — not the latest revision known today. This is what makes backtests honest.
2. If `publish_date` is missing: fallback lag = `period_end + 45 days` for Q1/H1/9M,
   `period_end + 90 days` for FY (aligned with IDX/OJK filing deadlines). Any metric built on a
   fallback carries `publish_date_assumed = true`, and any backtest containing such rows prints
   `lag_assumed` in its header.
3. `shares_outstanding` at `as_of` comes from the latest statement visible at `as_of`, adjusted
   forward by corporate actions with `ex_date ≤ as_of`.
4. Index membership uses `dim_index_membership` validity windows, never today's membership.
5. Delisted and suspended securities remain in the warehouse with `active = false` and are
   included in backtest universes for the periods when they were tradable — omitting them is
   survivorship bias, and this app treats that as a bug.
6. Prices are never restated. Adjusted prices are recomputed from raw + corporate actions on
   demand, so an added corporate action fixes history without rewriting stored bars.

## 5. NULL policy

`NULL` means "not computable", never "zero" and never "fails". Screener semantics:

- A criterion comparing against `NULL` evaluates to **false**, and the criterion result is
  recorded as `INSUFFICIENT_DATA` (distinct from `FAIL`) so the UI can say
  *"BBCA: current ratio not applicable (bank)"* rather than *"BBCA fails current ratio"*.
- A screener declares `min_data_completeness` (default 0.9): a stock missing more than 10% of
  the metrics the screener references is excluded from the universe with reason
  `insufficient_data` and counted separately in the funnel. Silent thinning of the universe is
  the most common way screeners lie.
- Ranking ignores `NULL` rather than sorting it last; a stock with a `NULL` in any composite
  rank component is excluded from that composite and reported.

## 6. Metric versioning

Metric definitions are versioned with the package. Changing a formula requires (a) a new
`registry_version`, (b) a migration recomputing `fact_metric` for the affected keys, and (c) a
note in the screener's UI header if the change alters historical results. `screener_run` records
`registry_version` so old runs remain interpretable.
