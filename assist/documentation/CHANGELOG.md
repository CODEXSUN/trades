# Changelog

Current version: 1.0.17
Release tag: v-1.0.17
Changelog label: v 1.0.17

## Unreleased - Trades conversion

- Renamed the standalone application and deployment surface to Trades.
- Retained Platform local users, roles, permissions, and assignments.
- Composed Deposit, Payment, Bank Account, and Commission from migration through UI.
- Removed the copied external sales and identity integration features.

## v-1.0.17

### [v 1.0.17] 2026-07-30 11:22 pm - Trades conversion and CRUD stabilization

#### Database Changes

- Database update: Yes.
- Added and seeded the complete Trades permissions used by Bank Account, Deposit,
  Payment, ledger, reconciliation, and Commission lifecycle operations.
- Assigned the Trades business permissions to the local Platform roles.
- Verified the ordered Platform identity and Trades module migrations against
  `trades_db`.

#### App Codebase Changes

- Bumped repository version to 1.0.17.
- Corrected the Trades web client base URL to route requests through
  `/api/platform`.
- Removed the Frappe-dependent authentication path in favor of local Platform
  authentication and development auto-login.
- Stabilized the Vite React Refresh preamble used by the development loader.
- Verified create, list, read, update, activate, deactivate, settlement, statement,
  and force-delete behavior for Bank Accounts, Deposits, Payments, ledger entries,
  and Commissions.
- Confirmed that the CRUD verification removed its temporary records and restored
  the edited Commission variant.
