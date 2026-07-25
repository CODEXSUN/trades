import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { CommissionRepository } from "./commission.repository.js";
import type {
  CommissionContext,
  CommissionDirection,
  CommissionListFilters,
  CommissionVariantSavePayload
} from "./commission.types.js";

export class CommissionService {
  private readonly repository: CommissionRepository;
  constructor(private readonly context: CommissionContext) {
    this.repository = new CommissionRepository(context.database);
  }

  async listDeposits(filters: CommissionListFilters) {
    await this.context.authorize("platform.trades.commission.view");
    validateDates(filters);
    return this.repository.list("deposit", filters);
  }

  async listWithdrawals(filters: CommissionListFilters) {
    await this.context.authorize("platform.trades.commission.view");
    validateDates(filters);
    return this.repository.list("withdraw", filters);
  }

  async variants() {
    await this.context.authorize("platform.trades.commission.view");
    return this.repository.variants();
  }

  async updateVariant(id: string, input: CommissionVariantSavePayload) {
    await this.context.authorize("platform.trades.commission.configure");
    const current = await this.repository.findVariant(Number(id));
    if (!current) throw AppError.notFound("Commission variant was not found.");
    const record = await this.repository.updateVariant(Number(id), {
      name: input.name.trim(),
      percentage: roundRate(input.percentage),
      status: input.status
    });
    await recordTenantAccessAudit({
      action: "configured",
      actorEmail: this.context.actorEmail,
      moduleKey: "trades.commission",
      recordId: current.id,
      recordLabel: current.name,
      recordUuid: current.uuid,
      tenantId: this.context.tenantId
    });
    return record!;
  }

  settleDeposit(id: string) {
    return this.settle("deposit", id);
  }
  settleWithdrawal(id: string) {
    return this.settle("withdraw", id);
  }

  private async settle(direction: CommissionDirection, id: string) {
    await this.context.authorize("platform.trades.commission.settle");
    const current = await this.repository.findEntry(Number(id), direction);
    if (!current)
      throw AppError.notFound(
        `${direction === "deposit" ? "Deposit" : "Withdrawal"} commission was not found.`
      );
    if (current.settledAt) throw AppError.conflict("Commission entry is already settled.");
    const record = (await this.repository.settle(direction, current.id, this.context.actorEmail))!;
    await recordTenantAccessAudit({
      action: "settled",
      actorEmail: this.context.actorEmail,
      moduleKey: "trades.commission",
      recordId: record.id,
      recordLabel: `${record.direction} - ${record.reference}`,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
    return record;
  }
}

function validateDates(filters: CommissionListFilters) {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw AppError.validation("From date cannot be after to date.");
  }
}
function roundRate(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}
