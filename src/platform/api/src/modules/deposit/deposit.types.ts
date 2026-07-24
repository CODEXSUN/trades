import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type DepositStatus = "active" | "inactive";
export type DepositCommissionMode = "deposit" | "receipt";

export type DepositCommission = {
  amount1: number;
  amount2: number;
  amount3: number;
  depositId: number;
  id: number;
  mode: DepositCommissionMode;
  percentage1: number;
  percentage2: number;
  percentage3: number;
  uuid: string;
};

export type Deposit = {
  amount: number;
  bank: string;
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
  bank: string;
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

export type DepositPersistencePayload = DepositSavePayload;
