import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { PaymentListFilters, PaymentRecord, PaymentSavePayload } from "./payment.types";

const paymentPath = "/trades/payments";

export function listPayments(filters: PaymentListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<PaymentRecord[]>(
    `${paymentPath}${query.size ? `?${query.toString()}` : ""}`,
    "tenant"
  );
}

export function createPayment(payload: PaymentSavePayload) {
  return apiPost<PaymentRecord>(paymentPath, payload, "tenant");
}

export function updatePayment(id: number, payload: PaymentSavePayload) {
  return apiPut<PaymentRecord>(`${paymentPath}/${id}`, payload, "tenant");
}

export function activatePayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/activate`, undefined, "tenant");
}

export function deactivatePayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/deactivate`, undefined, "tenant");
}

export function forceDeletePayment(id: number) {
  return apiDelete<PaymentRecord>(`${paymentPath}/${id}/force`, "tenant");
}
