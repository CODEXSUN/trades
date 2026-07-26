# Trades container deployment

> **Mandatory agent pre-read:** read `.container/AGENTS.md` before any local or VPS Docker command.
> Trades is application-only and must connect to—not create or replace—the shared CODEXSUN
> infrastructure.

Run `bash setup.sh` from the Trades repository after cloning `framework`, `ui`, and `core`
beside it. Images build directly from source; no registry login is needed.

The standalone application stack owns API host port `18070`, Web port `18080`, and its own named
storage volume. It uses shared `cxapp-mariadb`, `cxapp-redis`, and
`cxapp-media`. The single-client bootstrap creates Trades's fixed application
context for `trades.codexsun.com` and provisions only `TRADES_DB_NAME`.

API and migrations join `cxapp-network`; Web also joins `cxapp-edge` for the
CXApp-owned Cloudflare Tunnel.
Persistent application storage remains in the `trades-platform-data` volume.

## Prerequisites and safe deployment

- Docker Engine and Docker Compose v2.
- Sibling `framework`, `ui`, and `core` repositories.
- The CODEXSUN infrastructure environment file at `../codexsun/.container/deploy.env` or an
  explicitly configured `CODEXSUN_INFRA_ENV`.
- Existing `cxapp-network` and `cxapp-edge` plus healthy shared containers.
- Cloudflare route `trades.codexsun.com` to `http://trades-web:80` and a
  verified backup/empty-install marker
  before database work.

Run `bash setup.sh` to install and `bash update.sh` for later releases.
The installer may create or migrate the Trades-owned database inside shared MariaDB, but it never
owns the MariaDB container, Redis, Media, their volumes, or the shared network. If a prerequisite is
missing or unhealthy, the installer stops instead of recreating infrastructure.
