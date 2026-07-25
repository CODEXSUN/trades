import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerBankAccountRoutes } from "./bank-account.routes.js";

export const bankAccountModule = defineModule<PlatformModuleDependencies>({
  key: "trades.bank-account",
  label: "Bank Accounts",
  register: ({ app }) => registerBankAccountRoutes(app)
});
