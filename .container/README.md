# Trades container deployment

> **Mandatory agent pre-read:** read `.container/AGENTS.md` before any local or VPS Docker command.
> Trades is application-only and must connect to—not create or replace—the shared CODEXSUN
> infrastructure.

Run `bash install.sh` from the Trades repository after cloning `framework`, `ui`, and `core`
beside it. Images build directly from source; no registry login is needed.

The standalone application stack owns API host port `18070`, Web port `18080`, and its own named
storage volume. It uses the single shared `codexsun-mariadb`, `codexsun-redis`, and
`codexsun-media` infrastructure containers. The single-client bootstrap creates Trades's fixed
application context for `app.trades.in` and provisions the single `TRADES_DB_NAME` database.

All application services join the shared `codexsun-network`; only Web is exposed through Traefik.
Persistent application storage remains in the `trades-platform-data` volume.

## Prerequisites and safe deployment

- Docker Engine and Docker Compose v2.
- Sibling `framework`, `ui`, and `core` repositories.
- The CODEXSUN infrastructure environment file at `../codexsun/.container/deploy.env` or an
  explicitly configured `CODEXSUN_INFRA_ENV`.
- Existing `codexsun-network` plus healthy `codexsun-mariadb`, `codexsun-redis`, and
  `codexsun-media` containers.
- VPS DNS for `app.trades.in`, Traefik, TCP 80/443, and a verified backup/empty-install marker
  before database work.

Run `bash install.sh` to build and replace only Trades API, Web, migrations, and owned storage.
The installer may create or migrate the Trades-owned database inside shared MariaDB, but it never
owns the MariaDB container, Redis, Media, their volumes, or the shared network. If a prerequisite is
missing or unhealthy, the installer stops instead of recreating infrastructure.
