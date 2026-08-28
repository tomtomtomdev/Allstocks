# Allstocks

A self-hosted stock screening web app for the Indonesia Stock Exchange (IDX) that sources
market and fundamental data from **Stockbit**, and surfaces stock picks from two kinds of
screeners side by side:

1. **Your own Stockbit preset screeners** — pulled through Stockbit's screener API and
   rendered natively in this app (no re-implementation of the rules).
2. **Book screeners** — screeners this app implements itself, each one a faithful,
   documented translation of a strategy from a well-known investing book
   (Graham, Lynch, Greenblatt, O'Shaughnessy, Piotroski, O'Neil, Carlisle, Pabrai, …),
   adapted where IDX reporting reality demands it.

Everything is spec-first. No application code exists yet — this repository currently holds
the build spec that the implementation will follow.

## Documents

| Doc | Contents |
| --- | --- |
| [docs/00-BUILD-SPEC.md](docs/00-BUILD-SPEC.md) | Scope, architecture, data model, API surface, frontend IA, jobs, NFRs, testing |
| [docs/01-STOCKBIT-ADAPTER.md](docs/01-STOCKBIT-ADAPTER.md) | Auth, endpoint discovery procedure, rate limiting, preset-screener passthrough, mapping |
| [docs/02-DATA-DICTIONARY.md](docs/02-DATA-DICTIONARY.md) | Canonical metric registry, formulas, TTM/point-in-time rules, IDX & bank exceptions |
| [docs/03-SCREENER-DSL.md](docs/03-SCREENER-DSL.md) | Screener definition language, JSON Schema, SQL compilation, ranking, explainability |
| [docs/04-SCREENER-CATALOG.md](docs/04-SCREENER-CATALOG.md) | All 15 book screeners with exact thresholds, source citation, IDX adaptation |
| [docs/05-BACKTEST.md](docs/05-BACKTEST.md) | Point-in-time backtest methodology, costs, benchmarks, reported statistics |
| [docs/06-ROADMAP.md](docs/06-ROADMAP.md) | Milestones M0–M6, definition of done, estimates |
| [docs/07-RISKS-AND-COMPLIANCE.md](docs/07-RISKS-AND-COMPLIANCE.md) | Legal/ToS posture, data risks, mitigations, open questions |
| [docs/schema/screener.schema.json](docs/schema/screener.schema.json) | JSON Schema for screener definitions |
| [screeners/](screeners/) | Machine-readable screener definitions, validated in CI |
| [docs/sql/001_core.sql](docs/sql/001_core.sql) | Core DDL for the reference Postgres schema |

## Running it

```bash
pnpm install
pnpm check          # typecheck, lint, tests, screener validation — this is what CI runs
pnpm db:up          # postgres + redis (applies docs/sql/001_core.sql on first boot)
```

`pnpm screeners:validate` alone checks every file in `screeners/` against **both** the published
JSON Schema and the runtime zod schema plus the semantic rules — unknown metric keys, sector
applicability, the `expr` grammar, parameter wiring, ranking coherence. A screener that would
silently screen banks on current ratio fails the build.

## Read this first

Stockbit publishes no public data API. This app is designed as a **single-tenant,
self-hosted tool driven by the operator's own Stockbit account credentials**, for personal
research. It does not redistribute Stockbit data. See
[docs/07-RISKS-AND-COMPLIANCE.md](docs/07-RISKS-AND-COMPLIANCE.md) before deploying it
anywhere multi-tenant or public.
