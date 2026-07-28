import { sql, type Kysely } from "kysely";
import {
  bankAccountMigration,
  migrateBankAccountModule,
  seedBankAccountModule
} from "../modules/bank-account/index.js";
import {
  commissionMigration,
  migrateCommissionModule,
  seedCommissionModule
} from "../modules/commission/index.js";
import {
  depositMigration,
  migrateDepositModule,
  seedDepositModule
} from "../modules/deposit/index.js";
import {
  migratePaymentModule,
  paymentMigration,
  seedPaymentModule
} from "../modules/payment/index.js";
import { renameLegacyTradesTable, tableExists } from "./database-utils.js";
import type { TradesDatabase } from "./schema.js";

export const tradesMigrations = Object.freeze([
  bankAccountMigration,
  depositMigration,
  paymentMigration,
  commissionMigration
]);

export const tradesSeeders = Object.freeze([
  "trades.bank-account.seed",
  "trades.deposit.seed",
  "trades.payment.seed",
  "trades.commission.seed"
]);

export async function migrateTradesDatabase(database: Kysely<TradesDatabase>) {
  await renameLegacyTradesTables(database);
  await ensureMigrationTable(database);
  for (const [migration, migrate] of [
    [bankAccountMigration, migrateBankAccountModule],
    [depositMigration, migrateDepositModule],
    [paymentMigration, migratePaymentModule],
    [commissionMigration, migrateCommissionModule]
  ] as const) {
    await migrate(database);
    await sql`
      INSERT IGNORE INTO schema_migrations (package_id, name)
      VALUES ('@codexsun/trades', ${migration.key})
    `.execute(database);
  }
}

export async function seedTradesDatabase(database: Kysely<TradesDatabase>) {
  await seedBankAccountModule(database);
  await seedDepositModule(database);
  await seedPaymentModule(database);
  await seedCommissionModule(database);
}

export async function bootstrapTradesDatabase(database: Kysely<TradesDatabase>) {
  await migrateTradesDatabase(database);
  await seedTradesDatabase(database);
}

export const tradesDatabaseLifecycle = Object.freeze({
  migrations: Object.freeze(tradesMigrations.map(({ key }) => key)),
  packageId: "@codexsun/trades",
  seeders: tradesSeeders,
  async runSql({ database }: { database: unknown }) {
    await bootstrapTradesDatabase(database as Kysely<TradesDatabase>);
  }
});

async function ensureMigrationTable(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      "CREATE TABLE IF NOT EXISTS schema_migrations (" +
        "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
        "package_id VARCHAR(160) NOT NULL DEFAULT 'legacy'," +
        "name VARCHAR(160) NOT NULL UNIQUE," +
        "applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" +
        ") CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    .execute(database);
  await sql`
    ALTER TABLE schema_migrations
    ADD COLUMN IF NOT EXISTS package_id VARCHAR(160) NOT NULL DEFAULT 'legacy' AFTER id
  `.execute(database);
  if (await tableExists(database, "trades_migrations")) {
    await sql`
      INSERT IGNORE INTO schema_migrations (package_id, name, applied_at)
      SELECT '@codexsun/trades', name, applied_at
      FROM trades_migrations
    `.execute(database);
    await sql`DROP TABLE trades_migrations`.execute(database);
  }
  await sql`
    UPDATE schema_migrations
    SET package_id = '@codexsun/trades'
    WHERE package_id = 'legacy' AND name LIKE 'trades.%'
  `.execute(database);
}

async function renameLegacyTradesTables(database: Kysely<TradesDatabase>) {
  const tables = [
    ["bank_accounts", "trades_bank_accounts"],
    ["bank_ledger_entries", "trades_bank_ledger_entries"],
    ["deposits", "trades_deposits"],
    ["payments", "trades_payments"],
    ["commission_variants", "trades_commission_variants"],
    ["commission_entries", "trades_commission_entries"],
    ["commission_entry_lines", "trades_commission_entry_lines"]
  ] as const;
  for (const [legacyName, ownedName] of tables) {
    await renameLegacyTradesTable(database, legacyName, ownedName);
  }
}
