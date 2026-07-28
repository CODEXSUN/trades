# CODEXSUN Trades

Trades is a public, single-client business stack for CXApp. It owns banking, deposits, payments,
commission calculation, reconciliation, reports, and their API/web contracts.

Trades is not an executable application host. CXApp owns authentication, client scope, database
providers, audit transport, HTTP/Web processes, health, queues, configuration, and deployment.

## Package exports

- `@codexsun/trades/api` — route registration, database lifecycle, module metadata, and host types.
- `@codexsun/trades/web` — Trades workspaces and configurable browser transport.
- `@codexsun/trades/web/cxapp` — lazy CXApp workspace contribution.
- `@codexsun/trades/stack` — immutable client-mode stack metadata and permission keys.

## CXApp integration

CXApp composes the package through its public exports:

```ts
import {
  bootstrapTradesDatabase,
  registerTradesApiForHost,
  tradesStackContribution
} from "@codexsun/trades/api";
import { tradesWebBundle } from "@codexsun/trades/web/cxapp";
```

The CXApp adapter supplies a trusted client ID, request database, principal authorization, and audit
sink. Trades never reads browser-selected database or client headers.

## Repository structure

```text
src/
  api/src/
    app.ts
    database/
    modules/
    request-context.ts
    stack.ts
  web/src/
    cxapp.tsx
    modules/
    shared/
tools/
assist/
```

## Verification

```powershell
npm.cmd install
npm.cmd run check
npm.cmd pack --dry-run
```

`tools/` intentionally contains only `version-bump.mjs` and `github-now.mjs`.

Use `npm.cmd run version-bump -- --dry-run` to preview the next patch version. Run
`npm.cmd run github:now -- --dry-run` to inspect the release commit before the explicit command
pulls, stages, commits, and pushes the repository.
