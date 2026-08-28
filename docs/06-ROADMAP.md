# 06 — Roadmap

Estimates assume one experienced full-stack developer working with an AI assistant, and are in
calendar weeks. Each milestone ends with something demonstrable; nothing is "integrated later".

## M0 — Scaffold and contracts · ~1 week
- Monorepo (pnpm + Turborepo), `apps/web`, `apps/worker`, `packages/{core,stockbit,db,ui,config}`.
- Docker compose: Postgres 16, Redis. Drizzle migrations from [sql/001_core.sql](sql/001_core.sql).
- Zod env config, pino logging with the token redaction test, OTel bootstrap.
- CI: typecheck, lint, unit tests, `screeners:validate`.
- Screener DSL as zod schemas in `packages/core` plus the published JSON Schema; the four
  shipped screeners in [../screeners/](../screeners/) must satisfy **both** in CI, which is what
  catches drift between the schema we publish and the one we enforce.
- **Done when:** `pnpm check` (typecheck, lint, tests, screener validation) is green, and
  `pnpm dev` boots web + worker against an empty warehouse.

## M1 — Stockbit adapter · ~2 weeks
- Endpoint discovery per [01-STOCKBIT-ADAPTER.md](01-STOCKBIT-ADAPTER.md) §2; commit
  `01a-ENDPOINTS.generated.md` and redacted fixtures.
- Session state machine, browser-capture link flow, refresh scheduling, token sealing.
- HTTP client with token bucket, concurrency gate, jitter, backoff, circuit breaker, request
  budget.
- `listSecurities`, `getPriceHistory`, `getCorporateActions` implemented against fixtures then live.
- Contract tests + schema-drift detector.
- **Done when:** `ingest:universe` and `ingest:prices` populate the warehouse for the full IDX
  universe, and `/stockbit/status` reports a healthy link. **Gate:** the §2.3 capability
  assessment is written down, including whatever is missing.

## M2 — Financials and metric layer · ~2 weeks
- `getFinancials` + statement mappers with the numeric/sign/period normalizations.
- YTD → discrete-quarter deriver, TTM assembler, FX conversion, revision handling.
- Metric registry (all categories), `compute:metrics`, `mv_metrics_latest` codegen.
- Forensic scores: Piotroski (with components), Altman Z/Z″, Beneish M.
- Data-quality checks and the `/data` page.
- Golden-file tests for the five reference companies.
- **Done when:** every metric in [02-DATA-DICTIONARY.md](02-DATA-DICTIONARY.md) is computed for
  ≥ 90% of the universe by market cap, and the reconciliation page shows < 10% drift vs. provider
  key stats on P/E, P/B, ROE.

## M3 — Screener engine · ~2 weeks
- DSL parser/validator, `expr` grammar, compiler to parameterized SQL (universe, history/streak,
  cross-sectional, composite ranks, soft criteria, explain projection).
- `screener:run`, caching, run/result/criterion persistence.
- First five screeners live: `graham-defensive`, `graham-number`, `magic-formula`,
  `piotroski-value`, `dividend-compounder`.
- Screener list + detail UI: criteria panel, results table, per-row criterion checklist, funnel,
  ticker test, CSV export.
- **Done when:** p95 run time < 1.5 s cold on the full universe, and each of the five screeners
  passes its golden pass/fail cases.

## M4 — Presets and dashboard · ~1.5 weeks
- `listPresetScreeners` / `runPresetScreener`, preset import, passthrough executor, provider
  column group, the honest "no criterion evidence for presets" treatment, and the mirroring
  fallback if presets are unavailable.
- Today's Picks dashboard: consensus table, style breakdown, entered/dropped, sector distribution,
  staleness and degraded-mode banners.
- Stock detail page with the 15-screener scorecard (screeners not yet built show as pending).
- Compare view (intersection / only-A / only-B).
- **Done when:** U1, U2, U5, U6, U7 pass end-to-end in Playwright.

## M5 — Full screener catalog and builder · ~1.5 weeks
- Remaining ten screeners from [04-SCREENER-CATALOG.md](04-SCREENER-CATALOG.md), each with
  golden tests, style tags, fidelity notes, and sector profiles.
- Sector-median/percentile machinery, `atLeast` nodes, quality-guard overlay toggle.
- Rule builder UI with live count preview and the SQL panel; fork-on-edit.
- XLSX export, watchlists, notes.
- **Done when:** all 15 screeners run nightly, the regression snapshot suite is green, and a
  user-authored custom screener round-trips through the builder.

## M6 — Backtest and hardening · ~2 weeks
- Parquet snapshots, DuckDB backtest engine, the correctness rules and their tests, stats, charts,
  and the honesty guardrails from [05-BACKTEST.md](05-BACKTEST.md).
- Perf pass (indexes, MV refresh strategy), backfill scheduler across nights.
- Observability dashboards, alerting on ingest failure and schema drift.
- Security review: sealing, redaction, RLS, CSP, outbound allowlist, dependency audit.
- Self-host docs: compose file, env reference, link walkthrough, restore-from-backup drill.
- **Done when:** all 15 screeners have a backtest with benchmark, the nightly DAG has run
  unattended for 10 consecutive days, and a fresh `docker compose up` reaches first picks by
  following only the README.

**Total: ~12 weeks** to a complete v1. Usable earlier: M3 (own screeners working) and M4 (presets
+ dashboard) together are the product's core, at roughly week 8.

## Deferred (post-v1)
Bank-specific Piotroski variant · intraday/delayed quotes · alerting on new picks ·
multi-user hosting with a licensed data feed · IDX XBRL as a secondary provider ·
peer comparison tables · notes/journal with screener-entry snapshots · mobile layout pass ·
portfolio overlay (which of my holdings still pass the screener that bought them).
