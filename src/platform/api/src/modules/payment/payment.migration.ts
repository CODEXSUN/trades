import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const paymentMigration = {
  description: "Outgoing payment transactions.",
  key: "trades.payment"
};

export async function migratePaymentModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL,
        transaction_date DATE NOT NULL,
        tg_code VARCHAR(80) NOT NULL,
        bank_account_id INT NULL,
        bank VARCHAR(180) NOT NULL,
        name VARCHAR(200) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        reference VARCHAR(180) NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY payments_uuid_unique (uuid),
        UNIQUE KEY payments_reference_unique (reference),
        KEY payments_date_index (transaction_date),
        KEY payments_tg_code_index (tg_code)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);

  await ensureBankAccountLink(
    database,
    "payments",
    "payments_bank_account_index",
    "payments_bank_account_fk"
  );
}

async function ensureBankAccountLink(
  database: Kysely<TenantDatabase>,
  table: string,
  index: string,
  constraint: string
) {
  const column = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME='bank_account_id'
  `.execute(database);
  if (Number(column.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw(`ALTER TABLE ${table} ADD COLUMN bank_account_id INT NULL AFTER tg_code`)
      .execute(database);
  }
  const key = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND INDEX_NAME=${index}
  `.execute(database);
  if (Number(key.rows[0]?.count ?? 0) === 0) {
    await sql.raw(`ALTER TABLE ${table} ADD KEY ${index} (bank_account_id)`).execute(database);
  }
  const foreignKey = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND CONSTRAINT_NAME=${constraint}
  `.execute(database);
  if (Number(foreignKey.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw(
        `ALTER TABLE ${table} ADD CONSTRAINT ${constraint} FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)`
      )
      .execute(database);
  }
}
