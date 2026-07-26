#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
WORKSPACE_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
. "$CONTAINER_DIR/scripts/common.sh"

ASSUME_YES=false
LOCAL_SOURCE=false
DISCARD_LOCAL_CHANGES=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --local-source|--skip-git) LOCAL_SOURCE=true ;;
    --discard-local-changes) DISCARD_LOCAL_CHANGES=true ;;
    -h|--help)
      echo "Usage: bash setup.sh [--yes] [--local-source] [--discard-local-changes]"
      echo "Installs only Trades and optionally recreates only its owned database."
      exit 0 ;;
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
  confirm "Check and fast-forward Trades and mapped sibling repositories?" || {
    LOCAL_SOURCE=true
    echo "Git update skipped."
    return
  }
  for repo in "$ROOT_DIR" "$WORKSPACE_ROOT/framework" "$WORKSPACE_ROOT/ui" "$WORKSPACE_ROOT/core"; do
    [ -d "$repo/.git" ] || { echo "Missing mapped repository: $repo" >&2; exit 69; }
    if [ -n "$(git -C "$repo" status --porcelain)" ]; then
      git -C "$repo" status --short
      [ "$DISCARD_LOCAL_CHANGES" = "true" ] || {
        [ "$ASSUME_YES" = "false" ] || { echo "Dirty repository requires --discard-local-changes." >&2; exit 65; }
        read -r -p "Type DISCARD to remove the listed local changes in $repo: " phrase
        [ "$phrase" = "DISCARD" ] || { echo "Setup cancelled." >&2; exit 65; }
      }
      git -C "$repo" restore --source=HEAD --staged --worktree .
      git -C "$repo" clean -fd
    fi
    git -C "$repo" pull --ff-only
  done
}

echo "Trades setup"
sync_sources
prepare_env
validate_env
docker info >/dev/null 2>&1 || { echo "Docker Engine is not reachable." >&2; exit 69; }
require_shared_network
require_shared_infrastructure

echo "Running Trades source preflight."
npm run check
npm run dependencies:check
compose --profile tools config --quiet
compose --profile tools build platform-migrate trades-api trades-web

if trades_database_exists; then
  if ! confirm "Use the existing Trades database $(env_value TRADES_DB_NAME trades_db)?"; then
    database=$(env_value TRADES_DB_NAME trades_db)
    if confirm "Create a backup before recreating only $database?"; then
      compose --profile tools run --rm platform-migrate npm run db:dump:create
    fi
    [ "$ASSUME_YES" = "false" ] || {
      echo "--yes never drops an existing database. Run interactively." >&2
      exit 78
    }
    read -r -p "Type DROP $database to permanently delete only this application database: " phrase
    [ "$phrase" = "DROP $database" ] || { echo "Database recreation cancelled." >&2; exit 78; }
    drop_trades_database
    echo "Dropped Trades-owned database: $database"
  fi
else
  confirm "Create the new Trades database $(env_value TRADES_DB_NAME trades_db)?" || {
    echo "Setup cancelled before database creation."
    exit 0
  }
fi

ensure_trades_database
compose --profile tools run --rm platform-migrate
compose up -d storage-init trades-api trades-web --wait --wait-timeout 240
bash "$CONTAINER_DIR/smoke-test.sh"
echo "Trades setup completed. Cloudflare origin: http://trades-web:80"
