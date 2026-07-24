import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const depositMigration = {
  description: "Deposit transactions and their commission summaries.",
  key: "trades.deposit"
};

export async function migrateDepositModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS deposits (
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
        UNIQUE KEY deposits_uuid_unique (uuid),
        UNIQUE KEY deposits_reference_unique (reference),
        KEY deposits_date_index (transaction_date),
        KEY deposits_tg_code_index (tg_code)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);

  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS deposit_commissions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL,
        deposit_id INT NOT NULL,
        mode VARCHAR(24) NOT NULL DEFAULT 'deposit',
        percentage_1 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_1 DECIMAL(18,2) NOT NULL DEFAULT 0,
        percentage_2 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_2 DECIMAL(18,2) NOT NULL DEFAULT 0,
        percentage_3 DECIMAL(8,4) NOT NULL DEFAULT 0,
        amount_3 DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY deposit_commissions_uuid_unique (uuid),
        UNIQUE KEY deposit_commissions_deposit_unique (deposit_id),
        CONSTRAINT deposit_commissions_deposit_fk
          FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);
}
