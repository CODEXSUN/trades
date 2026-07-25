export type PaymentStatus = "active" | "inactive";

export type PaymentRecord = {
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
