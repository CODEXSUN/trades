#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/scripts/common.sh"

prepare_env
validate_env
docker info >/dev/null 2>&1 || { echo "Docker Engine is not reachable." >&2; exit 69; }
require_shared_network
require_shared_infrastructure
ensure_trades_database

compose --profile tools build platform-migrate trades-api trades-web
compose --profile tools run --rm platform-migrate
compose up -d storage-init trades-api trades-web --wait --wait-timeout 240
bash "$SCRIPT_DIR/smoke-test.sh"
echo "Trades setup completed. API=$(env_value PLATFORM_API_HOST_PORT 18070) Web=$(env_value PLATFORM_WEB_HOST_PORT 18080)"
