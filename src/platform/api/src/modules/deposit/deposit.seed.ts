import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const depositSeed = {
  description: "Normalize persisted deposit transaction codes.",
  key: "trades.deposit.seed"
};

export function seedDepositModule(database: Kysely<TenantDatabase>) {
  return sql`
    UPDATE deposits SET tg_code=UPPER(TRIM(tg_code)),reference=TRIM(reference)
  `.execute(database);
}
