import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  seedCoreTenantDatabase
} from "@codexsun/core-api";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";
import { migrateDepositModule, seedDepositModule } from "../modules/deposit/index.js";
import { migratePaymentModule, seedPaymentModule } from "../modules/payment/index.js";
import { migrateBankAccountModule, seedBankAccountModule } from "../modules/bank-account/index.js";
import { migrateCommissionModule, seedCommissionModule } from "../modules/commission/index.js";

export function tenantDatabaseMigrationsFor(_tenant: Tenant) {
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    {
      description: "Bank accounts, statements, transfers, and reconciliation.",
      name: "trades.bank-account",
      statements: ["RUN trades.bank-account"]
    },
    {
      description: "Deposit transactions.",
      name: "trades.deposit",
      statements: ["RUN trades.deposit"]
    },
    {
      description: "Payment transactions.",
      name: "trades.payment",
      statements: ["RUN trades.payment"]
    },
    {
      description: "Common percentage variants and transaction confirmation commissions.",
      name: "trades.commission",
      statements: ["RUN trades.commission"]
    },
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    }))
  ];
}

export async function migrateSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const provisionedApps = ["application"];

  await migrateBankAccountModule(_database);
  provisionedApps.push("bank-account");
  await migrateDepositModule(_database);
  provisionedApps.push("deposit");
  await migratePaymentModule(_database);
  provisionedApps.push("payment");
  await migrateCommissionModule(_database);
  provisionedApps.push("commission");
  await migrateCoreTenantDatabase(tenant.dbName);
  provisionedApps.push("core");

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const seededApps = ["application"];

  await seedBankAccountModule(_database);
  seededApps.push("bank-account");
  await seedDepositModule(_database);
  seededApps.push("deposit");
  await seedPaymentModule(_database);
  seededApps.push("payment");
  await seedCommissionModule(_database);
  seededApps.push("commission");
  await seedCoreTenantDatabase(tenant.dbName);
  seededApps.push("core");

  return { seededApps };
}

export async function provisionSelectedTenantApps(
  database: Kysely<TenantDatabase>,
  tenant: Tenant
) {
  const migrated = await migrateSelectedTenantApps(database, tenant);
  const seeded = await seedSelectedTenantApps(database, tenant);
  return { ...migrated, ...seeded };
}
