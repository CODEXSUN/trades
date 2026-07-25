import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerCommissionRoutes } from "./commission.routes.js";

export const commissionModule = defineModule<PlatformModuleDependencies>({
  key: "trades.commission",
  label: "Commission",
  register: ({ app }) => registerCommissionRoutes(app)
});
