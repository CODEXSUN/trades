import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const paymentMigration = {
  description: "Outgoing payments and their commission summaries.",
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

  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS payment_commissions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL,
        payment_id INT NOT NULL,
        mode VARCHAR(24) NOT NULL DEFAULT 'receipt',
        percentage_1 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_1 DECIMAL(18,2) NOT NULL DEFAULT 0,
        percentage_2 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_2 DECIMAL(18,2) NOT NULL DEFAULT 0,
        percentage_3 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_3 DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY payment_commissions_uuid_unique (uuid),
        UNIQUE KEY payment_commissions_payment_unique (payment_id),
        CONSTRAINT payment_commissions_payment_fk
          FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);
}
