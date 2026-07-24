# Trades Single-Client Data Boundary

## Goal

Trades runs one application for one configured client. It does not provide multi-tenant routing,
tenant selection, tenant onboarding, cross-tenant administration, plans, or per-tenant entitlement
overrides as product capabilities.

## Fixed Client Context

The configured identity is owned by these environment values:

- `CLIENT_NAME`
- `CLIENT_CORPORATE_ID`
- `CLIENT_SLUG`
- `CLIENT_DOMAIN`
- `CLIENT_ADMIN_NAME`
- `CLIENT_ADMIN_EMAIL`
- `CLIENT_ADMIN_PASSWORD`

`TRADES_DB_NAME` owns the one physical application database. It is application infrastructure,
not part of the client identity and not a selectable client database.

Core's package environment schema still requires `DB_MASTER_NAME` and rejects that name for Core
business tables. Trades sets it to the non-existent `__trades_core_guard_unused__` compatibility
sentinel. No database is created or queried using that value.

`ENABLE_SINGLE_CLIENT=1` reconciles and provisions this client during application boot. Login uses
the fixed client automatically and accepts only email and password.

Core's public API currently names its request-bound database contract `tenant` and requires signed
`tenantId` and `tenantDbName` claims plus matching compatibility headers. Trades may populate that
contract for its one client, but must not expose a selector or accept an arbitrary database name.
This is an integration seam, not a multi-tenant product model.

## Data Access Rules

- Platform metadata, the one compatibility registry row, and Core business data are stored in the
  same `TRADES_DB_NAME` database.
- The signed session is authoritative for access to that fixed database context.
- A changed or mismatched database header must fail closed.
- Jobs, events, audit records, integrations, and AI tools must retain the same fixed client context.
- Database credentials and integration secrets must never be exposed to the browser.
- Backup and restore operations must target the explicit verified `TRADES_DB_NAME` database.

## Companies And Users

The single client may own multiple companies, branches, warehouses, counters, devices, accounting
years, and users. Those are business records within the one client application; they do not create
additional tenants or client databases.

## Compatibility Changes

Removing the internal `tenant` naming requires a coordinated future change to the public Core
contracts. Trades must not privately fork or copy Core business behavior to hide that seam.
