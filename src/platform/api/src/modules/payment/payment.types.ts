import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type PaymentStatus = "active" | "inactive";
export type Payment = {
  amount: number;
  bank: string;
  bankAccountId: number | null;
  bankCode: string | null;
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
  bankAccountId: number;
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

export type PaymentPersistencePayload = PaymentSavePayload & { bank: string; bankCode: string };
