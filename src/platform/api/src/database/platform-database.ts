import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { existsSync, writeFileSync } from "node:fs";
import { env } from "../env.js";
import {
  appRegistryMigration,
  migrateAppRegistryModule
} from "../modules/app-registry/app-registry.migration.js";
import { seedAppRegistryModule } from "../modules/app-registry/app-registry.seed.js";
import { migrateTenantDomainModule } from "../modules/tenant-domain/tenant-domain.migration.js";
import {
  migrateTenantRegistryModule,
  tenantMigration
} from "../modules/tenant/tenant.migration.js";
import { migratePlanModule } from "../modules/plan/plan.migration.js";
import { seedPlanModule } from "../modules/plan/plan.seed.js";
import { migrateSubscriptionModule } from "../modules/subscription/subscription.migration.js";
import { seedSubscriptionModule } from "../modules/subscription/subscription.seed.js";
import { migrateIndustryModule } from "../modules/industry/industry.migration.js";
import { seedIndustryModule } from "../modules/industry/industry.seed.js";
import { migrateEntitlementModule } from "../modules/entitlement/entitlement.migration.js";
import { seedEntitlementModule } from "../modules/entitlement/entitlement.seed.js";
import { migrateAccessControlModule } from "../modules/access-control/access-control.migration.js";
import { seedAccessControlModule } from "../modules/access-control/access-control.seed.js";
import { migratePlatformActivityModule } from "../modules/platform-activity/platform-activity.migration.js";
import { seedPlatformActivityModule } from "../modules/platform-activity/platform-activity.seed.js";
import { migrateDatabaseMaintenanceModule } from "../modules/database-maintenance/database-maintenance.migration.js";
import { seedDatabaseMaintenanceModule } from "../modules/database-maintenance/database-maintenance.seed.js";
import { migrateQueueManagerModule } from "../modules/queue-manager/queue-manager.migration.js";
import { seedQueueManagerModule } from "../modules/queue-manager/queue-manager.seed.js";
import { migrateStorageManagerModule } from "../modules/storage-manager/storage-manager.migration.js";
import { seedStorageManagerModule } from "../modules/storage-manager/storage-manager.seed.js";
import { migrateAppOrchestrationModule } from "../modules/app-orchestration/app-orchestration.migration.js";
import { seedAppOrchestrationModule } from "../modules/app-orchestration/app-orchestration.seed.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { PlatformDatabase } from "./schema.js";

let platformDatabase: Kysely<PlatformDatabase> | null = null;
let bootstrapped = false;

const applicationMigrationSteps = [
  {
    description: appRegistryMigration.description,
    migrate: migrateAppRegistryModule,
    name: appRegistryMigration.key
  },
  {
    description: "Platform tenant registry and audit foundation.",
    migrate: migrateTenantRegistryModule,
    name: tenantMigration.key
  },
  {
    description: "Tenant domain registry.",
    migrate: migrateTenantDomainModule,
    name: "platform.tenant-domain.foundation"
  },
  { description: "Platform plans.", migrate: migratePlanModule, name: "platform.plan.foundation" },
  {
    description: "Tenant subscriptions.",
    migrate: migrateSubscriptionModule,
    name: "platform.subscription.foundation"
  },
  {
    description: "Industry registry.",
    migrate: migrateIndustryModule,
    name: "platform.industry.foundation"
  },
  {
    description: "Plan and tenant entitlements.",
    migrate: migrateEntitlementModule,
    name: "platform.entitlement.foundation"
  },
  {
    description: "Super Admin access control.",
    migrate: migrateAccessControlModule,
    name: "platform.access-control.foundation"
  },
  {
    description: "Platform activity history.",
    migrate: migratePlatformActivityModule,
    name: "platform.activity.foundation"
  },
  {
    description: "Database maintenance run lifecycle.",
    migrate: migrateDatabaseMaintenanceModule,
    name: "platform.database-maintenance.foundation"
  },
  {
    description: "Database-backed queue jobs.",
    migrate: migrateQueueManagerModule,
    name: "platform.queue-manager.foundation"
  },
  {
    description: "Storage objects and tenant storage roots.",
    migrate: migrateStorageManagerModule,
    name: "platform.storage-manager.foundation"
  },
  {
    description: "Application orchestration process-local state policy.",
    migrate: async (_database: Kysely<PlatformDatabase>) => migrateAppOrchestrationModule(),
    name: "platform.app-orchestration.runtime-policy"
  }
] as const;

export const platformMasterMigrationOrder = applicationMigrationSteps.map(({ name }) => name);

const applicationSeedSteps = [
  { name: "platform.app-registry", seed: seedAppRegistryModule },
  { name: "platform.plan", seed: seedPlanModule },
  { name: "platform.subscription", seed: seedSubscriptionModule },
  { name: "platform.industry", seed: seedIndustryModule },
  { name: "platform.entitlement", seed: seedEntitlementModule },
  { name: "platform.access-control", seed: seedAccessControlModule },
  { name: "platform.activity", seed: seedPlatformActivityModule },
  { name: "platform.database-maintenance", seed: seedDatabaseMaintenanceModule },
  { name: "platform.queue-manager", seed: seedQueueManagerModule },
  { name: "platform.storage-manager", seed: seedStorageManagerModule },
  {
    name: "platform.app-orchestration",
    seed: async (_database: Kysely<PlatformDatabase>) => seedAppOrchestrationModule()
  }
] as const;

export const platformMasterSeedOrder = applicationSeedSteps.map(({ name }) => name);

export function platformDatabaseConfig() {
  return {
    database: platformDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  };
}

export function platformDatabaseName() {
  return assertDatabaseName(env.TRADES_DB_NAME, "Trades database name");
}

export function getPlatformDatabase() {
  if (!platformDatabase) {
    platformDatabase = new Kysely<PlatformDatabase>({
      dialect: new MysqlDialect({
        pool: createPool({
          ...platformDatabaseConfig(),
          connectionLimit: 10,
          timezone: "Z"
        } satisfies PoolOptions)
      })
    });
  }

  return platformDatabase;
}

export async function bootstrapPlatformDatabase() {
  if (bootstrapped || process.env.TRADES_DEV_SKIP_DB === "1") {
    if (process.env.TRADES_DEV_SKIP_DB === "1") {
      console.info("[database] bootstrap skipped because TRADES_DEV_SKIP_DB=1");
    }
    return;
  }

  if (env.TRADES_DB_FRESH_ON_START === "1") {
    const sessionFile = process.env.TRADES_DB_FRESH_SESSION_FILE;
    if (!sessionFile || !existsSync(sessionFile)) {
      console.info("[database] fresh startup requested");
      await resetPlatformDatabases();
      if (sessionFile) writeFileSync(sessionFile, new Date().toISOString(), "utf8");
      return;
    }
    console.info("[database] fresh startup already completed for this dev session");
  }

  console.info("[database] bootstrap started");
  await createApplicationDatabase();
  await migratePlatformDatabase();
  await seedPlatformDatabase();
  bootstrapped = true;
  console.info(`[database] bootstrap completed for Trades database "${platformDatabaseName()}"`);
}

export async function closePlatformDatabase() {
  if (platformDatabase) {
    await platformDatabase.destroy();
    platformDatabase = null;
  }
  bootstrapped = false;
}

export async function createApplicationDatabase() {
  const databaseName = platformDatabaseName();
  console.info(
    `[database] ensuring Trades database "${databaseName}" on ${env.DB_HOST}:${env.DB_PORT}`
  );
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.info(`[database] Trades database ready: "${databaseName}"`);
  } finally {
    await connection.end();
  }
}

export async function migratePlatformDatabase() {
  console.info(`[database] migrating platform database "${platformDatabaseName()}"`);
  const database = getPlatformDatabase();
  await database.schema
    .createTable("trades_migrations")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(160)", (col) => col.notNull().unique())
    .addColumn("applied_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  for (const step of applicationMigrationSteps) {
    await step.migrate(database);
    await database.insertInto("trades_migrations").ignore().values({ name: step.name }).execute();
    console.info(`[database] platform migration applied: ${step.name}`);
  }

  await database
    .insertInto("trades_migrations")
    .ignore()
    .values([
      { name: "001_platform_foundation" },
      { name: "005_database_maintenance_run_lifecycle" }
    ])
    .execute();
  console.info("[database] platform migration applied: 001_platform_foundation");
}

export async function seedPlatformDatabase() {
  const database = getPlatformDatabase();
  for (const step of applicationSeedSteps) {
    await step.seed(database);
    console.info(`[seeder] platform module seeded: ${step.name}`);
  }
}

export async function resetPlatformDatabases() {
  assertDestructiveDatabaseAction("fresh database startup");
  console.warn(`
DATABASE WARNING
Fresh database mode is enabled. TRADES will drop its configured application database, then recreate and seed it.
`);
  await dropPlatformDatabases();
  await createApplicationDatabase();
  await migratePlatformDatabase();
  await seedPlatformDatabase();
  bootstrapped = true;
}

export async function dropPlatformDatabases() {
  assertDestructiveDatabaseAction("drop database");
  await closePlatformDatabase();

  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });

  try {
    const databaseName = platformDatabaseName();
    console.warn(`[database] dropping Trades database "${databaseName}"`);
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
  } finally {
    await connection.end();
  }

  bootstrapped = false;
}

function assertDestructiveDatabaseAction(action: string) {
  if (env.TRADES_DB_RESET_CONFIRM !== "DROP_DATABASES") {
    throw new Error(
      `${action} refused. Set TRADES_DB_RESET_CONFIRM=DROP_DATABASES only when you intentionally want to delete configured databases.`
    );
  }

  if (env.NODE_ENV === "production" && env.TRADES_ALLOW_PRODUCTION_DB_RESET !== "1") {
    throw new Error(
      `${action} refused in production. Set TRADES_ALLOW_PRODUCTION_DB_RESET=1 and TRADES_DB_RESET_CONFIRM=DROP_DATABASES to continue.`
    );
  }
}
