import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  Payment,
  PaymentListFilters,
  PaymentPersistencePayload,
  PaymentStatus
} from "./payment.types.js";

type PaymentRow = {
  amount: number | string;
  bank: string;
  id: number;
  name: string;
  reference: string;
  status: PaymentStatus;
  tg_code: string;
  transaction_date: Date | string;
  uuid: string;
};

export class PaymentRepository {
  constructor(private readonly database: Kysely<TenantDatabase>) {}

  async list(filters: PaymentListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const result = await sql<PaymentRow>`
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.name,p.amount,p.reference,p.status
      FROM payments p
      WHERE (${filters.search ?? ""}='' OR LOWER(p.tg_code) LIKE ${term}
        OR LOWER(p.bank) LIKE ${term} OR LOWER(p.name) LIKE ${term}
        OR LOWER(p.reference) LIKE ${term})
      ORDER BY p.transaction_date DESC,p.id DESC
    `.execute(this.database);
    return result.rows.map(mapPayment);
  }

  async find(id: string | number) {
    const result = await sql<PaymentRow>`
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.name,p.amount,p.reference,p.status
      FROM payments p
      WHERE p.id=${Number(id)} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async create(input: PaymentPersistencePayload, uuid: string, commissionUuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO payments
          (uuid,transaction_date,tg_code,bank,name,amount,reference,status)
        VALUES
          (${uuid},${input.date},${input.tgCode},${input.bank},${input.name},${input.amount},${input.reference},${input.status})
      `.execute(transaction);
      const paymentId = Number(result.insertId);
      await sql`
        INSERT INTO payment_commissions
          (uuid,payment_id,mode,percentage_1,amount_1,percentage_2,amount_2,percentage_3,amount_3)
        VALUES
          (${commissionUuid},${paymentId},'receipt',0,0,0,0,0,0)
      `.execute(transaction);
      return (await new PaymentRepository(transaction).find(paymentId))!;
    });
  }

  async update(id: number, input: PaymentPersistencePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE payments SET transaction_date=${input.date},tg_code=${input.tgCode},
          bank=${input.bank},name=${input.name},amount=${input.amount},
          reference=${input.reference},status=${input.status}
        WHERE id=${id}
      `.execute(transaction);
      return new PaymentRepository(transaction).find(id);
    });
  }

  async setStatus(id: number, status: PaymentStatus) {
    await sql`UPDATE payments SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await this.database.transaction().execute(async (transaction) => {
      await sql`DELETE FROM payment_commissions WHERE payment_id=${id}`.execute(transaction);
      await sql`DELETE FROM payments WHERE id=${id}`.execute(transaction);
    });
    return record;
  }
}

function mapPayment(row: PaymentRow): Payment {
  return {
    amount: Number(row.amount),
    bank: row.bank,
    date: toDate(row.transaction_date),
    id: Number(row.id),
    name: row.name,
    reference: row.reference,
    status: row.status,
    tgCode: row.tg_code,
    uuid: row.uuid
  };
}

function toDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
