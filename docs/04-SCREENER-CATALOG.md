# 04 — Book Screener Catalog

Fifteen screeners, each traceable to a book. Every entry gives: the source, the criteria as
Allstocks implements them, what was adapted for IDX and why, and the golden test cases the
implementation must satisfy.

**Rules that apply to all of them.** Money thresholds are in IDR and are *inflation- and
market-scaled* from the book's original figures, not literal conversions — Graham's "$100 million
of annual sales" in 1972 is not "Rp 1.6 billion". Where a book's threshold is scaled, the entry
says so and gives the reasoning. All screeners inherit the global universe defaults
(main/development board, no special-monitoring board, `avg_daily_value_20d ≥ Rp 1 bn`,
`years_listed ≥ 2`, complete TTM) unless overridden. All thresholds are exposed as `params` so
the operator can tune them, and every screener carries `fidelity` ∈ {faithful, adapted, inspired}
so the UI never implies more precision than exists.

A global **forensic overlay** is available on every screener as an opt-in toggle
(`overlay: quality_guard`): excludes `beneish_m > −1.78`, `altman_z2 < 1.1`,
`cfo_to_ni_3y < 0.7`, `auditor_opinion ∈ {adverse, disclaimer}`, `going_concern_flag = true`.
Default: on for value screeners, off for growth screeners (where it would remove legitimate
high-accrual growers), stated per entry.

---

## 1. Graham Defensive Investor — `graham-defensive`

**Source.** Benjamin Graham, *The Intelligent Investor*, rev. ed. (2003), ch. 14 — the seven
criteria for the defensive investor. Fidelity: **adapted**.

| # | Graham's criterion | Allstocks implementation |
| --- | --- | --- |
| 1 | Adequate size | `revenue_ttm ≥ Rp 2,000 bn` (scaled: Graham's $100 m 1972 sales ≈ mid-cap floor; on IDX this keeps roughly the top 45% of issuers by revenue) |
| 2 | Strong financial condition | `current_ratio ≥ 2.0` **and** `long_term_debt ≤ working_capital` |
| 3 | Earnings stability | `streak(net_profit_attributable > 0, 7 FY)` — **relaxed from 10** because IDX statement history from the provider is often 10–12 years and a 10-year streak requires 10 clean years; the parameter default is 7 with 10 selectable |
| 4 | Dividend record | `years_consecutive_dividend ≥ 5` — **relaxed from 20**, which on IDX would leave a handful of names; 20 is selectable and the UI shows the count |
| 5 | Earnings growth | `eps_growth_10y_pct ≥ 33` using 3-year averages at both ends (Graham's own method) |
| 6 | Moderate P/E | `pe_avg3y ≤ 15` |
| 7 | Moderate price/assets | `pb ≤ 1.5` **or** `pe_ttm × pb ≤ 22.5` |

**Bank profile** (Graham excluded financials from criteria 2 and 7's asset test; we route rather
than exclude, because banks dominate IDX market cap): replaces #2 with `car ≥ 12`,
`ldr ∈ [78, 92]`, `npl_gross_pct ≤ 3`; #7 becomes `pb ≤ 2.0`. Bank rows are badged
`bank profile` in the results table.

**Rank.** `graham_mos_pct` desc, limit 30. **Overlay.** quality_guard on.
**Expected IDX hit rate.** 5–20 names; a run returning 0 should show attrition at #3/#4 in the
funnel, which is the normal outcome in a hot market.
**Golden tests.** A large consumer staple with a long dividend record must pass; a recent IPO must
fail #3 with `INSUFFICIENT_DATA`, not `FAIL`; a bank must be evaluated on the bank profile.

## 2. Graham Net-Current-Asset Value (net-nets) — `graham-ncav`

**Source.** *The Intelligent Investor* ch. 15 and *Security Analysis* — buy below two-thirds of
net current asset value. Fidelity: **faithful**.

- `ncav_per_share > 0` and `close ≤ 0.667 × ncav_per_share`
- `net_profit_attributable_ttm > 0` (Graham's "not losing money" qualifier)
- `total_debt / equity_attributable ≤ 1.0`
- `market_cap ≥ Rp 300 bn` and `avg_daily_value_20d ≥ Rp 500 mn` (tradability floor; net-nets are
  by nature tiny and this is the one place the liquidity gate is loosened)
- Excludes: banks, insurers, multifinance (their current assets are not "current" in Graham's
  sense), and property developers holding land as inventory at historical cost.
- **Rank.** `ncav_discount_pct` desc. **Overlay.** quality_guard on (net-nets are where
  accounting fraud concentrates). **Expected hits.** 0–8; usually 0 in a bull market, and the UI
  says "no matches" plainly rather than implying a bug.

## 3. Graham Number Margin of Safety — `graham-number`

**Source.** Graham's rule of thumb formalized from ch. 14's `P/E × P/B ≤ 22.5`.
Fidelity: **adapted** (the "Graham Number" name is later shorthand, not Graham's own term).

- `graham_number = sqrt(22.5 × eps_ttm × bvps)`, requires both inputs > 0
- `graham_mos_pct ≥ 30`
- `roe ≥ 10%`, `debt_to_equity ≤ 1.0`, `current_ratio ≥ 1.5` (ex-financials)
- `years_positive_eps ≥ 5`
- **Rank.** `graham_mos_pct` desc, limit 40. Serves as the app's "cheap and not broken" baseline.

## 4. Magic Formula — `magic-formula`

**Source.** Joel Greenblatt, *The Little Book That Still Beats the Market* (2010), ch. 6–8 +
appendix. Fidelity: **adapted**.

- Universe: exclude `bank`, `insurance`, `multifinance`, `utility_regulated` (the book excludes
  financials and utilities); `market_cap ≥ Rp 1,000 bn` (the book's $50 m floor scaled to IDX
  liquidity reality); ADTV ≥ Rp 2 bn.
- Rank the **whole eligible universe** (`rank.scope: pre_filter`) by `sum_of_ranks` of
  `ebit_ev` desc and `roc_greenblatt` desc. Top `top_n` (default 30).
- `roc_greenblatt = ebit_ttm / (net_working_capital + net_fixed_assets)` exactly as the book
  defines it — stored separately from generic `roic`, which is **not** a substitute.
- Hard exclusions only: `ebit_ttm > 0`, `enterprise_value > 0`, no special-monitoring board.
- **Overlay.** quality_guard off by default (Greenblatt's method is deliberately mechanical);
  offered as a toggle with a note that it changes the strategy.
- **Golden test.** The combined-rank arithmetic must match a hand-computed 10-stock example
  committed as a fixture, including tie handling.

## 5. Acquirer's Multiple — `acquirers-multiple`

**Source.** Tobias Carlisle, *The Acquirer's Multiple* (2017) and *Deep Value* (2014);
forensic screens from Gray & Carlisle, *Quantitative Value* (2012). Fidelity: **adapted**.

- `ev_op_earnings` ascending — cheapest 30. Operating earnings = `ebit + lease/rent add-back`,
  and EV includes minorities and preferred, per Carlisle.
- Forensic gates from *Quantitative Value*: `beneish_m ≤ −1.78`, `altman_z2 ≥ 1.8`,
  `accruals_ratio` not in the worst universe decile, `cfo_to_ni_3y ≥ 0.8`.
- Quality gate: `piotroski_f ≥ 5`, `interest_coverage ≥ 2`.
- Excludes financials. `market_cap ≥ Rp 500 bn`.
- **Rank.** `ev_op_earnings` asc, tie-break `piotroski_f` desc.

## 6. Piotroski F-Score in the Cheap Quintile — `piotroski-value`

**Source.** Joseph Piotroski, *Value Investing: The Use of Historical Financial Statement
Information to Separate Winners from Losers* (2000) — the paper the technique comes from, as
popularized in *Quantitative Value*. Fidelity: **faithful**.

- Universe restricted to the **cheapest `pb` quintile** (`cross: pb ≤ 0.2 percentile`), which is
  Piotroski's own setup — the score is only predictive inside book-value-cheap names.
- `piotroski_f ≥ 8` (9 selectable). All nine components displayed individually.
- `equity_attributable > 0` (negative-equity stocks break the P/B sort).
- Excludes financials (several components are undefined for banks; a bank variant using
  `car`, `npl`, `nim` trend, and `cir` trend is deferred to M6 and explicitly *not* claimed to be
  Piotroski's score).
- **Rank.** `piotroski_f` desc, then `pb` asc.

## 7. Trending Value — `trending-value`

**Source.** James O'Shaughnessy, *What Works on Wall Street*, 4th ed. (2011), ch. on Value
Composite Two + the Trending Value combination. Fidelity: **adapted**.

- `decile_composite` over six factors, equal-weighted decile ranks: `pe_ttm` asc, `pb` asc,
  `ps_ttm` asc, `pcf_ttm` asc, `ev_ebitda` asc, `shareholder_yield` desc.
- Keep the **cheapest composite decile**, then rank by `return_6m` desc, take top 25.
- Universe: `market_cap ≥ Rp 750 bn`, ADTV ≥ Rp 2 bn, all sectors **including** financials
  (O'Shaughnessy's "all stocks" universe), but `ev_ebitda` is excluded from the composite for
  `sector_class = bank` and their composite is renormalized over the remaining five factors —
  the renormalization is disclosed in the row's hover card.
- IDX adaptation: with ~950 tickers, a decile is ~60 names after universe filters, well above the
  25 selected, so the method survives the smaller market. If the eligible universe falls below
  300, the app widens to the cheapest **quintile** and says so in the header.
- **Overlay.** quality_guard off (the method is intentionally purely quantitative).

## 8. Lynch GARP / Fast Growers — `lynch-fast-growers`

**Source.** Peter Lynch, *One Up on Wall Street* (1989/2000), the six categories +
the P/E-to-growth and inventory checks; *Beating the Street* for the dividend-adjusted form.
Fidelity: **adapted**.

- `peg_lynch ≥ 1.5` where `peg_lynch = (eps_cagr_3y_pct + dividend_yield_pct) / pe_ttm`
  (**higher is better** — the inverse of the conventional PEG; ≥ 2.0 flagged "excellent")
- `eps_cagr_3y_pct ∈ [20, 50]` — Lynch's fast-grower band; growth above 50% is *excluded*
  because he treats it as unsustainable, which is a criterion, not an oversight
- `revenue_growth_yoy ≥ 15%`
- `debt_to_equity ≤ 0.5` (ex-financials; Lynch's "a company with no debt can't go bankrupt")
- `inventory_growth_vs_sales_growth ≤ 1.0` — the inventory check ("if inventories rise faster
  than sales, watch out"); `NOT_APPLICABLE` for service businesses with no inventory line
- `market_cap ≤ Rp 30,000 bn` — Lynch's preference for smaller companies with room to run
- `institutional_ownership_pct ≤ 60` (soft, weight 1) — "undiscovered" proxy; soft because IDX
  ownership data coverage is patchy
- `net_profit_attributable_ttm > 0`, `years_positive_eps ≥ 3`
- **Rank.** `peg_lynch` desc. **Overlay.** quality_guard on, minus the accruals test.

## 9. Buffett Quality Compounder — `buffett-compounder`

**Source.** Robert Hagstrom, *The Warren Buffett Way* (3rd ed.) — the business/management/
financial/value tenets — with owner earnings from Buffett's 1986 shareholder letter (appendix).
Fidelity: **inspired** (the qualitative tenets cannot be screened; the app says so on the page).

- `history(roe ≥ 15%, 5 FY, all)` — consistency, not an average
- `roic ≥ 12%`
- `history(net_margin ≥ 10%, 5 FY, atLeast:4)`
- `net_margin` not declining: `net_margin ≥ net_margin_5y_avg × 0.9`
- `debt_to_equity ≤ 0.6`, `interest_coverage ≥ 5`
- `history(fcf > 0, 5 FY, all)`
- `owner_earnings_yield ≥ 6%` (the maintenance-capex proxy is disclosed — see
  [02-DATA-DICTIONARY.md](02-DATA-DICTIONARY.md) §3.7)
- Retained-earnings test: `Δmarket_cap(5y) / Σretained_earnings(5y) ≥ 1.0` — the "one dollar
  premise"; `NOT_APPLICABLE` if listed < 5 y
- `dilution_5y_pct ≤ 2`
- Excludes banks from `interest_coverage` and `debt_to_equity` via a bank profile
  (`car ≥ 15`, `roe ≥ 15`, `cir ≤ 50`, `npl_gross_pct ≤ 2.5`, `casa_ratio ≥ 50`)
- **Rank.** `roic` desc, tie-break `owner_earnings_yield` desc.
- **Note shown in UI.** "This screener finds businesses with Buffett-like *financial* signatures.
  Moat, management quality, and circle of competence are not screenable — read the filings."

## 10. Fisher Growth (Uncommon Profits proxy) — `fisher-growth`

**Source.** Philip Fisher, *Common Stocks and Uncommon Profits* (1958) — the fifteen points.
Fidelity: **inspired**; twelve of the fifteen points are qualitative and the entry lists which
three are proxied.

- `revenue_cagr_5y ≥ 12%` (point 1: products with sales-increasing runway)
- `gross_margin ≥ sector_median` and `operating_margin ≥ sector_median` (points 5 & 6: worthwhile
  profit margins, maintained)
- `margin_stability_5y ≤ 4 pp` stdev of operating margin (point 6: *maintaining* margins)
- `capex_to_cfo ≥ sector_median` **or** R&D intensity ≥ sector median where the line item exists
  (point 2: management's commitment to future growth); soft, weight 1
- `dilution_5y_pct ≤ 5` (point 15: management's attitude to minority shareholders)
- `roe ≥ 12%`, `net_debt_to_ebitda ≤ 2.0`
- **Rank.** `revenue_cagr_5y` desc. **Fidelity note prominent in UI.**

## 11. CANSLIM (IDX-adapted) — `canslim-idx`

**Source.** William O'Neil, *How to Make Money in Stocks* (4th ed.). Fidelity: **adapted** —
O'Neil's RS Rating, chart bases, and institutional-sponsorship data have IDX substitutes.

| Letter | O'Neil | Allstocks |
| --- | --- | --- |
| C | Current quarterly EPS +25% or more | `eps_growth_q_yoy ≥ 25%` **and** `revenue_growth_yoy ≥ 20%` |
| A | Annual earnings increases | `eps_cagr_3y ≥ 20%` **and** `history(eps>prior, 3 FY, all)` **and** `roe ≥ 17%` |
| N | New product / new high | `dist_from_52w_high_pct ≤ 15` |
| S | Supply and demand | `volume_surge_20d ≥ 1.2`; `free_float_mcap ≥ Rp 500 bn` |
| L | Leader, not laggard | `rs_rank_6m ≥ 80` (percentile of 6-month total return in the universe) |
| I | Institutional sponsorship | `foreign_net_20d > 0` as the available proxy; if foreign-flow data is unavailable the criterion degrades to `avg_daily_value_20d ≥ Rp 5 bn` and the substitution is shown |
| M | Market direction | `ihsg_above_sma200 = true` — a **gate on the whole screener**: when the index is below its 200-day average the screener returns zero matches *by design* and the UI states the reason. This is O'Neil's most important rule and the most commonly ignored one |

- Additional: `close > sma50 > sma200`, `avg_daily_value_20d ≥ Rp 5 bn`.
- **Rank.** `rs_rank_6m` desc, tie-break `eps_growth_q_yoy` desc. **Overlay.** quality_guard off
  (it would exclude legitimate fast growers), but `beneish_m` is still displayed as a warning chip.

## 12. Deep Value / Negative Enterprise Value — `deep-value-negative-ev`

**Source.** Tobias Carlisle, *Deep Value* (2014), ch. on net-cash and negative-EV situations.
Fidelity: **faithful**.

- `enterprise_value < 0` **or** `ev_ebit ∈ (0, 3]`
- `net_debt < 0` and `|net_debt| ≥ 0.30 × market_cap`
- `cfo_ttm > 0` over the last 2 FY (a cash-burning net-cash stock is a melting ice cube)
- `altman_z2 ≥ 1.1`, `going_concern_flag = false`
- `market_cap ≥ Rp 200 bn`, ADTV ≥ Rp 300 mn
- **Rank.** `ev_ebit` asc with negative-EV names first. **Expected hits.** 0–10.

## 13. Dhandho Low-Risk High-Uncertainty — `pabrai-dhandho`

**Source.** Mohnish Pabrai, *The Dhandho Investor* (2007) — few bets, big bets, infrequent bets;
low risk, high uncertainty; buy existing businesses cheap. Fidelity: **inspired**.

- `fcf_yield ≥ 10%`
- `net_debt ≤ 0` (Pabrai's downside protection)
- `history(roic ≥ 15%, 3 FY, atLeast:2)`
- `insider_ownership_pct ≥ 30` — owner-operator (soft if ownership data missing)
- `market_cap ∈ [Rp 500 bn, Rp 20,000 bn]`
- `close ≤ 0.7 × epv` — the 30% margin of safety against Earnings Power Value, with the WACC
  assumption (12% IDR) shown next to the number
- Excludes financials. **Rank.** `fcf_yield` desc. **Overlay.** quality_guard on.

## 14. Dividend Compounder — `dividend-compounder`

**Source.** Christopher Browne, *The Little Book of Value Investing* (2006), and Graham's
dividend emphasis; Indonesian retail context where dividend yield drives much of the market.
Fidelity: **adapted**.

- `dividend_yield ≥ 4%` and `dividend_yield ≤ 15%` (an upper bound: above 15% on IDX is usually a
  special dividend or a value trap — the criterion exists to catch it, and `special_dividend_flag`
  is shown)
- `payout_ratio ≤ 70%` and `payout_ratio_fcf ≤ 85%`
- `years_consecutive_dividend ≥ 5`, `years_nondecreasing_dividend ≥ 3`
- `dividend_fcf_cover ≥ 1.2`
- `net_debt_to_ebitda ≤ 2.5` (bank profile: `car ≥ 14`, `ldr ≤ 95`)
- `roe ≥ 12%`, `history(net_profit > 0, 5 FY, all)`
- **Rank.** `z_weighted` of `dividend_yield` (w 1) and `dividend_cagr_5y` (w 1) and `roe` (w 0.5).

## 15. Rule #1 Big Five — `rule-one-big-five`

**Source.** Phil Town, *Rule #1* (2006) — the Big Five numbers with 10%+ growth, plus sticker
price and 50% margin of safety. Fidelity: **adapted** (10-year windows shortened where IDX
history is shorter; the MOS calculation's growth and multiple assumptions are exposed as params).

- `atLeast: 4 of` — `roic ≥ 10%` (history, 5 FY, all) · `revenue_cagr_5y ≥ 10%` ·
  `eps_cagr_5y ≥ 10%` · `bvps_cagr_5y ≥ 10%` · `fcf_cagr_5y ≥ 10%`
  (Town demands all five over ten years; the app defaults to 4-of-5 over 5 years, with 5-of-5 and
  10-year selectable, and the funnel shows which of the five failed)
- `debt_to_equity ≤ 1.0` and `net_debt_to_ebitda ≤ 3` ("payable in 3 years of free cash flow")
- Sticker price: `eps_ttm × (1 + g)^10 × pe_target` discounted at 15%, with
  `g = min(eps_cagr_5y, analyst-free cap of 15%)` and `pe_target = min(2g, 20)`;
  criterion `close ≤ 0.5 × sticker_price`
- The sticker-price panel shows every assumption and lets the user change `g`, `pe_target`, and
  the discount rate, because a valuation the user cannot inspect is not usable.
- **Rank.** MOS % desc.

---

## Cross-screener features

**Consensus.** `GET /picks` counts, per stock, how many screeners it passes, weighted so that
value screeners and growth screeners are shown as separate tallies (a stock passing three value
screeners is a different signal than one passing a value and a momentum screener). The dashboard
shows both a raw count and the style breakdown.

**Style tags** for grouping and for the consensus breakdown: `value` (1,2,3,4,5,6,7,12,13),
`quality` (5,6,9,10,15), `growth` (8,10,11,15), `momentum` (7,11), `income` (14).

**Overlap warning.** Screeners 1–3 share most of their inputs; the compare view flags highly
correlated screeners so the consensus count is not mistaken for independent confirmation. The
dashboard shows a small "independence" note when ≥ 3 of a stock's passing screeners come from the
same family.

**Deliberate omissions.** *The Little Book of Common Sense Investing* (Bogle) and *A Random Walk
Down Wall Street* (Malkiel) argue against stock selection entirely; they are represented not as
screeners but as a permanent footnote on the dashboard: the IHSG/LQ45 benchmark line on every
backtest, which is the only honest way to include them.
