# Trades Agent Guide

## Required Reading

1. `assist/README.md`
2. `assist/governance/engineering-rules.md`
3. `assist/architecture/module-boundaries.md`
4. `assist/architecture/data-strategy.md`
5. `assist/documentation/project-inventory.md`

## Runtime Contract

- Trades is standalone, local-authenticated, and single-client.
- Platform owns users, roles, permissions, and their assignment tables.
- Deposit, Payment, Bank Account, and Commission own their complete backend and frontend leaves.
- The internal Framework and UI workspaces are consumed only through public package exports.

## Change Rules

- Preserve unrelated worktree changes.
- Keep entity behavior inside its module leaf.
- Use fixed route contracts and explicit Zod schemas.
- Read runtime configuration only from `.env`.
- Migrations safely upgrade existing databases and record keys in `schema_migrations`.
- Seeds are repeatable; protected administrator creation is controlled by `INITIAL_ADMIN_*`.
- Run typecheck, lint, build, boundary, and database lifecycle checks before completion.
