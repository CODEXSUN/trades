import { createConnection } from "mysql2/promise";
import { closeCoreDatabase } from "@codexsun/core-api";
import {
  closePlatformDatabase,
  createApplicationDatabase,
  dropPlatformDatabases,
  migratePlatformDatabase,
  platformDatabaseName,
  resetPlatformDatabases,
  seedPlatformDatabase
} from "./platform-database.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import {
  migrateTenantDatabase,
  seedSingleClient,
  seedTenantDatabase
} from "../modules/tenant/tenant.seed.js";
import { env } from "../env.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";

type DbCommand =
  | "migrate"
  | "seed"
  | "drop"
  | "fresh"
  | "migrations:list"
  | "migrations:preflight"
  | "migrations:run"
  | "migrations:test-local"
  | "dump:create"
  | "dump:download"
  | "restore:test"
  | "backup:verify";

const validCommands: DbCommand[] = [
  "migrate",
  "seed",
  "drop",
  "fresh",
  "migrations:list",
  "migrations:preflight",
  "migrations:run",
  "migrations:test-local",
  "dump:create",
  "dump:download",
  "restore:test",
  "backup:verify"
];

const command = process.argv[2] as DbCommand | undefined;

async function main() {
  if (!command || !validCommands.includes(command)) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    console.info(`[database] db:${command} started`);
    if (command === "migrate") {
      await migrateAll();
    }

    if (command === "seed") {
      await seedAll();
    }

    if (command === "drop") {
      warnDestructive("Dropping the Trades application database");
      await dropPlatformDatabases();
    }

    if (command === "fresh") {
      warnDestructive("Dropping and rebuilding the Trades application database");
      await resetPlatformDatabases();
      await seedSingleClient();
    }

    if (command === "migrations:list") {
      await listMigrationState();
    }

    if (command === "migrations:preflight") {
      await runMigrationPreflight();
    }

    if (command === "migrations:run") {
      await runMigrationPreflight();
      await migrateAll();
    }

    if (command === "migrations:test-local") {
      await runLocalMigrationTest();
    }

    if (command === "dump:create" || command === "dump:download") {
      printExternalToolingRequired(command);
    }

    if (command === "restore:test") {
      await runRestoreTest();
    }

    if (command === "backup:verify") {
      await runBackupVerify();
    }

    console.log(`ok db:${command} completed`);
  } finally {
    await Promise.all([closeCoreDatabase(), closePlatformDatabase()]);
  }
}

async function migrateAll() {
  console.info("[database] running Trades application migrations");
  await createApplicationDatabase();
  await migratePlatformDatabase();
  await migrateTenantAppDatabases();
}

async function seedAll() {
  console.info("[seeder] running Trades application and single-client seeders");
  await createApplicationDatabase();
  await migratePlatformDatabase();
  await seedPlatformDatabase();
  await seedSingleClient();
  await seedTenantAppDatabases();
}

async function migrateTenantAppDatabases() {
  const tenants = await new TenantRepository().list();
  console.info(`[database] tenant app migration targets: ${tenants.length}`);
  for (const tenant of tenants) {
    console.info(
      `[database] migrating tenant app modules for "${tenant.tenantCode}" (${tenant.dbName})`
    );
    await migrateTenantDatabase(tenant);
  }
}

async function seedTenantAppDatabases() {
  const tenants = await new TenantRepository().list();
  console.info(`[seeder] tenant app seed targets: ${tenants.length}`);
  for (const tenant of tenants) {
    console.info(
      `[seeder] seeding tenant app modules for "${tenant.tenantCode}" (${tenant.dbName})`
    );
    await seedTenantDatabase(tenant);
  }
}

async function listMigrationState() {
  const databaseName = platformDatabaseName();
  console.info(`[database] migration state for Trades database "${databaseName}"`);
  const connection = await createConnection({
    database: databaseName,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });

  try {
    const [platformRows] = await connection.query(
      "SELECT name, applied_at FROM trades_migrations ORDER BY applied_at, id"
    );
    console.table(platformRows);
  } catch (error) {
    console.warn(`[database] platform migration table is not readable yet: ${formatError(error)}`);
  } finally {
    await connection.end();
  }

  const tenants = await new TenantRepository().list().catch(() => []);
  console.info(`[database] tenant migration targets: ${tenants.length}`);
  for (const tenant of tenants) {
    const tenantConnection = await createConnection({
      database: tenant.dbName,
      host: tenant.dbHost || env.DB_HOST,
      password: env.DB_PASSWORD,
      port: tenant.dbPort || env.DB_PORT,
      user: tenant.dbUser || env.DB_USER,
      timezone: "Z"
    });
    try {
      const [tenantRows] = await tenantConnection.query(
        "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at, id"
      );
      console.info(`[database] tenant "${tenant.tenantCode}" (${tenant.dbName})`);
      console.table(tenantRows);
    } catch (error) {
      console.warn(
        `[database] tenant "${tenant.tenantCode}" migration table is not readable yet: ${formatError(error)}`
      );
    } finally {
      await tenantConnection.end();
    }
  }
}

async function runMigrationPreflight() {
  const databaseName = platformDatabaseName();
  console.info(
    `[database] preflight target: ${env.NODE_ENV} ${env.DB_HOST}:${env.DB_PORT}/${databaseName}`
  );
  assertDatabaseName(databaseName, "Trades database name");

  if (env.NODE_ENV === "production" && !process.env.TRADES_VERIFIED_BACKUP_ID) {
    throw new Error(
      "production migration preflight refused. Set TRADES_VERIFIED_BACKUP_ID to the verified pre-migration backup id."
    );
  }

  const tenants = await new TenantRepository().list().catch(() => []);
  for (const tenant of tenants) {
    assertDatabaseName(tenant.dbName, `tenant database name for ${tenant.tenantCode}`);
  }

  const invalidTargets = tenants.filter((tenant) => tenant.dbName !== databaseName);
  if (invalidTargets.length) {
    throw new Error(
      `single-database preflight refused: ${invalidTargets.length} internal client record(s) point outside ${databaseName}.`
    );
  }
  console.info(
    `[database] preflight confirmed ${tenants.length} internal client record(s) use "${databaseName}"`
  );
}

async function runLocalMigrationTest() {
  if (env.NODE_ENV === "production") {
    throw new Error("local restored-dump migration test refused in production.");
  }

  if (process.env.TRADES_RESTORED_DUMP_TEST !== "1") {
    throw new Error(
      "local migration test requires TRADES_RESTORED_DUMP_TEST=1 after restoring a dump into the configured local Trades database."
    );
  }

  await runMigrationPreflight();
  await migrateAll();
  console.info(
    "[database] local restored-dump migration test completed. Run affected app/API tests before promoting the migration."
  );
}

async function runRestoreTest() {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "restore test refused in production. Restore into a sandbox environment first."
    );
  }

  const restoreDatabaseName = process.env.TRADES_RESTORE_TEST_DB_NAME;
  if (!restoreDatabaseName) {
    throw new Error(
      "restore test requires TRADES_RESTORE_TEST_DB_NAME set to an explicit sandbox database name."
    );
  }

  const sandboxName = assertDatabaseName(restoreDatabaseName, "restore test database name");
  if (sandboxName === platformDatabaseName()) {
    throw new Error("restore test database must not be the configured Trades database.");
  }

  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(sandboxName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    const [rows] = await connection.query(`SHOW TABLES FROM ${quoteIdentifier(sandboxName)}`);
    console.info(
      `[database] restore-test sandbox "${sandboxName}" is reachable with ${Array.isArray(rows) ? rows.length : 0} table(s)`
    );
  } finally {
    await connection.end();
  }
}

async function runBackupVerify() {
  const backupId = process.env.TRADES_BACKUP_VERIFY_ID;
  if (!backupId) {
    throw new Error(
      "backup verification requires TRADES_BACKUP_VERIFY_ID set to the backup artifact/run id being verified."
    );
  }
  console.info(
    `[database] backup verification marker accepted for "${backupId}". Run db:restore:test against its sandbox restore before marking it verified.`
  );
}

function printExternalToolingRequired(commandName: "dump:create" | "dump:download") {
  console.info(`[database] ${commandName} is reserved as the stable TRADES operator command.`);
  console.info(
    "[database] Wire this command to the deployment provider dump/export tool before production use; every dump must be permission-checked and audited."
  );
}

function warnDestructive(message: string) {
  console.warn(`
DATABASE WARNING
${message}.

This deletes configured database data. Required guards:
  TRADES_DB_RESET_CONFIRM=DROP_DATABASES
  TRADES_ALLOW_PRODUCTION_DB_RESET=1 when NODE_ENV=production
`);
}

function printHelp() {
  console.log(`
TRADES database CLI

Usage:
  tsx src/database/db-cli.ts migrate
  tsx src/database/db-cli.ts seed
  tsx src/database/db-cli.ts drop
  tsx src/database/db-cli.ts fresh
  tsx src/database/db-cli.ts migrations:list
  tsx src/database/db-cli.ts migrations:preflight
  tsx src/database/db-cli.ts migrations:run
  tsx src/database/db-cli.ts migrations:test-local
  tsx src/database/db-cli.ts dump:create
  tsx src/database/db-cli.ts dump:download
  tsx src/database/db-cli.ts restore:test
  tsx src/database/db-cli.ts backup:verify

Root npm commands:
  npm run db:migrate
  npm run db:seed
  npm run db:drop
  npm run dbmigrate:fresh
  npm run db:migrations:list
  npm run db:migrations:preflight
  npm run db:migrations:run
  npm run db:migrations:test-local
  npm run db:dump:create
  npm run db:dump:download
  npm run db:restore:test
  npm run db:backup:verify
`);
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

await main();
