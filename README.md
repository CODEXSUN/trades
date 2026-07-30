# Trades

Trades is a standalone, single-client application for deposits, payments, bank accounts, and
commission. It uses local authentication and one MariaDB database configured by `DB_NAME`.

The Platform layer owns users, roles, permissions, user-role assignments, and role-permission
assignments. Each Trades business module owns its API routes, service, repository, migration,
seed, types, and frontend workspace.

## Development

Copy `.env.example` to `.env`, configure MariaDB, JWT, and the initial administrator, then run:

```sh
npm install
npm run dev
```

Default endpoints are API `http://127.0.0.1:7050` and Web `http://127.0.0.1:7060`.

Database commands:

```sh
npm run db:migrate
npm run db:seed
npm run db:migrations:list
```

## Verification

```sh
npm run check
npm run build
npm run test:e2e:runtime
```

Read `assist/AGENT-GUIDE.md` before changing architecture or module ownership.
