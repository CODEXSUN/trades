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

export function tenantDatabaseMigrationsFor(_tenant: Tenant) {
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    {
      description: "Deposit transactions and commission summaries.",
      name: "trades.deposit",
      statements: ["RUN trades.deposit"]
    },
    {
      description: "Payment transactions and commission summaries.",
      name: "trades.payment",
      statements: ["RUN trades.payment"]
    },
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    }))
  ];
}

export async function migrateSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const provisionedApps = ["application"];

  await migrateDepositModule(_database);
  provisionedApps.push("deposit");
  await migratePaymentModule(_database);
  provisionedApps.push("payment");
  await migrateCoreTenantDatabase(tenant.dbName);
  provisionedApps.push("core");

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const seededApps = ["application"];

  await seedDepositModule(_database);
  seededApps.push("deposit");
  await seedPaymentModule(_database);
  seededApps.push("payment");
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
