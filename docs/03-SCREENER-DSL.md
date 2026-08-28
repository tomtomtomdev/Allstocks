# 03 — Screener DSL

A screener is a JSON document. The same document drives execution, the rule builder UI, the
human-readable criteria list, and the compiled SQL. Schema:
[schema/screener.schema.json](schema/screener.schema.json). Shipped definitions:
[../screeners/](../screeners/).

---

## 1. Document shape

```jsonc
{
  "id": "magic-formula",              // slug, stable
  "version": "1.0.0",                 // semver; bumping creates a new immutable screener_version
  "name": "Magic Formula",
  "name_id": "Formula Ajaib",         // Indonesian label
  "summary": "Cheap (high EBIT/EV) and good (high return on capital), ranked together.",
  "source": {
    "type": "book",                   // book | stockbit_preset | custom
    "title": "The Little Book That Still Beats the Market",
    "author": "Joel Greenblatt",
    "edition": "2010",
    "locator": "ch. 6–8, appendix",
    "fidelity": "adapted",            // faithful | adapted | inspired
    "adaptations": ["Financials and utilities excluded per the book; IDX liquidity floor added."]
  },
  "params": {                          // user-tunable knobs, referenced as {{param}}
    "min_market_cap_idr": { "type": "number", "default": 1e12, "label": "Min market cap" },
    "top_n":              { "type": "integer", "default": 30, "min": 5, "max": 100 }
  },
  "universe": { ... },                 // §2
  "filters": { ... },                  // §3
  "sector_profiles": { ... },          // §6
  "rank": { ... },                     // §4
  "explain": true,
  "min_data_completeness": 0.9,
  "notes_md": "Greenblatt intends this as a portfolio of 20–30 names held one year..."
}
```

## 2. Universe

```jsonc
"universe": {
  "exchange": ["IDX"],
  "boards": ["main", "development"],            // acceleration board excluded by default
  "exclude_flags": ["special_monitoring", "suspension", "full_call_auction"],
  "index_any": null,                            // e.g. ["LQ45","IDX80"] to restrict
  "sector_class_exclude": ["bank", "insurance", "multifinance"],
  "min_avg_daily_value_idr": 1e9,
  "min_market_cap_idr": "{{min_market_cap_idr}}",
  "min_years_listed": 2,
  "require_ttm": true                           // drop stocks without a complete TTM
}
```

Universe filters are separated from `filters` on purpose: the funnel reports universe
attrition (delisted, illiquid, wrong board, insufficient data) separately from strategy
attrition, so "my screener returned 3 stocks" is always attributable.

## 3. Filters

A boolean tree. Nodes:

```jsonc
{ "all": [ ... ] }                                  // AND
{ "any": [ ... ] }                                  // OR
{ "not": { ... } }
{ "atLeast": 3, "of": [ ... ] }                      // N-of-M (used by Rule #1's Big Five)

// leaf forms
{ "metric": "current_ratio", "op": ">=", "value": 2, "label": "Strong liquidity" }
{ "metric": "pe_ttm", "op": "between", "value": [0, 15] }
{ "metric": "sector_class", "op": "in", "value": ["non_financial"] }
{ "metric": "roe", "op": ">=", "percentile_of": "sector", "value": 0.5 }   // relative threshold
{ "metric": "gross_margin", "op": ">=", "compare_to": "sector_median" }
{ "expr": "long_term_debt <= working_capital", "label": "LTD under working capital" }
{ "streak": { "metric": "net_profit_attributable", "op": ">", "value": 0,
              "periods": 10, "grain": "fy", "allow_gaps": 0 } }
{ "history": { "metric": "roe", "op": ">=", "value": 0.15,
               "periods": 5, "grain": "fy", "quantifier": "all" } }   // all | any | atLeast:n
{ "cross": { "metric": "return_6m", "op": ">=", "percentile": 0.8 } }  // cross-sectional
```

Operators: `> >= < <= == != between in not_in`. `expr` accepts a restricted arithmetic grammar
over registry keys and numeric literals only — parsed to an AST, never string-interpolated into
SQL (a parser test asserts that `';' DROP` style inputs are rejected at parse time).

Every leaf may carry `label` (shown in the criteria list), `weight` (for scoring modes), and
`severity: "hard" | "soft"`. `soft` criteria do not exclude; they subtract from a score, which
is how "quality overlays" are expressed without gutting a screen's match count.

## 4. Ranking

```jsonc
// single metric
"rank": { "by": [{ "metric": "graham_mos_pct", "dir": "desc" }], "limit": 30 }

// sum of ranks (Magic Formula, Trending Value)
"rank": {
  "method": "sum_of_ranks",
  "components": [
    { "metric": "ebit_ev",        "dir": "desc" },
    { "metric": "roc_greenblatt", "dir": "desc" }
  ],
  "tie_break": [{ "metric": "market_cap", "dir": "desc" }],
  "limit": "{{top_n}}"
}

// decile composite (O'Shaughnessy Value Composite Two)
"rank": {
  "method": "decile_composite",
  "components": [
    { "metric": "pe_ttm", "dir": "asc" }, { "metric": "pb", "dir": "asc" },
    { "metric": "ps_ttm", "dir": "asc" }, { "metric": "pcf_ttm", "dir": "asc" },
    { "metric": "ev_ebitda", "dir": "asc" }, { "metric": "shareholder_yield", "dir": "desc" }
  ],
  "select": { "composite_decile": 1 },          // keep cheapest decile only
  "then_rank_by": [{ "metric": "return_6m", "dir": "desc" }],
  "limit": 25
}

// weighted z-score
"rank": { "method": "z_weighted",
          "components": [{ "metric": "roic", "dir": "desc", "weight": 2 },
                         { "metric": "fcf_yield", "dir": "desc", "weight": 1 }],
          "winsorize": 0.02, "limit": 20 }
```

Composite ranks are computed **within the screener's own universe after universe filters but
before strategy filters** unless `rank.scope: "post_filter"` is set — the distinction matters
(Magic Formula ranks the whole eligible universe; Trending Value ranks then filters). The
default is stated per screener in the catalog.

## 5. Compilation to SQL

`compile(definition, { asOf, params }) -> { sql, values, plan }`

1. **Resolve** params, expand `{{...}}` into bound parameters (never literals).
2. **Universe CTE** — `SELECT security_id FROM mv_metrics_latest JOIN dim_security … WHERE <universe>`.
3. **History CTEs** — one per `streak` / `history` node, aggregating `fact_metric` (or
   `fact_statement_quarter` for FY grains) into a boolean or count per security.
4. **Cross-sectional CTEs** — `PERCENT_RANK()`/`NTILE()` window functions over the universe CTE
   for `cross`, `percentile_of`, and every `rank.components` entry.
5. **Predicate** — the filter tree lowered to a `WHERE` clause; `soft` criteria lowered instead
   into `CASE WHEN … THEN weight ELSE 0 END` summed into `soft_score`.
6. **Explain projection** — when `explain: true`, each leaf is also projected as
   `bool_or_null AS crit_<i>`, evaluated for the whole universe, so results and near-misses come
   from one pass rather than N queries.
7. **Rank + limit**, then `INSERT INTO screener_result …` inside a transaction with the
   `screener_run` row.

Guarantees enforced by tests: the emitted SQL contains **no** value literals from user input; the
result set is always a subset of the universe CTE; every referenced metric key exists in the
registry; and the plan avoids sequential scans on `fact_metric` (index on
`(metric_key, as_of_date, security_id)`).

### 5.1 Explainability output

Per (run, security, criterion): `status ∈ {PASS, FAIL, INSUFFICIENT_DATA, NOT_APPLICABLE}`,
`actual_value`, `threshold`, `miss_pct` (signed distance to the threshold, for near-miss
ranking). This one table powers:

- the per-row criterion checklist,
- the funnel (`COUNT(*) FILTER (WHERE all criteria up to i pass)`),
- the near-miss list ("failed exactly one criterion, by ≤ 10%"),
- `GET /screeners/:slug/test?ticker=` (first failing criterion for any ticker),
- turnover attribution (which criterion flipped when a stock dropped out).

## 6. Sector profiles

```jsonc
"sector_profiles": {
  "bank": {
    "replace": ["current_ratio", "ltd_vs_working_capital", "ev_ebitda"],
    "with": { "all": [
      { "metric": "car", "op": ">=", "value": 12, "label": "Capital adequacy ≥ 12%" },
      { "metric": "ldr", "op": "between", "value": [78, 92], "label": "Healthy loan-to-deposit" },
      { "metric": "npl_gross_pct", "op": "<=", "value": 3, "label": "NPL ≤ 3%" }
    ]}
  }
}
```

A screener either excludes a sector class in `universe.sector_class_exclude` or handles it with a
profile. The validator rejects a screener that references a metric with
`applies_to != all` without doing one of the two — this is how we prevent the classic bug of
screening banks on current ratio and quietly getting nonsense.

## 7. Validation and lifecycle

- `pnpm screeners:validate` runs in CI: JSON Schema, registry key existence, applicability check,
  param-reference check, compilation smoke test, and an execution test against the fixture
  warehouse asserting the golden pass/fail cases.
- Shipped screeners are immutable at a given version; editing one in the UI forks it to
  `source: "custom"` with `derived_from: "magic-formula@1.0.0"`.
- `screener_run` stores `dsl_hash`, `registry_version`, `param_values`, and `as_of` — a result
  set is always reproducible.
