import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  BankAccountLookupRecord,
  BankAccountRecord,
  BankAccountSavePayload,
  BankManualEntryPayload,
  BankStatement,
  BankTransferPayload
} from "./bank-account.types";

const path = "/trades/bank-accounts";
export const listBankAccounts = () => apiGet<BankAccountRecord[]>(path, "tenant");
export const listBankAccountLookups = () =>
  apiGet<BankAccountLookupRecord[]>(`${path}/lookups`, "tenant");
export const createBankAccount = (value: BankAccountSavePayload) =>
  apiPost<BankAccountRecord>(path, value, "tenant");
export const updateBankAccount = (id: number, value: BankAccountSavePayload) =>
  apiPut<BankAccountRecord>(`${path}/${id}`, value, "tenant");
export const activateBankAccount = (id: number) =>
  apiPost<BankAccountRecord>(`${path}/${id}/activate`, undefined, "tenant");
export const deactivateBankAccount = (id: number) =>
  apiPost<BankAccountRecord>(`${path}/${id}/deactivate`, undefined, "tenant");
export const forceDeleteBankAccount = (id: number) =>
  apiDelete<BankAccountRecord>(`${path}/${id}/force`, "tenant");
export const getBankStatement = (id: number) =>
  apiGet<BankStatement>(`${path}/${id}/statement`, "tenant");
export const createBankEntry = (id: number, value: BankManualEntryPayload) =>
  apiPost<BankStatement>(`${path}/${id}/entries`, value, "tenant");
export const transferBankFunds = (value: BankTransferPayload) =>
  apiPost<BankStatement>(`${path}/transfer`, value, "tenant");
export const setBankEntryReconciled = (id: number, reconciled: boolean) =>
  apiPost<BankStatement>(
    `${path}/entries/${id}/${reconciled ? "reconcile" : "unreconcile"}`,
    undefined,
    "tenant"
  );
