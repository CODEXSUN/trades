#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
WORKSPACE_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
. "$CONTAINER_DIR/scripts/common.sh"

ASSUME_YES=false
LOCAL_SOURCE=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --local-source|--skip-git) LOCAL_SOURCE=true ;;
    -h|--help) echo "Usage: bash update.sh [--yes] [--local-source]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 64 ;;
  esac
done
confirm() {
  [ "$ASSUME_YES" = "true" ] && return 0
  read -r -p "$1 [Y/n] " answer
  case "${answer:-Y}" in y|Y|yes|YES|Yes) return 0 ;; *) return 1 ;; esac
}
sync_sources() {
  [ "$LOCAL_SOURCE" = "false" ] || { echo "Git update skipped."; return; }
  confirm "Check and fast-forward Trades and mapped sibling repositories?" || { echo "Git update skipped."; return; }
  for repo in "$ROOT_DIR" "$WORKSPACE_ROOT/framework" "$WORKSPACE_ROOT/ui" "$WORKSPACE_ROOT/core"; do
    [ -z "$(git -C "$repo" status --porcelain)" ] || {
      echo "Dirty repository blocks update: $repo" >&2
      git -C "$repo" status --short
      exit 65
    }
    git -C "$repo" pull --ff-only
  done
}
shared_state() {
  for name in "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" "$(env_value REDIS_CONTAINER_NAME cxapp-redis)" "$(env_value MEDIA_CONTAINER_NAME cxapp-media)"; do
    docker inspect "$name" --format '{{.Name}}={{.Id}}'
  done
  for network in "$(env_value CODEXSUN_BACKEND_NETWORK cxapp-network)" "$(env_value CODEXSUN_EDGE_NETWORK cxapp-edge)"; do
    docker network inspect "$network" --format '{{.Name}}={{.Id}}'
  done
}

echo "Trades update"
sync_sources
prepare_env
validate_env
require_shared_network
require_shared_infrastructure
trades_database_exists || { echo "Trades database is missing. Run bash setup.sh." >&2; exit 69; }
npm run check
npm run dependencies:check
compose --profile tools config --quiet
shared_before=$(shared_state | sort)
compose --profile tools build platform-migrate trades-api trades-web
if confirm "Back up the Trades database before update?"; then
  compose --profile tools run --rm platform-migrate npm run db:dump:create
fi
if confirm "Run new or pending Trades migrations from this release?"; then
  compose --profile tools run --rm platform-migrate npm run db:migrations:list
  compose --profile tools run --rm platform-migrate npm run db:migrations:run
fi
compose up -d storage-init trades-api trades-web --force-recreate --wait --wait-timeout 240
bash "$CONTAINER_DIR/smoke-test.sh"
[ "$(shared_state | sort)" = "$shared_before" ] || { echo "Shared CXApp infrastructure identity changed." >&2; exit 74; }
echo "Trades update completed. Shared infrastructure and the existing database were preserved."
