# Trades Assist

This folder documents the `@codexsun/trades` business package.

Current architecture:

```text
CXApp runtime -> Trades API/Web public exports -> Trades-owned business modules
```

Trades is an immutable client-mode stack contribution. It owns bank accounts, bank ledger,
deposits, payments, commissions, reconciliation, overview, and reports. CXApp owns application
hosting, authentication, scope, database providers, audit transport, queues, health, operations,
and deployment.

Read this file, the complete owning API and web modules, and the changelog when release history is
relevant. Historical changelog entries describe earlier application designs and are not current
implementation instructions.

## Purpose

Trades is a public business package composed by CXApp. Read this guide, governance rules, project
inventory, and the complete owning module before changing code.

## Ownership

Trades owns Bank Accounts, Bank Ledger entries, Deposits, Payments, Commission variants and
settlement, overview presentation, and detail-only reports.

Trades does not own application hosting, authentication, users, roles, tenants, plans,
subscriptions, entitlements, app registries, queues, storage, public sites, environment loading,
database connection providers, health, deployment, or CXApp UI chrome.

## Package boundary

- `src/api/` exports host-adaptable routes and an injected Kysely lifecycle.
- `src/web/` exports lazy workspace contributions and a configurable HTTP transport.
- CXApp supplies trusted client scope, database, principal authorization, audit sink, and processes.
- Core is an independent optional stack package and is not a Trades dependency.
- Never import private sibling source paths.

## Module ownership

Each API leaf owns migration, module, repository, routes, seed, service, types, and index. Each CRUD
web leaf owns form, hooks, list, schema, services, types, workspace, and index. Composition files
may register and order these public contracts only.

Business permission keys use `trades.<module>.<action>`. Platform or tenant permission prefixes are
not allowed.

## Required checks

Run Prettier, lint, typecheck, build, and a packed-package import smoke. Run persistence or
CXApp-composed browser checks when the host has installed the package; do not claim them from
package-only checks.

Version bumps occur only when explicitly requested. Historical changelog entries are immutable.
