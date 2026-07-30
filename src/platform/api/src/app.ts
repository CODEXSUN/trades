import { createApiApp, registerHealthRoute, registerRequestLogging } from "@codexsun/framework/api";
import type { HealthCheck } from "@codexsun/framework/health";
import { registerModules } from "@codexsun/framework/modules";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { bootstrapTradesDatabase, closeTradesDatabase } from "./database/trades-database.js";
import { env } from "./env.js";
import { bankAccountModule } from "./modules/bank-account/index.js";
import { commissionModule } from "./modules/commission/index.js";
import { depositModule } from "./modules/deposit/index.js";
import { paymentModule } from "./modules/payment/index.js";
import { permissionModule } from "./modules/permission/index.js";
import { rolePermissionModule } from "./modules/role-permission/index.js";
import { roleModule } from "./modules/role/index.js";
import { userRoleModule } from "./modules/user-role/index.js";
import { userModule } from "./modules/user/index.js";

const modules = [
  userModule,
  roleModule,
  permissionModule,
  userRoleModule,
  rolePermissionModule,
  bankAccountModule,
  depositModule,
  paymentModule,
  commissionModule
];

export async function createApp() {
  console.info("[trades.boot] bootstrap started");
  await bootstrapTradesDatabase();

  const app = await createApiApp({
    appName: "Trades API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [closeTradesDatabase],
    tenantContext: false
  });
  const healthChecks: HealthCheck[] = [
    {
      name: "trades-api",
      check: () => ({
        details: {
          database: env.DB_NAME,
          modules: modules.map((module) => module.key),
          runtime: "single-client"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  await registerAuthRoutes(app);
  await registerModules(
    modules,
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  console.info("[trades.boot] bootstrap completed");

  return app;
}

function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN, ...env.PLATFORM_WEB_ORIGINS.split(",")];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}
