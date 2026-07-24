import { z } from "zod";

export const paymentSchema = z
  .object({
    amount: z.number().positive("Payment amount must be greater than zero."),
    bank: z.string().trim().min(2, "Bank is required.").max(180),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date is required."),
    name: z.string().trim().min(2, "Name is required.").max(200),
    reference: z.string().trim().min(1, "Reference is required.").max(180),
    status: z.enum(["active", "inactive"]),
    tgCode: z.string().trim().min(1, "TG code is required.").max(80)
  })
  .strict();
