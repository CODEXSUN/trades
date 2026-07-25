# Trades Changelog

## Version State

Current version: 1.0.7

Release tag: v-1.0.7

Changelog label: v 1.0.7

This changelog starts with Trades as an independent single-client application composed from
`framework + ui + core + platform`. Source-project and sibling-product release histories are not
Trades release history.

New entries must keep database-facing work and application code work separate.

## v-1.0.7

### [v 1.0.7] 2026-07-25 9:17 am - Standardize repository LF line endings

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Standardized detected repository text files on LF through a repository-owned `.gitattributes`
  policy, preventing Windows Git from repeatedly warning about LF-to-CRLF conversion.
- Bumped repository version to 1.0.7.

## v-1.0.6

### [Unreleased] 2026-07-24 - Add bank accounts and reconciliation-ready statements

#### Database Changes

- Added module-owned bank account and debit/credit ledger tables, transaction bank links, legacy
  bank backfill, opening entries, and Deposit/Payment ledger backfill.
- Replaced fixed Deposit/Payment commission summary tables with Commission-owned common percentage
  variants, transaction confirmation entries, and normalized percentage/amount lines.

#### App Codebase Changes

- Added the Banking desk, multiple bank-account CRUD, individual statements, manual cash entries,
  internal transfers, reconciliation controls, and persisted autocomplete with popup creation in
  Deposit and Payment forms.
- Added separate Deposit Commission and Withdrawal Commission desk pages with date-range filters,
  dynamic percentage columns, amount and commission totals, editable rates, and settlement
  confirmation that removes confirmed rows from the unsettled lists.
- Standardized Deposit, Payment, Commission, and Bank Statement date columns as `dd-MMM-yyyy`.
- Added spreadsheet-style cell borders to Deposit, Payment, and Commission list tables.
- Added detail-only browser print/PDF reports for filtered Deposits, Payments, Bank Accounts,
  individual Bank Statements, and date-filtered Commission lists.

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
