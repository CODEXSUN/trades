export type CommissionDirection = "deposit" | "withdraw";
export type CommissionVariantStatus = "active" | "inactive";
export type CommissionVariantRecord = {
  code: string;
  displayOrder: number;
  id: number;
  name: string;
  percentage: number;
  status: CommissionVariantStatus;
  uuid: string;
};
export type CommissionLineRecord = {
  amount: number;
  percentage: number;
  variantId: number;
  variantName: string;
};
export type CommissionEntryRecord = {
  amount: number;
  date: string;
  direction: CommissionDirection;
  id: number;
  lines: CommissionLineRecord[];
  name: string | null;
  reference: string | null;
  settledAt: string | null;
  settledBy: string | null;
  tgCode: string;
  totalCommission: number;
  uuid: string;
};
export type CommissionListResponse = {
  entries: CommissionEntryRecord[];
  totals: {
    amount: number;
    commission: number;
    variants: Array<{ amount: number; variantId: number }>;
  };
  variants: CommissionVariantRecord[];
};
export type CommissionListFilters = { dateFrom?: string; dateTo?: string };
export type CommissionVariantSavePayload = {
  name: string;
  percentage: number;
  status: CommissionVariantStatus;
};
