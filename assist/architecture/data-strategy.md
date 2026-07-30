# Data Strategy

Trades uses one MariaDB database selected by `DB_NAME`.

Platform owns `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`. Business
modules own the `trades_deposits`, `trades_payments`, `trades_bank_accounts`,
`trades_bank_ledger_entries`, and commission tables. `schema_migrations` records lifecycle keys.

Authentication uses local password hashes and persisted role assignments. Database names and
endpoints come only from `.env`. Destructive reset requires `TRADES_DB_RESET_CONFIRM=DROP_DATABASE`
and production reset additionally requires `TRADES_ALLOW_PRODUCTION_DB_RESET=1`.
