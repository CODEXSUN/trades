import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerDepositRoutes } from "./deposit.routes.js";

export const depositModule = defineModule<PlatformModuleDependencies>({
  key: "trades.deposit",
  label: "Deposit",
  register: ({ app }) => registerDepositRoutes(app)
});
