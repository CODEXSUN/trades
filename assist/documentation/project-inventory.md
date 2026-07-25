# Trades Repository Inventory

## Purpose

This is the authoritative workspace map for the Trades single-client application.

Last reviewed: 2026-07-24.

## Executable Application

| Repository | Package  | Runtime role                                       |
| ---------- | -------- | -------------------------------------------------- |
| `trades`   | `trades` | Runs the Trades API on 7070 and Trades Web on 7080 |

Trades is one application installation for one configured client. It does not expose tenant
selection, tenant onboarding, Super Admin, or staff-admin desks. The public site, `/login`, and
`/app/*` are its active web surfaces.

The application contains two always-enabled desks:

- `Trades` provides the business workspace, operational overview, transaction-only Deposit and
  Payment posting, and module-owned Bank Accounts with individual statements, cash entries,
  transfers, and reconciliation. Commission summaries remain separately persisted and are not part
  of transaction posting screens or payloads.
- `Application` provides client administration and Core-owned organisation/master modules.

## Installed Shared Repositories

| Repository  | Package               | Ownership                                   |
| ----------- | --------------------- | ------------------------------------------- |
| `framework` | `@codexsun/framework` | Backend infrastructure and stable contracts |
| `ui`        | `@codexsun/ui`        | Presentation primitives                     |
| `core`      | `@codexsun/core`      | Organisation and master business modules    |

Billing, Mail, Ecommerce, Sites, Devkit, CODEXSUN Platform, and TechMedia are sibling products and
are not Trades runtime dependencies.

## Physical Structure

```text
<workspace>/
  trades/
    src/platform/api/
    src/platform/web/
    assist/
    tools/
  framework/
  ui/
  core/
```

Each directory is an independent Git repository. Trades imports siblings only through their public
package exports.

## Single-Client Compatibility Boundary

Core's current public contracts require a signed database context named `tenant`. Trades supplies
exactly one fixed internal context derived from `CLIENT_*` environment values. That compatibility
name is not a Trades product capability: requests cannot select another client, login does not ask
for a corporate ID, and no tenant-management web routes are published.

Trades uses one physical database and boots it in this order:

1. Create `TRADES_DB_NAME`.
2. Run Platform infrastructure migrations and seeds.
3. Reconcile the single internal client record to the same database.
4. Run client runtime, Trades Bank Account/Deposit/Payment, and Core migrations and seeds in that database.
5. Start the API and Web application.

The fixed database context must be validated against the signed session. Arbitrary database headers
must never become a client-selection mechanism.

## Environment Ownership

Only Trades owns its runtime `.env`. Product-specific operational variables use the `TRADES_`
prefix. The fixed application identity uses `CLIENT_*` variables; the one database is configured by
`TRADES_DB_NAME`. Default native ports are API `7070` and Web `7080`; container host ports are
`18070` and `18080`.

## Verification

Trades uses root scripts for formatting, lint, TypeScript, module-boundary checks, database
lifecycle checks, builds, product-stack tests, dependency-layout checks, and runtime/E2E tests.
No check may be reported as passed unless it ran successfully.
