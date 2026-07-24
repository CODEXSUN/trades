import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { PaymentRepository } from "./payment.repository.js";
import type {
  Payment,
  PaymentContext,
  PaymentListFilters,
  PaymentPersistencePayload,
  PaymentSavePayload,
  PaymentStatus
} from "./payment.types.js";

export class PaymentService {
  private readonly repository: PaymentRepository;

  constructor(private readonly context: PaymentContext) {
    this.repository = new PaymentRepository(context.database);
  }

  async list(filters: PaymentListFilters = {}) {
    await this.context.authorize("platform.trades.payment.view");
    return this.repository.list(filters);
  }

  async get(id: string) {
    await this.context.authorize("platform.trades.payment.view");
    return this.repository.find(id);
  }

  async create(input: PaymentSavePayload) {
    await this.context.authorize("platform.trades.payment.create");
    const value = normalizePayment(input);
    const record = await this.save(() =>
      this.repository.create(value, randomBytes(4).toString("hex"), randomBytes(4).toString("hex"))
    );
    await this.audit("created", record);
    return record;
  }

  async update(id: string, input: PaymentSavePayload) {
    await this.context.authorize("platform.trades.payment.update");
    const current = await this.required(id);
    const record = (await this.save(() =>
      this.repository.update(current.id, normalizePayment(input))
    ))!;
    await this.audit("updated", record);
    return record;
  }

  async setStatus(id: string, status: PaymentStatus) {
    await this.context.authorize("platform.trades.payment.lifecycle");
    const current = await this.required(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }

  async forceDelete(id: string) {
    await this.context.authorize("platform.trades.payment.delete");
    const current = await this.required(id);
    const record = (await this.repository.forceDelete(current.id))!;
    await this.audit("force-deleted", record);
    return record;
  }

  private async required(id: string) {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Payment was not found.");
    return record;
  }

  private async audit(action: string, record: Payment) {
    await recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "trades.payment",
      recordId: record.id,
      recordLabel: `${record.tgCode} · ${record.name}`,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Payment reference already exists.");
      throw error;
    }
  }
}

function normalizePayment(input: PaymentSavePayload): PaymentPersistencePayload {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw AppError.validation("Payment amount must be greater than zero.");
  return {
    amount,
    bank: input.bank.trim(),
    date: input.date,
    name: input.name.trim(),
    reference: input.reference.trim(),
    status: input.status,
    tgCode: input.tgCode.trim().toUpperCase()
  };
}

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
