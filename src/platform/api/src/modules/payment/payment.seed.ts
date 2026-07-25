import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const paymentSeed = {
  description: "Normalize persisted payment transaction codes.",
  key: "trades.payment.seed"
};

export function seedPaymentModule(database: Kysely<TenantDatabase>) {
  return sql`
    UPDATE payments SET tg_code=UPPER(TRIM(tg_code)),reference=TRIM(reference)
  `.execute(database);
}
