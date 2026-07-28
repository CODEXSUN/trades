import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type TradesDatabase = {
  trades_bank_accounts: BankAccountsTable;
  trades_bank_ledger_entries: BankLedgerEntriesTable;
  trades_commission_entries: CommissionEntriesTable;
  trades_commission_entry_lines: CommissionEntryLinesTable;
  trades_commission_variants: CommissionVariantsTable;
  trades_deposits: DepositsTable;
  trades_payments: PaymentsTable;
  schema_migrations: SchemaMigrationsTable;
};

export type DepositsTable = {
  amount: number | string;
  bank: string;
  bank_account_id: number | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  reference: string;
  status: "active" | "inactive";
  tg_code: string;
  transaction_date: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type PaymentsTable = DepositsTable;

export type CommissionVariantsTable = {
  code: string;
  created_at: TimestampColumn;
  display_order: number;
  id: Generated<number>;
  name: string;
  percentage: number | string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type CommissionEntriesTable = {
  amount: number | string;
  created_at: TimestampColumn;
  direction: "deposit" | "withdraw";
  id: Generated<number>;
  name: string;
  reference: string;
  settled_at: TimestampColumn | null;
  settled_by: string | null;
  source_record_id: number;
  tg_code: string;
  transaction_date: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type CommissionEntryLinesTable = {
  amount: number | string;
  commission_entry_id: number;
  commission_variant_id: number;
  created_at: TimestampColumn;
  id: Generated<number>;
  percentage: number | string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type BankAccountsTable = {
  account_name: string;
  bank_name: string;
  branch: string;
  code: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  ifsc: string;
  opening_balance: number | string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type BankLedgerEntriesTable = {
  amount: number | string;
  bank_account_id: number;
  counterparty_bank_account_id: number | null;
  created_at: TimestampColumn;
  direction: "credit" | "debit";
  entry_type:
    | "cash_deposit"
    | "cash_withdrawal"
    | "deposit"
    | "opening"
    | "payment"
    | "transfer_in"
    | "transfer_out";
  id: Generated<number>;
  narration: string;
  reconciled_at: TimestampColumn | null;
  reconciled_by: string | null;
  reference: string;
  source_module: "deposit" | "payment" | null;
  source_record_id: number | null;
  transaction_date: string;
  transfer_uuid: string | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type SchemaMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  package_id: string;
};
