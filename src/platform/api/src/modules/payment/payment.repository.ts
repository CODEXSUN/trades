import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import { deleteBankLedgerSourceEntry, syncBankLedgerSourceEntry } from "../bank-account/index.js";
import { deleteCommissionSourceEntry, syncCommissionSourceEntry } from "../commission/index.js";
import type {
  Payment,
  PaymentListFilters,
  PaymentPersistencePayload,
  PaymentStatus
} from "./payment.types.js";

type PaymentRow = {
  amount: number | string;
  bank: string;
  bank_account_id: number | null;
  bank_code: string | null;
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
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.bank_account_id,ba.code bank_code,p.name,p.amount,p.reference,p.status
      FROM payments p
      LEFT JOIN bank_accounts ba ON ba.id=p.bank_account_id
      WHERE (${filters.search ?? ""}='' OR LOWER(p.tg_code) LIKE ${term}
        OR LOWER(p.bank) LIKE ${term} OR LOWER(p.name) LIKE ${term}
        OR LOWER(p.reference) LIKE ${term})
      ORDER BY p.transaction_date DESC,p.id DESC
    `.execute(this.database);
    return result.rows.map(mapPayment);
  }

  async find(id: string | number) {
    const result = await sql<PaymentRow>`
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.bank_account_id,ba.code bank_code,p.name,p.amount,p.reference,p.status
      FROM payments p
      LEFT JOIN bank_accounts ba ON ba.id=p.bank_account_id
      WHERE p.id=${Number(id)} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async create(input: PaymentPersistencePayload, uuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO payments
          (uuid,transaction_date,tg_code,bank_account_id,bank,name,amount,reference,status)
        VALUES
          (${uuid},${input.date},${input.tgCode},${input.bankAccountId},${input.bank},${input.name},${input.amount},${input.reference},${input.status})
      `.execute(transaction);
      const paymentId = Number(result.insertId);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "credit",
        entryType: "payment",
        narration: `Payment ${input.reference} · ${input.name}`,
        reference: input.reference,
        sourceModule: "payment",
        sourceRecordId: paymentId
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "withdraw",
        name: input.name,
        reference: input.reference,
        sourceRecordId: paymentId,
        tgCode: input.tgCode
      });
      return (await new PaymentRepository(transaction).find(paymentId))!;
    });
  }

  async update(id: number, input: PaymentPersistencePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE payments SET transaction_date=${input.date},tg_code=${input.tgCode},
          bank_account_id=${input.bankAccountId},bank=${input.bank},name=${input.name},amount=${input.amount},
          reference=${input.reference},status=${input.status}
        WHERE id=${id}
      `.execute(transaction);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "credit",
        entryType: "payment",
        narration: `Payment ${input.reference} · ${input.name}`,
        reference: input.reference,
        sourceModule: "payment",
        sourceRecordId: id
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "withdraw",
        name: input.name,
        reference: input.reference,
        sourceRecordId: id,
        tgCode: input.tgCode
      });
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
      await deleteBankLedgerSourceEntry(transaction, "payment", id);
      await deleteCommissionSourceEntry(transaction, "withdraw", id);
      await sql`DELETE FROM payments WHERE id=${id}`.execute(transaction);
    });
    return record;
  }
}

function mapPayment(row: PaymentRow): Payment {
  return {
    amount: Number(row.amount),
    bank: row.bank,
    bankAccountId: row.bank_account_id ? Number(row.bank_account_id) : null,
    bankCode: row.bank_code,
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
