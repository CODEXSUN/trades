import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type PaymentStatus = "active" | "inactive";
export type PaymentCommissionMode = "deposit" | "receipt";

export type PaymentCommission = {
  amount1: number;
  amount2: number;
  amount3: number;
  id: number;
  mode: PaymentCommissionMode;
  paymentId: number;
  percentage1: number;
  percentage2: number;
  percentage3: number;
  uuid: string;
};

export type Payment = {
  amount: number;
  bank: string;
  date: string;
  id: number;
  name: string;
  reference: string;
  status: PaymentStatus;
  tgCode: string;
  uuid: string;
};

export type PaymentSavePayload = {
  amount: number;
  bank: string;
  date: string;
  name: string;
  reference: string;
  status: PaymentStatus;
  tgCode: string;
};

export type PaymentListFilters = { search?: string };

export type PaymentContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};

export type PaymentPersistencePayload = PaymentSavePayload;
