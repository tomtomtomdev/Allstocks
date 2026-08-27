# 05 — Backtest Methodology (M6)

A screener without a backtest is an opinion. A backtest with look-ahead bias is a lie. This
module exists to make the difference visible, not to produce flattering equity curves.

## 1. Engine

DuckDB over Parquet point-in-time snapshots exported nightly by `snapshot:parquet`. Each snapshot
is `(as_of_date, security_id, metric_key, value)` filtered to what was public at `as_of_date`
(§4 of [02-DATA-DICTIONARY.md](02-DATA-DICTIONARY.md)). A backtest is a loop over rebalance dates
that re-executes the compiled screener SQL against the snapshot for that date — **the same
compiler used in production**, not a reimplementation. If the backtest and the live screener can
diverge, the backtest is worthless.

## 2. Configuration

| Knob | Default | Notes |
| --- | --- | --- |
| Period | 2015-01-01 → last close | Limited by statement history depth; the header states the true start |
| Rebalance | quarterly | monthly / quarterly / annual; Greenblatt-style staggered tranches available for `magic-formula` |
| Positions | screener's `limit`, capped at 30 | Fewer than 10 is reported as "high idiosyncratic risk" |
| Weighting | equal | equal / market-cap / rank-weighted |
| Transaction cost | 30 bps round trip | IDX brokerage + levy; configurable |
| Slippage | 20 bps, doubled for ADTV < Rp 2 bn | Crude but disclosed; a name whose position exceeds 10% of 20-day ADTV is capped and the cap is reported |
| Cash on unfilled | held at 0% | No leverage, no shorting |
| Dividends | reinvested at ex-date close, net of 10% IDX final tax on cash dividends | Stated in the header |
| Benchmark | IHSG total return; LQ45 as secondary | Both plotted |

## 3. Correctness rules (each has a test)

1. **No look-ahead.** Selection at rebalance date `D` uses only data with `publish_date ≤ D`, and
   entry price is the **next trading day's open**, never `D`'s close.
2. **No survivorship bias.** The universe at `D` includes securities that later delisted. A
   position in a security that delists mid-period is closed at the last traded price, or at zero
   if the delisting was a bankruptcy with no final trade, and the case is counted in the stats.
3. **No index-membership hindsight.** `dim_index_membership` validity windows only.
4. **Restatement-blind.** The highest revision available at `D`, not today's revision.
5. **Suspension handling.** A suspended stock cannot be bought or sold; the position carries at
   its last price until trading resumes, and suspension days are reported.
6. **Corporate actions.** Returns computed from adjusted prices recomputed at backtest time from
   raw prices + actions, so a newly ingested action retroactively corrects the backtest.
7. **Fallback-lag disclosure.** If any selected row relied on an assumed `publish_date`, the
   backtest is stamped `lag_assumed = true` and the stats header says so. We do not hide it in a
   footnote.

## 4. Reported statistics

CAGR · total return · annualized volatility · Sharpe (risk-free = 7-day BI rate series) ·
Sortino · max drawdown and its dates · longest drawdown in months · beta and alpha vs. IHSG ·
hit rate (% of positions with positive return) · average win / average loss ·
annual turnover · average number of positions · per-calendar-year return table vs. IHSG ·
worst 10 positions and best 10 positions by contribution · monthly return heatmap ·
count of delisted / suspended / liquidity-capped positions.

Also reported, prominently, and this is the point of the module: **the number of rebalance dates
with fewer than the target number of matches**, and the periods when the screener held nothing.
A strategy that was 60% in cash for three years has a nice-looking drawdown and no signal.

## 5. Honesty guardrails

- Every backtest shows the benchmark line by default; it cannot be turned off.
- No parameter optimization loops in the UI. Parameters are tunable, but the app does not sweep
  them and rank the results — that is an overfitting machine. Comparing at most three
  hand-chosen parameter sets side by side is supported, with a visible note that comparing
  variants inflates apparent skill.
- A prominent, non-dismissable caption on every backtest: sample period, number of rebalances,
  data caveats in force (`lag_assumed`, reduced statement history, missing foreign flow), and a
  statement that IDX-specific results from a single ~10-year sample carry wide error bars.
- Screeners whose criteria could not be evaluated for more than 15% of the universe at a given
  rebalance date mark that date as low-confidence and shade it in the equity curve.
