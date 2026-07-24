import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerPaymentRoutes } from "./payment.routes.js";

export const paymentModule = defineModule<PlatformModuleDependencies>({
  key: "trades.payment",
  label: "Payment",
  register: ({ app }) => registerPaymentRoutes(app)
});
