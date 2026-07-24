import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { DepositListFilters, DepositRecord, DepositSavePayload } from "./deposit.types";

const depositPath = "/trades/deposits";

export function listDeposits(filters: DepositListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<DepositRecord[]>(
    `${depositPath}${query.size ? `?${query.toString()}` : ""}`,
    "tenant"
  );
}

export function createDeposit(payload: DepositSavePayload) {
  return apiPost<DepositRecord>(depositPath, payload, "tenant");
}

export function updateDeposit(id: number, payload: DepositSavePayload) {
  return apiPut<DepositRecord>(`${depositPath}/${id}`, payload, "tenant");
}

export function activateDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/activate`, undefined, "tenant");
}

export function deactivateDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/deactivate`, undefined, "tenant");
}

export function forceDeleteDeposit(id: number) {
  return apiDelete<DepositRecord>(`${depositPath}/${id}/force`, "tenant");
}
