#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/scripts/common.sh"
prepare_env

bind=$(env_value TRADES_BIND_ADDRESS 127.0.0.1)
curl --fail --silent --show-error "http://${bind}:$(env_value PLATFORM_API_HOST_PORT 18070)/health" >/dev/null
curl --fail --silent --show-error "http://${bind}:$(env_value PLATFORM_WEB_HOST_PORT 18080)/health" >/dev/null
docker exec -e REDISCLI_AUTH="$(env_value TRADES_REDIS_PASSWORD)" "$(env_value REDIS_CONTAINER_NAME cxapp-redis)" \
  redis-cli --user "$(env_value TRADES_REDIS_USER default)" ping | grep -qx PONG

docker exec trades-api node --input-type=module -e '
  const base = `http://127.0.0.1:${process.env.PLATFORM_API_PORT}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, options);
    const body = await response.json();
    if (!response.ok || body.success !== true) throw new Error(`${path} failed (${response.status})`);
    return body.data;
  };
  const login = await request("/auth/login", {
    body: JSON.stringify({ desk: "super_admin", email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD }),
    headers: { "content-type": "application/json" }, method: "POST"
  });
  const headers = { authorization: `Bearer ${login.accessToken}` };
  const apps = await request("/admin/app-operations", { headers });
  if (apps.map((app) => app.id).join(",") !== "platform") throw new Error("Trades must expose only its Platform runtime.");
  if (apps[0]?.status !== "online") throw new Error(`Trades Platform status is ${apps[0]?.status}`);
'

db_password=$(env_value DB_PASSWORD)
trades_db=$(env_value TRADES_DB_NAME trades_db)
database_count=$(docker exec -e MYSQL_PWD="$db_password" "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" mariadb --batch --skip-column-names -u "$(env_value DB_USER cxapp_app)" -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$trades_db';")
[ "$database_count" = "1" ] || { echo "Trades application database is missing." >&2; exit 69; }
echo "Trades container smoke test passed: trades.codexsun.com, API, Web, Redis, and the single MariaDB database are ready."
