import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const paymentSeed = {
  description: "Reconcile stored payment commission amounts with their percentage summaries.",
  key: "trades.payment.seed"
};

export function seedPaymentModule(database: Kysely<TenantDatabase>) {
  return sql`
    UPDATE payment_commissions commission
    INNER JOIN payments payment ON payment.id=commission.payment_id
    SET commission.amount_1=ROUND(payment.amount*commission.percentage_1/100,2),
        commission.amount_2=ROUND(payment.amount*commission.percentage_2/100,2),
        commission.amount_3=ROUND(payment.amount*commission.percentage_3/100,2)
  `.execute(database);
}
