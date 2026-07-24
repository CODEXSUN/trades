# Trades Changelog

## Version State

Current version: 1.0.6

Release tag: v-1.0.6

Changelog label: v 1.0.6

This changelog starts with Trades as an independent single-client application composed from
`framework + ui + core + platform`. Source-project and sibling-product release histories are not
Trades release history.

New entries must keep database-facing work and application code work separate.

## v-1.0.6

### [v 1.0.6] 2026-07-24 10:39 am - Establish Trades single-client transaction application

#### Database Changes

- Database update: Yes.
- Added the fixed-client Platform, access, activity, queue, storage, Deposit, Payment, and Core
  migration and repeatable seed lifecycle in the single `TRADES_DB_NAME` database.
- Kept Deposit and Payment persistence module-owned, with commission data stored separately and no
  tenant-selectable database boundary.

#### App Codebase Changes

- Established the standalone Trades API and Web composition using only Framework, UI, Core, and
  Trades-owned Platform modules; Billing, Mail, Sites, Ecommerce, TechMedia, and CODEXSUN remain
  sibling products rather than runtime dependencies.
- Added fixed-client authentication, Trades and Application desks, transaction-only Deposit and
  Payment workspaces, operational overview, and Core organisation/master composition.
- Added environment validation, root-only npm workspace tooling, module/database boundary checks,
  production builds, product-stack tests, and focused composed-runtime and trade-detail E2E flows.
- Added standalone Docker/Traefik installation on ports `18070` and `18080`, with safe forward
  migrations, smoke verification, and strict ownership of only Trades application containers.
- Added authoritative Assist, repository inventory, deployment, migration, environment, and release
  documentation for the one-client architecture.
- Bumped repository version to 1.0.6.
