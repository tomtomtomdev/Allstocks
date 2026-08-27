# 01 — Stockbit Adapter

How Allstocks talks to Stockbit: authentication, endpoint discovery, rate limiting, mapping,
and the preset-screener passthrough.

---

## 1. Ground truth about the Stockbit API

Stockbit has **no public, documented data API**. What is publicly established (and all this
section claims) is:

- The Stockbit web client talks to an API gateway host in the `stockbit.com` domain —
  community projects consistently name **`exodus.stockbit.com`** — using bearer tokens.
- Access tokens obtained by logging in are **short-lived (~24 h)**, and there is a
  **refresh endpoint under the login path** that mints a new access token from a refresh token
  without a browser round trip.
- In practice, projects capture the initial token via a **real browser login** (a login flow
  driven by an automated browser), because the login endpoint applies bot mitigation, then
  persist `access_token`, `refresh_token`, and the exact `User-Agent` used at capture, and
  reuse that UA on every subsequent call.

Everything else — the exact path of every data endpoint, its query parameters, its response
shape, its pagination, and whether saved screeners are exposed at all — is **unknown until
measured**. This spec does not invent paths. §2 defines how we obtain them; §3 defines the
contract the adapter must satisfy regardless of what the paths turn out to be.

> Design consequence: the adapter is written **contract-first**. `packages/stockbit` exposes the
> `MarketDataProvider` surface from [00-BUILD-SPEC.md](00-BUILD-SPEC.md) §4.2 and keeps every
> path, header, and field name in one `endpoints.ts` + `map/*.ts` pair. Discovery changes those
> two files and nothing else.

---

## 2. Endpoint discovery procedure (M1, first task)

Deliverable: `docs/01a-ENDPOINTS.generated.md` + `fixtures/stockbit/*.json`, produced by the
operator on their own account, committed **with all identifiers and tokens scrubbed**.

1. **Capture.** Log into the Stockbit web app in a normal browser. With devtools open and
   "preserve log" on, visit in order: the company list / screener page, one stock's overview,
   its financials tab (switch to quarterly, scroll back several years), its chart (set range to
   max), and the saved-screener list, then run one saved screener. Export the network log as HAR.
2. **Distil.** `pnpm stockbit:har2endpoints <file.har>` (script to be written in M1) filters the
   HAR to XHR/fetch calls to Stockbit API hosts and emits, per unique path template:
   method, path with parameters generalized (`/{symbol}`, `/{id}`), query parameters observed,
   required headers, response JSON Schema inferred from the body, and a redacted sample.
3. **Classify.** Map each discovered endpoint to a `MarketDataProvider` method, or mark it
   `unused`. Record explicitly, for the four load-bearing capabilities:
   - universe listing
   - daily price history and its maximum available range
   - financial statements: granularity (line items vs. summarized), history depth, quarterly
     availability, and whether a publication date field exists
   - saved/preset screeners: list + run
4. **Fixture.** Save one redacted response per endpoint into `fixtures/stockbit/`. These drive
   the contract tests and let the whole app be developed and demoed offline.
5. **Gate.** M1 does not close until §2.3's fallback decisions are recorded for anything the
   capture failed to find.

### 2.1 Redaction rules for committed fixtures
Strip: `Authorization`, `Cookie`, `Set-Cookie`, `x-*` device/session headers, the account's user
id, username, email, avatar URLs, portfolio and watchlist contents, and any field naming a real
person. Keep: tickers, prices, statement line items, ratios, screener criteria. A pre-commit
hook rejects a fixture containing a JWT-shaped string or an `@`-bearing string.

### 2.2 Schema drift detection
A weekly CI job (or a manual `pnpm stockbit:verify` when running fully offline) replays each
recorded request against the live API and diffs the response against the recorded JSON Schema.
Any missing field that a mapper reads is a **failing** test, not a warning: silent field renames
are the most likely way this app breaks, and it must break loudly.

### 2.3 Fallbacks if a capability is missing

| Missing | Fallback | Cost |
| --- | --- | --- |
| Statement history < 10 y | Reduce Graham's ten-year tests to the available window and **state the reduced window in the screener's UI header**; backfill older years from IDX's published financial statements (XBRL) as a secondary provider | Graham Defensive weakens; IDX XBRL parser is ~1 week of work |
| Line-item statements unavailable (only summary ratios) | Piotroski F, Beneish M, owner earnings, and accrual metrics cannot be computed. Those screeners are disabled with an explicit "requires line-item financials" state rather than being silently approximated | 4 of 15 screeners lost; unacceptable for v1 → escalate to IDX XBRL ingestion instead |
| Saved screeners not exposed | Preset support degrades to **manual definition import**: the user re-declares the preset's rules once in the Allstocks DSL (a guided form), and the app labels it `source=stockbit_preset_mirrored` so it is never confused with a live passthrough | User story U5 partially met; must be flagged to the user, not hidden |
| Publication dates absent | Apply the fixed point-in-time lag (§4 of [02-DATA-DICTIONARY.md](02-DATA-DICTIONARY.md)) and mark all backtests `lag_assumed=true` in their stats header | Backtests keep a documented look-ahead bias bound |
| Foreign net flow absent | Drop the institutional-sponsorship proxy from the CANSLIM screener and note the substitution in the catalog | CANSLIM's "I" criterion becomes volume-based only |

---

## 3. Adapter contract

```
packages/stockbit/
├── src/
│   ├── auth/
│   │   ├── session.ts        # token store, expiry tracking, refresh scheduling
│   │   ├── browser-login.ts  # headed/headless browser capture (opt-in)
│   │   └── refresh.ts        # refresh_token → access_token
│   ├── http/
│   │   ├── client.ts         # fetch wrapper: headers, retries, backoff, tracing
│   │   ├── limiter.ts        # token-bucket + concurrency gate
│   │   └── breaker.ts        # circuit breaker
│   ├── endpoints.ts          # THE ONLY file holding paths/params  (filled by discovery)
│   ├── map/                  # DTO → canonical mappers, one per dataset
│   ├── provider.ts           # implements MarketDataProvider
│   └── errors.ts             # typed errors (see §3.4)
└── test/                     # contract tests over fixtures/stockbit
```

### 3.1 Session handling

State machine: `unlinked → linking → active → refreshing → expired → error`.

- **Linking.** Two modes, chosen by `STOCKBIT_LOGIN_MODE`:
  - `browser` — the operator completes the login (including any OTP/captcha) in a browser the
    app launches; the adapter captures `access_token`, `refresh_token`, and the exact
    `User-Agent`, then closes the browser. Recommended and default for self-hosting.
  - `refresh_token` — the operator pastes a `refresh_token` + `User-Agent` obtained manually.
    Used for headless servers. No credential storage at all in this mode.
- **Never** store the Stockbit password unless the operator explicitly opts in; the default is
  to store tokens only. If they do opt in, it is sealed exactly like the tokens (§8.2 of the
  build spec) and used only to re-link when the refresh token dies.
- **Refresh.** A scheduled job refreshes at `expires_at − 60 min`, and any `401` triggers a
  single inline refresh-and-retry. Two consecutive refresh failures → state `expired`, the
  `/data` page and settings show a "re-link required" call to action, book screeners keep
  running on warehouse data, preset screeners report `provider_unavailable`.
- The captured `User-Agent` is pinned and replayed on every request; changing it mid-session is
  treated as a new link.

### 3.2 Rate limiting and politeness

This is a private API being used by one person's account. The adapter is deliberately slower
than it could be:

- Token bucket: **2 requests/second, burst 4**, `STOCKBIT_RATE_LIMIT_RPS` configurable **downward**
  only (values > 5 are rejected at boot).
- **Concurrency 1** per host by default. Ingestion parallelism comes from queue throughput, not
  from hammering.
- ±150 ms jitter on every request; a 30–90 s pause every 300 requests during full backfills.
- `429`/`503` → exponential backoff `2^n × 1 s` with full jitter, max 5 attempts, then the
  circuit breaker opens for 10 min and the ingest step defers to the next night.
- Conditional requests where the API supports them (`ETag`/`If-None-Match`), and no re-fetch of
  a statement whose `source_hash` is unchanged. A steady-state night should be a few hundred
  requests, not thousands.
- Nightly request budget cap (`STOCKBIT_DAILY_REQUEST_BUDGET`, default 5 000). Exceeding it
  stops ingestion and raises a `warning` finding rather than continuing.
- Backfill (first run: 10 y prices + 12 y statements) is explicitly spread over several nights
  by a `backfill:cursor` table; it never runs as one burst.

### 3.3 Caching

| Data | TTL | Key |
| --- | --- | --- |
| Universe | 12 h | `sb:universe` |
| Price history (closed days) | immutable | in Postgres; never re-fetched |
| Last price (on-demand refresh) | 60 s | `sb:last:{ticker}` |
| Statements | until `source_hash` changes | Postgres + `sb:stmt:{ticker}:{period}` |
| Key stats | 12 h | `sb:keystats:{ticker}` |
| Preset screener list | 15 min | `sb:presets:{user}` |
| Preset screener result | 10 min, user-forceable | `sb:preset:{id}` |

### 3.4 Error taxonomy

```ts
type StockbitError =
  | { kind: 'unauthenticated' }      // 401 after refresh — re-link
  | { kind: 'forbidden' }            // 403 — capability not available to this account
  | { kind: 'rate_limited'; retryAfterMs: number }
  | { kind: 'not_found'; resource: string }
  | { kind: 'schema_drift'; endpoint: string; issues: string[] }  // response no longer maps
  | { kind: 'upstream_unavailable'; status?: number }
  | { kind: 'circuit_open'; opensAtMs: number };
```

`schema_drift` is surfaced in the UI as a first-class state ("Stockbit changed a response
format; financials ingest paused") because degrading silently into `NULL` metrics would corrupt
screener output — a stock silently failing Graham's dividend test because the dividend field got
renamed is worse than an outage.

---

## 4. Preset screener passthrough

The feature: *show stock picks from the user's own Stockbit preset screeners.*

Flow:

1. `GET /api/v1/stockbit/presets` → adapter `listPresetScreeners()` → the user's saved screeners
   with `{ provider_id, name, criteria_summary, updated_at }`. `criteria_summary` is whatever
   the API returns, stored verbatim in `screener.provider_payload` JSONB — we do not attempt to
   semantically parse Stockbit's rule format in v1, only to display it.
2. `POST /stockbit/presets/:id/import` creates an Allstocks `screener` row with
   `source='stockbit_preset'`, `provider_id`, and `dsl = null`. Preset screeners have no DSL by
   definition; the engine short-circuits them to the passthrough executor.
3. `POST /stockbit/presets/:id/run` (also called by the nightly DAG for imported presets):
   - calls `runPresetScreener(provider_id)` → list of tickers (+ whatever columns Stockbit
     returns);
   - resolves tickers against `dim_security`, dropping and logging unknown symbols;
   - writes a normal `screener_run` + `screener_result` set, so presets appear in the dashboard,
     the consensus count, the compare view, and history/turnover exactly like book screeners;
   - enriches each row with **our** metrics for display; provider-returned columns are kept in
     `screener_result.provider_payload` and shown in a separate, visually distinct column group
     labeled "from Stockbit".
4. Ranking: presets are ranked in the order Stockbit returns them (`provider_rank`), and the UI
   says so. We never silently re-sort someone else's screener.
5. Explainability: presets get **no** per-criterion checklist (we do not evaluate their rules).
   The UI shows the provider's criteria summary and an honest note that pass/fail evidence is
   only available for locally computed screeners. If the user wants explainability for a preset,
   the app offers "recreate this as a custom screener" which opens the rule builder pre-filled
   from `criteria_summary` on a best-effort basis, clearly marked as a *mirror*, not the original.

Failure behavior: if a preset run fails, the dashboard shows the last successful result with its
timestamp and a "could not refresh" chip. It never shows an empty list as if the screener matched
nothing — the difference between "no matches" and "could not run" is always visible.

---

## 5. Mapping rules (provider → canonical)

- Every mapper is a pure function `(dto, ctx) => canonical` with an exhaustive zod input schema.
  Unknown extra fields are ignored; **missing** fields that a metric depends on fail the mapper
  with `schema_drift`.
- Numeric normalization: provider values may arrive as strings, in units of millions, or with
  thousands separators and Indonesian decimal commas. Mappers convert to `numeric` in **base
  units of the reporting currency** (rupiah, not millions) and assert magnitude sanity
  (e.g. total assets between 1e8 and 1e16) before returning.
- Sign conventions: cash-flow outflows are stored negative; provider inconsistencies are
  normalized in the mapper, with a golden-file test per statement type asserting the convention.
- Period labels: provider period strings (`"Q3 2025"`, `"2025-09-30"`, `"9M25"`) are parsed to
  `(period_end, fiscal_period)` by a single parser with a table-driven test.
- Ticker normalization: uppercase, strip suffixes, keep the IDX 4-letter form; a `ticker_alias`
  table maps historical symbols after renames so price history survives a rename.
