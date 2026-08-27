# 07 — Risks, Compliance, Open Questions

## 1. The Stockbit terms-of-service question

**The concern, stated plainly.** Stockbit's data API is private and undocumented. Terms of
service for platforms of this kind normally prohibit automated access, scraping, and
redistribution of data, and reserve the right to suspend accounts that do it. Using the API with
your own credentials therefore carries two real risks: **account suspension**, and **breach of
contract** if the terms prohibit it. This is not a hypothetical the spec can engineer away.

**The design position.** v1 is built to keep the exposure as small as the feature set allows:

- **Own credentials only.** The app authenticates as the operator. It never pools accounts, never
  ships credentials, and has no shared backend calling Stockbit on many users' behalf.
- **Self-hosted, single-tenant by default.** `ALLSTOCKS_MULTI_USER=false` is the default and
  disables registration.
- **No redistribution.** No public sharing, no API of our own exposing Stockbit-derived data, no
  export endpoint that publishes to a third party. Exports are local files for the operator.
- **Politeness over speed.** 2 rps, concurrency 1, jitter, conditional requests, a nightly request
  budget, and multi-night backfill (§3.2 of [01-STOCKBIT-ADAPTER.md](01-STOCKBIT-ADAPTER.md)). A
  steady-state night is a few hundred requests — comparable to a person browsing.
- **Replaceable source.** Everything is behind `MarketDataProvider`. If Allstocks is ever hosted
  for others, the correct move is a licensed feed or IDX's own published filings/XBRL, not more
  scraping. The interface exists so that swap is a package change, not a rewrite.

**What the operator must decide before deploying.** Read Stockbit's current terms and confirm you
accept the risk for your own account. If the terms prohibit automated access outright and you are
not willing to accept it, the honest paths are: (a) request API access from Stockbit directly,
(b) use IDX's published financial statements plus a licensed price feed as the provider, or
(c) run the book screeners on a manually exported dataset. Options (b) and (c) both work with this
architecture unchanged — the metric layer and screener engine do not care where the data came from.

**What the app must never do**, and this is a hard constraint on the implementation, not a
preference: hide its access pattern, rotate identities or user agents to evade rate limits or
detection, distribute pooled credentials, or present Stockbit-derived data publicly as its own.

## 2. Technical risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Undocumented endpoints change shape | high | breaks ingestion | schema-drift detector fails loudly; mappers refuse to map partial data; ingestion pauses instead of writing NULLs (§3.4) |
| Statement history shallower than 10 y | medium | Graham's long-window tests weaken | thresholds are params; the UI states the actual window used; IDX XBRL as a backfill source |
| Line-item statements unavailable | low–medium | 4 screeners uncomputable | disable them explicitly with a "requires line-item financials" state; escalate to XBRL ingestion (§2.3) |
| Saved screeners not exposed by the API | medium | U5 degrades | mirrored-definition fallback, clearly labeled as a mirror, never as a live passthrough |
| Publication dates missing | medium | backtest look-ahead | fixed fallback lags, `lag_assumed` stamped on every affected backtest |
| Corporate-action gaps corrupt adjusted prices | medium | wrong momentum metrics and backtests | price-gap quality check queues a re-fetch; adjustments recomputed from raw, so a late action fixes history |
| Bank/insurer metrics computed with non-financial formulas | high if unguarded | silently wrong screener output | `applies_to` in the registry + validator rejecting screeners that neither exclude nor profile a sector class |
| YTD-vs-discrete-quarter confusion | high if unguarded | every growth and TTM metric wrong | single deriver, golden-file tests on real filings, balance-sheet items structurally excluded from differencing |
| Token expiry mid-ingest | high | partial nights | refresh 60 min early, inline refresh-and-retry on 401, resumable idempotent steps |
| Account suspension | low–medium | total data loss | warehouse is the source of truth for book screeners; they keep working without the provider; documented export/backup |
| Overfitting the catalog to recent IDX performance | medium | false confidence | no parameter sweeps in the UI, benchmark always plotted, honesty caption on every backtest (§5 of [05-BACKTEST.md](05-BACKTEST.md)) |
| Screener returns 0 and looks broken | high | user distrust | funnel and universe-attrition reporting make every zero explainable |

## 3. Product risks

- **Mistaking the app for advice.** Screeners produce candidate lists from public financials.
  Nothing in the UI says buy, sell, or target price; a standing footer says the output is a
  research starting point and that thresholds encode a book author's judgment, not the operator's.
- **Consensus as false confirmation.** Screeners 1–3 share inputs; the dashboard flags
  same-family clustering so "passes 4 screeners" is not read as four independent votes.
- **Fidelity drift.** Every screener carries `fidelity` and an explicit `adaptations` list, shown
  in the UI. Where a book's rule was relaxed to fit IDX data, the relaxation is visible, because a
  silently loosened Graham screen is not a Graham screen.

## 4. Open questions for the operator

1. **Provider depth** — how many years of quarterly, line-item financials does your Stockbit
   account actually expose? This single answer determines whether screeners 1, 9, 15 keep their
   long windows. (Answered by the M1 discovery gate.)
2. **Preset screeners** — are your saved screeners retrievable and runnable via the API, and does
   the response include the criteria or only the resulting tickers? Determines U5's fidelity.
3. **Universe scope** — IDX only, or do you want Stockbit's US coverage too? US would need a
   second sector taxonomy, USD handling, and different thresholds throughout the catalog; it is
   deliberately out of v1 scope.
4. **Rebalance style** — do you want the dashboard to be a daily list, or a periodic rebalance
   list (monthly/quarterly) matching how the books intend the strategies to be traded? v1 builds
   daily and derives periodic views from run history; if you would only ever act quarterly, M4
   simplifies.
5. **Thresholds** — the catalog's IDR figures are scaled judgments (Graham's "adequate size" as
   Rp 2 trillion of revenue, for instance). Review §1 and §4's numbers before M3; they are the
   most opinionated content in this spec.
6. **Hosting** — pure local (docker on your machine, Stockbit link via browser capture) or a small
   VPS (headless, refresh-token mode)? Affects the link flow default and the secrets story.
