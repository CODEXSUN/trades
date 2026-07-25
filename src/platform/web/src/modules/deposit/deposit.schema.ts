import { z } from "zod";

export const depositSchema = z
  .object({
    amount: z.number().positive("Deposit amount must be greater than zero."),
    bankAccountId: z.number().int().positive("Bank account is required."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Deposit date is required."),
    name: z.string().trim().min(2, "Name is required.").max(200),
    reference: z.string().trim().min(1, "Reference is required.").max(180),
    status: z.enum(["active", "inactive"]),
    tgCode: z.string().trim().min(1, "TG code is required.").max(80)
  })
  .strict();
