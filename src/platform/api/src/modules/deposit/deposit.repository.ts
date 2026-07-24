import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  Deposit,
  DepositListFilters,
  DepositPersistencePayload,
  DepositStatus
} from "./deposit.types.js";

type DepositRow = {
  amount: number | string;
  bank: string;
  id: number;
  name: string;
  reference: string;
  status: DepositStatus;
  tg_code: string;
  transaction_date: Date | string;
  uuid: string;
};

export class DepositRepository {
  constructor(private readonly database: Kysely<TenantDatabase>) {}

  async list(filters: DepositListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const result = await sql<DepositRow>`
      SELECT d.id,d.uuid,d.transaction_date,d.tg_code,d.bank,d.name,d.amount,d.reference,d.status
      FROM deposits d
      WHERE (${filters.search ?? ""}='' OR LOWER(d.tg_code) LIKE ${term}
        OR LOWER(d.bank) LIKE ${term} OR LOWER(d.name) LIKE ${term}
        OR LOWER(d.reference) LIKE ${term})
      ORDER BY d.transaction_date DESC,d.id DESC
    `.execute(this.database);
    return result.rows.map(mapDeposit);
  }

  async find(id: string | number) {
    const result = await sql<DepositRow>`
      SELECT d.id,d.uuid,d.transaction_date,d.tg_code,d.bank,d.name,d.amount,d.reference,d.status
      FROM deposits d
      WHERE d.id=${Number(id)} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? mapDeposit(result.rows[0]) : null;
  }

  async create(input: DepositPersistencePayload, uuid: string, commissionUuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO deposits
          (uuid,transaction_date,tg_code,bank,name,amount,reference,status)
        VALUES
          (${uuid},${input.date},${input.tgCode},${input.bank},${input.name},${input.amount},${input.reference},${input.status})
      `.execute(transaction);
      const depositId = Number(result.insertId);
      await sql`
        INSERT INTO deposit_commissions
          (uuid,deposit_id,mode,percentage_1,amount_1,percentage_2,amount_2,percentage_3,amount_3)
        VALUES
          (${commissionUuid},${depositId},'deposit',0,0,0,0,0,0)
      `.execute(transaction);
      return (await new DepositRepository(transaction).find(depositId))!;
    });
  }

  async update(id: number, input: DepositPersistencePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE deposits SET transaction_date=${input.date},tg_code=${input.tgCode},
          bank=${input.bank},name=${input.name},amount=${input.amount},
          reference=${input.reference},status=${input.status}
        WHERE id=${id}
      `.execute(transaction);
      return new DepositRepository(transaction).find(id);
    });
  }

  async setStatus(id: number, status: DepositStatus) {
    await sql`UPDATE deposits SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await this.database.transaction().execute(async (transaction) => {
      await sql`DELETE FROM deposit_commissions WHERE deposit_id=${id}`.execute(transaction);
      await sql`DELETE FROM deposits WHERE id=${id}`.execute(transaction);
    });
    return record;
  }
}

function mapDeposit(row: DepositRow): Deposit {
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
