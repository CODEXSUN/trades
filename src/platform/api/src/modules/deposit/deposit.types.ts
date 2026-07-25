import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type DepositStatus = "active" | "inactive";
export type Deposit = {
  amount: number;
  bank: string;
  bankAccountId: number | null;
  bankCode: string | null;
  date: string;
  id: number;
  name: string;
  reference: string;
  status: DepositStatus;
  tgCode: string;
  uuid: string;
};

export type DepositSavePayload = {
  amount: number;
  bankAccountId: number;
  date: string;
  name: string;
  reference: string;
  status: DepositStatus;
  tgCode: string;
};

export type DepositListFilters = { search?: string };

export type DepositContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};

export type DepositPersistencePayload = DepositSavePayload & { bank: string; bankCode: string };
