# Trades Deployment Log

## Version state

Current documented release: 1.0.7

Never record secrets. Insert new entries above older entries.

## [1.0.7] 2026-07-26 09:16 UTC - Cloudflare workflow prepared

- Removed Traefik labels, connected only `trades-web` to `cxapp-edge`, and
  added repository-owned setup/update entry points.
- Repository checks, Bash validation, and Compose validation passed. No
  container replacement or migration ran in this pass.
- Source revision was `0e14f86`; dirty local work was preserved.
- Only the configured Trades database can be recreated after exact
  confirmation; CXApp protected databases are hard blocked.
- Shared MariaDB, Redis, Media, networks, and volumes are reused and never
  created by Trades.
- `trades.codexsun.com` activation remains pending in Cloudflare.
