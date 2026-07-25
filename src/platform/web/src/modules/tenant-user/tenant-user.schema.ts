import { z } from "zod";
export const tenantUserSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  name: z.string().trim().min(2, "User name is required.").max(180),
  password: z.string().min(8).max(128).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "suspended"])
});
export const tenantUserProfileSchema = z
  .object({
    confirmPassword: z.string().max(128),
    email: z.string().trim().email("A valid email is required."),
    name: z.string().trim().min(2, "User name is required.").max(180),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .optional()
      .or(z.literal(""))
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password and confirmation must match.",
    path: ["confirmPassword"]
  });
