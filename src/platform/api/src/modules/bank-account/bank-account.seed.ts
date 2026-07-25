import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const bankAccountSeed = {
  description: "Migrate legacy transaction bank labels and ensure opening statement entries.",
  key: "trades.bank-account.seed"
};

export async function seedBankAccountModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `
    INSERT INTO bank_accounts (uuid,code,account_name,bank_name,ifsc,branch,opening_balance,status)
    SELECT LEFT(SHA2(CONCAT('legacy-bank:',legacy.bank),256),8),
      CONCAT('LEG-',UPPER(LEFT(SHA2(legacy.bank,256),6))),legacy.bank,legacy.bank,'UNKNOWN','Migrated',0,'active'
    FROM (
      SELECT DISTINCT bank FROM deposits WHERE bank<>''
      UNION SELECT DISTINCT bank FROM payments WHERE bank<>''
    ) legacy
    LEFT JOIN bank_accounts account ON LOWER(account.account_name)=LOWER(legacy.bank)
    WHERE account.id IS NULL
    ON DUPLICATE KEY UPDATE uuid=VALUES(uuid)
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    UPDATE deposits transaction_row
    INNER JOIN bank_accounts account ON LOWER(account.account_name)=LOWER(transaction_row.bank)
    SET transaction_row.bank_account_id=account.id
    WHERE transaction_row.bank_account_id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    UPDATE payments transaction_row
    INNER JOIN bank_accounts account ON LOWER(account.account_name)=LOWER(transaction_row.bank)
    SET transaction_row.bank_account_id=account.id
    WHERE transaction_row.bank_account_id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,source_module,source_record_id)
    SELECT LEFT(SHA2(CONCAT('deposit:',transaction_row.uuid),256),8),transaction_row.bank_account_id,
      transaction_row.transaction_date,'deposit','debit',transaction_row.amount,transaction_row.reference,
      CONCAT('Deposit ',transaction_row.reference,' - ',transaction_row.name),'deposit',transaction_row.id
    FROM deposits transaction_row
    LEFT JOIN bank_ledger_entries entry ON entry.source_module='deposit' AND entry.source_record_id=transaction_row.id
    WHERE transaction_row.bank_account_id IS NOT NULL AND entry.id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,source_module,source_record_id)
    SELECT LEFT(SHA2(CONCAT('payment:',transaction_row.uuid),256),8),transaction_row.bank_account_id,
      transaction_row.transaction_date,'payment','credit',transaction_row.amount,transaction_row.reference,
      CONCAT('Payment ',transaction_row.reference,' - ',transaction_row.name),'payment',transaction_row.id
    FROM payments transaction_row
    LEFT JOIN bank_ledger_entries entry ON entry.source_module='payment' AND entry.source_record_id=transaction_row.id
    WHERE transaction_row.bank_account_id IS NOT NULL AND entry.id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration)
    SELECT LEFT(SHA2(CONCAT('opening:',account.uuid),256),8),account.id,CURRENT_DATE,'opening',
      CASE WHEN account.opening_balance>=0 THEN 'debit' ELSE 'credit' END,ABS(account.opening_balance),
      CONCAT('OPEN-',account.code),'Opening balance'
    FROM bank_accounts account
    LEFT JOIN bank_ledger_entries entry ON entry.bank_account_id=account.id AND entry.entry_type='opening'
    WHERE account.opening_balance<>0 AND entry.id IS NULL
  `
    )
    .execute(database);
}
