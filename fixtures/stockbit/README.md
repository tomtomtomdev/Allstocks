# Stockbit fixtures

Redacted responses captured from a real session, per
[docs/01-STOCKBIT-ADAPTER.md](../../docs/01-STOCKBIT-ADAPTER.md) §2. They drive the contract
tests and let the whole app be developed offline.

**Redaction is enforced, not trusted.** CI fails the build on a JWT-shaped string or an email
address anywhere under `fixtures/`. Strip auth headers, cookies, device/session ids, account
identity, portfolio and watchlist contents before committing. Keep tickers, prices, statement
line items, ratios, and screener criteria — those are the point.

Empty until the M1 discovery pass runs.
