import { existsSync, writeFileSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { createPool, type PoolOptions } from "mysql2";
import { Kysely, MysqlDialect, sql } from "kysely";
import { env } from "../env.js";
import { migrateBankAccountModule } from "../modules/bank-account/bank-account.migration.js";
import { seedBankAccountModule } from "../modules/bank-account/bank-account.seed.js";
import { migrateCommissionModule } from "../modules/commission/commission.migration.js";
import { seedCommissionModule } from "../modules/commission/commission.seed.js";
import { migrateDepositModule } from "../modules/deposit/deposit.migration.js";
import { seedDepositModule } from "../modules/deposit/deposit.seed.js";
import { migratePaymentModule } from "../modules/payment/payment.migration.js";
import { seedPaymentModule } from "../modules/payment/payment.seed.js";
import { migratePermissionModule } from "../modules/permission/permission.migration.js";
import { seedPermissionModule } from "../modules/permission/permission.seed.js";
import { migrateRoleModule } from "../modules/role/role.migration.js";
import { seedRoleModule } from "../modules/role/role.seed.js";
import { migrateUserModule } from "../modules/user/user.migration.js";
import { seedUserModule } from "../modules/user/user.seed.js";
import { migrateUserRoleModule } from "../modules/user-role/user-role.migration.js";
import { seedUserRoleModule } from "../modules/user-role/user-role.seed.js";
import { migrateRolePermissionModule } from "../modules/role-permission/role-permission.migration.js";
import { seedRolePermissionModule } from "../modules/role-permission/role-permission.seed.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { TradesDatabase } from "./schema.js";

let database: Kysely<TradesDatabase> | null = null;
let bootstrapped = false;

export const tradesMigrationOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission",
  "trades.bank-account",
  "trades.deposit",
  "trades.payment",
  "trades.commission"
]);

export const tradesSeedOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission",
  "trades.deposit",
  "trades.payment",
  "trades.bank-account",
  "trades.commission"
]);

export function tradesDatabaseName() {
  return assertDatabaseName(env.DB_NAME, "Trades database name");
}

export function tradesDatabaseConfig() {
  return {
    database: tradesDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  };
}

export function getTradesDatabase() {
  if (!database) {
    database = new Kysely<TradesDatabase>({
      dialect: new MysqlDialect({
        pool: createPool({
          ...tradesDatabaseConfig(),
          connectionLimit: 10,
          timezone: "Z"
        } satisfies PoolOptions)
      })
    });
  }
  return database;
}

export async function bootstrapTradesDatabase() {
  if (bootstrapped || process.env.TRADES_DEV_SKIP_DB === "1") return;
  if (env.TRADES_DB_FRESH_ON_START === "1") {
    const sessionFile = process.env.TRADES_DB_FRESH_SESSION_FILE;
    if (!sessionFile || !existsSync(sessionFile)) {
      await resetTradesDatabase();
      if (sessionFile) writeFileSync(sessionFile, new Date().toISOString(), "utf8");
      return;
    }
  }
  await createTradesDatabase();
  await migrateTradesDatabase();
  await seedTradesDatabase();
  bootstrapped = true;
  console.info(`[database] Trades database ready: "${tradesDatabaseName()}"`);
}

export async function createTradesDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(tradesDatabaseName())} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export async function migrateTradesDatabase() {
  const db = getTradesDatabase();
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(db);
  await migrateRoleModule(db);
  await migratePermissionModule(db);
  await migrateUserModule(db);
  await migrateUserRoleModule(db);
  await migrateRolePermissionModule(db);
  await migrateBankAccountModule(db);
  await migrateDepositModule(db);
  await migratePaymentModule(db);
  await migrateCommissionModule(db);
  await recordBusinessMigrations(db);
}

export async function seedTradesDatabase() {
  const db = getTradesDatabase();
  await seedRoleModule(db);
  await seedPermissionModule(db);
  await seedUserModule(db);
  await seedUserRoleModule(db);
  await seedRolePermissionModule(db);
  await seedDepositModule(db);
  await seedPaymentModule(db);
  await seedBankAccountModule(db);
  await seedCommissionModule(db);
}

async function recordBusinessMigrations(db: Kysely<TradesDatabase>) {
  await db
    .insertInto("schema_migrations")
    .ignore()
    .values(
      ["trades.bank-account", "trades.deposit", "trades.payment", "trades.commission"].map(
        (name) => ({ name })
      )
    )
    .execute();
}

export async function closeTradesDatabase() {
  if (database) await database.destroy();
  database = null;
  bootstrapped = false;
}

export async function resetTradesDatabase() {
  assertDestructiveDatabaseAction();
  await closeTradesDatabase();
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(tradesDatabaseName())}`);
  } finally {
    await connection.end();
  }
  await createTradesDatabase();
  await migrateTradesDatabase();
  await seedTradesDatabase();
  bootstrapped = true;
}

function assertDestructiveDatabaseAction() {
  if (env.TRADES_DB_RESET_CONFIRM !== "DROP_DATABASE") {
    throw new Error(
      "Set TRADES_DB_RESET_CONFIRM=DROP_DATABASE to reset the Trades database."
    );
  }
  if (env.NODE_ENV === "production" && env.TRADES_ALLOW_PRODUCTION_DB_RESET !== "1") {
    throw new Error("Production database reset is disabled.");
  }
}
