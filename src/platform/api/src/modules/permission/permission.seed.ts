import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

const permissionKeys = [
  "identity.user.view",
  "identity.user.create",
  "identity.user.update",
  "identity.user.suspend",
  "identity.user.delete",
  "identity.role.view",
  "identity.role.create",
  "identity.role.update",
  "identity.role.suspend",
  "identity.role.delete",
  "identity.permission.view",
  "identity.permission.create",
  "identity.permission.update",
  "identity.permission.suspend",
  "identity.permission.delete",
  "identity.user-role.view",
  "identity.user-role.assign",
  "identity.user-role.update",
  "identity.user-role.remove",
  "identity.role-permission.view",
  "identity.role-permission.assign",
  "identity.role-permission.update",
  "identity.role-permission.remove",
  "trades.bank-account.view",
  "trades.bank-account.create",
  "trades.bank-account.update",
  "trades.bank-account.lifecycle",
  "trades.bank-account.entry",
  "trades.bank-account.transfer",
  "trades.bank-account.reconcile",
  "trades.bank-account.delete",
  "trades.deposit.view",
  "trades.deposit.create",
  "trades.deposit.update",
  "trades.deposit.lifecycle",
  "trades.deposit.delete",
  "trades.payment.view",
  "trades.payment.create",
  "trades.payment.update",
  "trades.payment.lifecycle",
  "trades.payment.delete",
  "trades.commission.view",
  "trades.commission.create",
  "trades.commission.update",
  "trades.commission.configure",
  "trades.commission.verify",
  "trades.commission.settle",
  "trades.commission.delete"
] as const;

export async function seedPermissionModule(database: Kysely<TradesDatabase>) {
  for (const key of permissionKeys) {
    const label = key
      .split(".")
      .map((part) => part.replaceAll("-", " "))
      .join(" · ");
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${label.toLowerCase()} in Trades.`,
        is_protected: true,
        key,
        label,
        status: "active",
        uuid: stable(key)
      })
      .onDuplicateKeyUpdate({
        description: `Allows ${label.toLowerCase()} in Trades.`,
        is_protected: true,
        label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
