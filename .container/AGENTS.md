# Trades Container Deployment Rules

Every human or automated agent must read this file and `.container/README.md` before running Tech
Media Docker, migration, install, update, or VPS commands.

## Ownership boundary

- Trades owns only `trades-api`, `trades-web`, its migration job, Trades images,
  `trades-platform-data`, and its owned master/client databases.
- `cxapp-mariadb`, `cxapp-redis`, `cxapp-media`, `cxapp-cloudflared`, their
  volumes, `cxapp-network`, and `cxapp-edge` are shared infrastructure owned by
  the CODEXSUN repository.
- Trades connects to the existing shared layer. It must never create, stop, rebuild, remove,
  or prune that layer.

## Prerequisites

Before deployment, verify Docker Engine and Compose v2, sibling `framework`, `ui`, and `core`
repositories, a protected CODEXSUN infrastructure environment file, the existing
`cxapp-network`, `cxapp-edge`, and healthy shared MariaDB/Redis/Media containers.
On a VPS, also verify the Cloudflare route for `trades.codexsun.com`, connector
readiness, and a current database backup or an explicitly recorded
empty-install marker.

Keep `TRADES_DB_FRESH_ON_START=0`, `TRADES_ALLOW_PRODUCTION_DB_RESET=0`, and live restore
disabled during normal deployment. If a shared prerequisite is absent or unhealthy, stop and fix
it from the CODEXSUN infrastructure owner.

## Approved workflow

The installer builds and replaces only the Trades application services, runs Trades-owned
forward migrations/seeds, connects them to the existing network, and runs the stack smoke test:

Use `bash setup.sh` for installation and `bash update.sh` for later releases.
`install.sh` is a compatibility alias for setup.

## Prohibited operations

Never use `down -v`, broad `docker rm`, `docker volume rm`, `docker network rm`, `docker system
prune`, volume prune, database drop/fresh commands, live restore, or CODEXSUN infrastructure
Compose files during a Trades deployment. Never overwrite protected deployment environment
files with examples.

After rollout, run `.container/smoke-test.sh` and confirm the shared infrastructure container IDs
and volumes are unchanged.
