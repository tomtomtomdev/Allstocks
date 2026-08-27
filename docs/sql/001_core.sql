-- Allstocks — core schema (reference DDL for the spec; the implementation generates
-- migrations from the Drizzle schema in packages/db and must stay equivalent to this).
-- Postgres 16.

CREATE SCHEMA IF NOT EXISTS app;
SET search_path = app, public;

CREATE TYPE sector_class AS ENUM ('non_financial','bank','insurance','multifinance','property','reit','utility_regulated','mining','holding');
CREATE TYPE board_type   AS ENUM ('main','development','acceleration');
CREATE TYPE fiscal_period AS ENUM ('Q1','H1','9M','FY');
CREATE TYPE report_basis  AS ENUM ('consolidated','standalone');
CREATE TYPE screener_source AS ENUM ('book','stockbit_preset','stockbit_preset_mirrored','custom');
CREATE TYPE criterion_status AS ENUM ('PASS','FAIL','INSUFFICIENT_DATA','NOT_APPLICABLE');
CREATE TYPE finding_severity AS ENUM ('info','warning','blocking');
CREATE TYPE corp_action_type AS ENUM ('cash_dividend','stock_dividend','split','reverse_split','bonus','rights','warrant','merger','delisting');

-- ---------- dimensions -------------------------------------------------------

CREATE TABLE dim_security (
  id                     bigserial PRIMARY KEY,
  ticker                 text NOT NULL UNIQUE,
  name                   text NOT NULL,
  board                  board_type NOT NULL DEFAULT 'main',
  sector_idxic           text,
  subsector_idxic        text,
  industry_idxic         text,
  sector_class           sector_class NOT NULL DEFAULT 'non_financial',
  listing_date           date,
  delisting_date         date,
  fiscal_year_end_month  smallint NOT NULL DEFAULT 12 CHECK (fiscal_year_end_month BETWEEN 1 AND 12),
  reporting_currency     char(3) NOT NULL DEFAULT 'IDR',
  shares_outstanding     numeric(28,0),
  free_float_pct         numeric(6,3),
  shariah_flag           boolean NOT NULL DEFAULT false,
  special_monitoring     boolean NOT NULL DEFAULT false,
  full_call_auction      boolean NOT NULL DEFAULT false,
  suspended              boolean NOT NULL DEFAULT false,
  active                 boolean NOT NULL DEFAULT true,
  provider_id            text,
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON dim_security (sector_class) WHERE active;
CREATE INDEX ON dim_security (active, board);

CREATE TABLE ticker_alias (
  old_ticker  text PRIMARY KEY,
  security_id bigint NOT NULL REFERENCES dim_security(id),
  changed_on  date NOT NULL
);

CREATE TABLE dim_index_membership (
  security_id bigint NOT NULL REFERENCES dim_security(id),
  index_code  text   NOT NULL,          -- IHSG, LQ45, IDX30, IDX80, KOMPAS100, IDXV30, JII
  valid_from  date   NOT NULL,
  valid_to    date,                     -- NULL = current
  PRIMARY KEY (security_id, index_code, valid_from)
);
CREATE INDEX ON dim_index_membership (index_code, valid_from, valid_to);

CREATE TABLE fx_rate (
  rate_date date NOT NULL,
  base      char(3) NOT NULL,
  quote     char(3) NOT NULL DEFAULT 'IDR',
  rate      numeric(20,6) NOT NULL,
  PRIMARY KEY (rate_date, base, quote)
);

-- ---------- prices -----------------------------------------------------------

CREATE TABLE fact_price_daily (
  security_id       bigint NOT NULL REFERENCES dim_security(id),
  trade_date        date   NOT NULL,
  open              numeric(20,4),
  high              numeric(20,4),
  low               numeric(20,4),
  close             numeric(20,4) NOT NULL,
  volume            numeric(28,0),
  value_idr         numeric(28,2),
  frequency         integer,
  foreign_buy_value  numeric(28,2),
  foreign_sell_value numeric(28,2),
  source_hash       text,
  PRIMARY KEY (security_id, trade_date)
) PARTITION BY RANGE (trade_date);
-- one partition per year, created by migration/maintenance job
CREATE INDEX ON fact_price_daily (trade_date);

CREATE TABLE fact_corporate_action (
  id             bigserial PRIMARY KEY,
  security_id    bigint NOT NULL REFERENCES dim_security(id),
  type           corp_action_type NOT NULL,
  ex_date        date NOT NULL,
  record_date    date,
  payment_date   date,
  cash_amount    numeric(20,4),
  currency       char(3),
  ratio_from     numeric(18,6),
  ratio_to       numeric(18,6),
  is_special     boolean NOT NULL DEFAULT false,
  announced_date date,
  source_hash    text
);
-- expression-based uniqueness needs an index, not a table constraint
CREATE UNIQUE INDEX fact_corporate_action_uq ON fact_corporate_action
  (security_id, type, ex_date, COALESCE(cash_amount, 0), COALESCE(ratio_from, 0), COALESCE(ratio_to, 0));
CREATE INDEX ON fact_corporate_action (security_id, ex_date);

-- ---------- statements -------------------------------------------------------

-- As-filed statements. A restatement is a NEW ROW (revision + 1), never an UPDATE:
-- point-in-time correctness depends on keeping what was public at the time.
CREATE TABLE fact_statement (
  id             bigserial PRIMARY KEY,
  security_id    bigint NOT NULL REFERENCES dim_security(id),
  period_end     date NOT NULL,
  fiscal_period  fiscal_period NOT NULL,
  basis          report_basis NOT NULL DEFAULT 'consolidated',
  revision       smallint NOT NULL DEFAULT 1,
  currency       char(3) NOT NULL,
  publish_date   date,
  publish_date_assumed boolean NOT NULL DEFAULT false,
  is_audited     boolean NOT NULL DEFAULT false,
  auditor_opinion text,
  raw            jsonb NOT NULL,
  -- ~90 typed line-item columns follow; abbreviated here to the load-bearing set.
  revenue                  numeric(28,4),
  cogs                     numeric(28,4),
  gross_profit             numeric(28,4),
  operating_profit         numeric(28,4),
  ebit                     numeric(28,4),
  depreciation             numeric(28,4),
  amortization             numeric(28,4),
  interest_expense         numeric(28,4),
  pretax_profit            numeric(28,4),
  tax_expense              numeric(28,4),
  net_profit               numeric(28,4),
  net_profit_attributable  numeric(28,4),
  eps_basic                numeric(20,6),
  weighted_shares_basic    numeric(28,0),
  cash_and_equivalents     numeric(28,4),
  short_term_investments   numeric(28,4),
  inventory                numeric(28,4),
  receivables_trade        numeric(28,4),
  current_assets           numeric(28,4),
  ppe_net                  numeric(28,4),
  total_assets             numeric(28,4),
  short_term_debt          numeric(28,4),
  current_portion_ltd      numeric(28,4),
  current_liabilities      numeric(28,4),
  long_term_debt           numeric(28,4),
  lease_liabilities        numeric(28,4),
  total_liabilities        numeric(28,4),
  retained_earnings        numeric(28,4),
  equity_attributable      numeric(28,4),
  minority_interest_equity numeric(28,4),
  equity_total             numeric(28,4),
  shares_outstanding       numeric(28,0),
  cfo                      numeric(28,4),
  cfi                      numeric(28,4),
  cff                      numeric(28,4),
  capex                    numeric(28,4),
  dividends_paid           numeric(28,4),
  share_issuance           numeric(28,4),
  share_buyback            numeric(28,4),
  -- banking extension (NULL for non-banks)
  loans_gross              numeric(28,4),
  deposits_total           numeric(28,4),
  casa_deposits            numeric(28,4),
  net_interest_income      numeric(28,4),
  provision_expense        numeric(28,4),
  npl_gross                numeric(28,4),
  car_total                numeric(10,4),
  earning_assets           numeric(28,4),
  source_hash              text NOT NULL,
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (security_id, period_end, fiscal_period, basis, revision)
);
CREATE INDEX ON fact_statement (security_id, publish_date);
CREATE INDEX ON fact_statement (period_end);

-- Discrete (non-cumulative) quarters derived by YTD differencing. All TTM math reads this.
CREATE TABLE fact_statement_quarter (
  security_id   bigint NOT NULL REFERENCES dim_security(id),
  period_end    date   NOT NULL,
  quarter       smallint NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  fiscal_year   smallint NOT NULL,
  basis         report_basis NOT NULL DEFAULT 'consolidated',
  publish_date  date,
  derived_from  bigint[] NOT NULL,           -- fact_statement.id values used
  is_derived_q4 boolean NOT NULL DEFAULT false,
  flow          jsonb NOT NULL,              -- differenced income + cash-flow items
  stock         jsonb NOT NULL,              -- point-in-time balance-sheet items
  PRIMARY KEY (security_id, period_end, basis)
);
CREATE INDEX ON fact_statement_quarter (security_id, publish_date);

-- ---------- metrics ----------------------------------------------------------

CREATE TABLE fact_metric (
  security_id      bigint NOT NULL REFERENCES dim_security(id),
  as_of_date       date   NOT NULL,
  metric_key       text   NOT NULL,
  value_num        numeric(30,8),
  basis_period_end date,
  publish_date     date,
  registry_version text NOT NULL,
  PRIMARY KEY (security_id, as_of_date, metric_key)
);
CREATE INDEX ON fact_metric (metric_key, as_of_date, security_id) INCLUDE (value_num);
CREATE INDEX ON fact_metric (as_of_date);

-- Wide serving view, one column per registry key. GENERATED by codegen from the metric
-- registry; the definition below is illustrative of its shape only.
-- CREATE MATERIALIZED VIEW mv_metrics_latest AS SELECT security_id, as_of_date,
--   max(value_num) FILTER (WHERE metric_key = 'pe_ttm') AS pe_ttm, ... FROM fact_metric
--   WHERE as_of_date = (SELECT max(as_of_date) FROM fact_metric) GROUP BY 1,2;
-- CREATE UNIQUE INDEX ON mv_metrics_latest (security_id);

-- ---------- screeners --------------------------------------------------------

CREATE TABLE app_user (
  id         bigserial PRIMARY KEY,
  email      text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE screener (
  id             bigserial PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  owner_id       bigint REFERENCES app_user(id),
  source         screener_source NOT NULL,
  name           text NOT NULL,
  style_tags     text[] NOT NULL DEFAULT '{}',
  enabled        boolean NOT NULL DEFAULT true,
  provider_id    text,                         -- stockbit preset id
  provider_payload jsonb,                      -- verbatim provider criteria summary
  current_version_id bigint,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE screener_version (
  id           bigserial PRIMARY KEY,
  screener_id  bigint NOT NULL REFERENCES screener(id) ON DELETE CASCADE,
  version      text NOT NULL,
  dsl          jsonb,                            -- NULL for stockbit_preset passthrough
  dsl_hash     text,
  derived_from text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screener_id, version)
);
ALTER TABLE screener ADD CONSTRAINT screener_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES screener_version(id);

CREATE TABLE screener_run (
  id                 bigserial PRIMARY KEY,
  screener_version_id bigint NOT NULL REFERENCES screener_version(id),
  as_of              date NOT NULL,
  param_values       jsonb NOT NULL DEFAULT '{}',
  registry_version   text NOT NULL,
  dsl_hash           text,
  universe_count     integer NOT NULL,
  excluded_insufficient_data integer NOT NULL DEFAULT 0,
  matched_count      integer NOT NULL,
  duration_ms        integer,
  status             text NOT NULL DEFAULT 'ok',   -- ok | provider_error | blocked_by_qa
  error              jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screener_version_id, as_of, dsl_hash)
);
CREATE INDEX ON screener_run (as_of DESC);

CREATE TABLE screener_result (
  run_id          bigint NOT NULL REFERENCES screener_run(id) ON DELETE CASCADE,
  security_id     bigint NOT NULL REFERENCES dim_security(id),
  rank            integer NOT NULL,
  provider_rank   integer,
  score           numeric(20,6),
  soft_score      numeric(20,6),
  metric_payload  jsonb NOT NULL DEFAULT '{}',   -- the columns this screener displays
  provider_payload jsonb,                        -- columns returned by Stockbit, shown separately
  is_new          boolean NOT NULL DEFAULT false,
  PRIMARY KEY (run_id, security_id)
);
CREATE INDEX ON screener_result (security_id);

CREATE TABLE screener_result_criterion (
  run_id        bigint NOT NULL REFERENCES screener_run(id) ON DELETE CASCADE,
  security_id   bigint NOT NULL REFERENCES dim_security(id),
  criterion_idx smallint NOT NULL,
  criterion_key text NOT NULL,          -- stable path into the filter tree, e.g. "all[3].streak"
  label         text,
  status        criterion_status NOT NULL,
  actual_value  numeric(30,8),
  threshold     numeric(30,8),
  miss_pct      numeric(12,4),
  PRIMARY KEY (run_id, security_id, criterion_idx)
);
CREATE INDEX ON screener_result_criterion (run_id, criterion_idx, status);

-- ---------- stockbit link ----------------------------------------------------

CREATE TABLE stockbit_credential (
  user_id        bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  sealed_blob    bytea NOT NULL,        -- AES-256-GCM(access+refresh+ua[, password])
  nonce          bytea NOT NULL,
  wrapped_dek    bytea NOT NULL,
  key_version    smallint NOT NULL,
  access_expires_at timestamptz,
  last_ok_at     timestamptz,
  state          text NOT NULL DEFAULT 'unlinked',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------- ops --------------------------------------------------------------

CREATE TABLE ingest_run (
  id           bigserial PRIMARY KEY,
  dataset      text NOT NULL,
  as_of        date NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running',
  requests     integer NOT NULL DEFAULT 0,
  rows_written integer NOT NULL DEFAULT 0,
  coverage_pct numeric(6,3),
  error        jsonb
);
CREATE INDEX ON ingest_run (dataset, as_of DESC);

CREATE TABLE data_quality_finding (
  id          bigserial PRIMARY KEY,
  as_of       date NOT NULL,
  security_id bigint REFERENCES dim_security(id),
  check_key   text NOT NULL,
  severity    finding_severity NOT NULL,
  detail      jsonb NOT NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON data_quality_finding (as_of, severity) WHERE resolved_at IS NULL;

CREATE TABLE backfill_cursor (
  dataset     text NOT NULL,
  security_id bigint NOT NULL REFERENCES dim_security(id),
  done_through date,
  PRIMARY KEY (dataset, security_id)
);

-- ---------- watchlists & backtests ------------------------------------------

CREATE TABLE watchlist (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE watchlist_item (
  watchlist_id bigint NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  security_id  bigint NOT NULL REFERENCES dim_security(id),
  added_at     timestamptz NOT NULL DEFAULT now(),
  from_screener text,
  note         text,
  PRIMARY KEY (watchlist_id, security_id)
);

CREATE TABLE backtest (
  id bigserial PRIMARY KEY,
  screener_version_id bigint NOT NULL REFERENCES screener_version(id),
  from_date date NOT NULL,
  to_date   date NOT NULL,
  rebalance text NOT NULL,                 -- monthly | quarterly | annual
  weighting text NOT NULL DEFAULT 'equal', -- equal | cap | rank
  positions integer NOT NULL,
  cost_bps  numeric(8,3) NOT NULL DEFAULT 30,
  slippage_bps numeric(8,3) NOT NULL DEFAULT 20,
  lag_assumed boolean NOT NULL DEFAULT false,
  benchmark text NOT NULL DEFAULT 'IHSG',
  status    text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE backtest_rebalance (
  backtest_id bigint NOT NULL REFERENCES backtest(id) ON DELETE CASCADE,
  as_of date NOT NULL,
  selected integer NOT NULL,
  turnover_pct numeric(8,3),
  PRIMARY KEY (backtest_id, as_of)
);
CREATE TABLE backtest_position (
  backtest_id bigint NOT NULL REFERENCES backtest(id) ON DELETE CASCADE,
  as_of date NOT NULL,
  security_id bigint NOT NULL REFERENCES dim_security(id),
  weight numeric(12,8) NOT NULL,
  entry_price numeric(20,4),
  exit_price  numeric(20,4),
  period_return numeric(14,8),
  delisted_during boolean NOT NULL DEFAULT false,
  PRIMARY KEY (backtest_id, as_of, security_id)
);
CREATE TABLE backtest_stat (
  backtest_id bigint NOT NULL REFERENCES backtest(id) ON DELETE CASCADE,
  stat_key text NOT NULL,
  value numeric(20,8),
  PRIMARY KEY (backtest_id, stat_key)
);

-- Row-level security is enabled on every user-scoped table even in single-user mode,
-- so switching ALLSTOCKS_MULTI_USER=true cannot leak data by omission.
ALTER TABLE screener               ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist              ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockbit_credential    ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest               ENABLE ROW LEVEL SECURITY;
