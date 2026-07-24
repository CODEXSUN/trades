import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const depositSeed = {
  description: "Reconcile stored deposit commission amounts with their percentage summaries.",
  key: "trades.deposit.seed"
};

export function seedDepositModule(database: Kysely<TenantDatabase>) {
  return sql`
    UPDATE deposit_commissions commission
    INNER JOIN deposits deposit ON deposit.id=commission.deposit_id
    SET commission.amount_1=ROUND(deposit.amount*commission.percentage_1/100,2),
        commission.amount_2=ROUND(deposit.amount*commission.percentage_2/100,2),
        commission.amount_3=ROUND(deposit.amount*commission.percentage_3/100,2)
  `.execute(database);
}
