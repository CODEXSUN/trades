import assert from "node:assert/strict";
import { createApp } from "../../src/platform/api/src/app.js";

const app = await createApp();

try {
  await app.ready();

  const healthResponse = await app.inject({ method: "GET", url: "/health" });
  assert.equal(healthResponse.statusCode, 200);
  const health = healthResponse.json() as {
    data?: { checks?: { "platform-api"?: { details?: { modules?: string[] } } } };
    success?: boolean;
  };
  assert.equal(health.success, true);
  const modules = health.data?.checks?.["platform-api"]?.details?.modules ?? [];
  assert.ok(modules.includes("core.common"), "Core package was not composed into Platform API.");
  assert.equal(
    modules.some((moduleKey) => moduleKey.startsWith("billing.")),
    false,
    "Billing modules must not be composed into Trades."
  );
  assert.equal(modules.includes("mail"), false, "Mail must not be composed into Trades.");
  assert.equal(
    modules.some((moduleKey) => moduleKey.startsWith("crm.")),
    false,
    "CRM modules must not be composed into Trades."
  );
  assert.equal(
    modules.some((moduleKey) => moduleKey.startsWith("frappe.")),
    false,
    "Frappe modules must not be composed into Trades."
  );

  const corsResponse = await app.inject({
    headers: {
      "access-control-request-headers": "content-type",
      "access-control-request-method": "POST",
      origin: "http://127.0.0.1:7080"
    },
    method: "OPTIONS",
    url: "/auth/login"
  });
  assert.equal(corsResponse.statusCode, 204);
  assert.equal(
    corsResponse.headers["access-control-allow-origin"],
    "http://127.0.0.1:7080",
    "Platform login preflight did not allow the local web origin."
  );
  assert.equal(corsResponse.headers["access-control-allow-credentials"], "true");

  const rejectedCorsResponse = await app.inject({
    headers: {
      "access-control-request-method": "POST",
      origin: "https://untrusted.example"
    },
    method: "OPTIONS",
    url: "/auth/login"
  });
  assert.equal(
    rejectedCorsResponse.headers["access-control-allow-origin"],
    undefined,
    "Platform API reflected an unconfigured web origin."
  );

  const coreResponse = await app.inject({
    headers: {
      "x-tenant-db": "trades_composed_runtime_probe",
      "x-tenant-id": "00000000"
    },
    method: "GET",
    url: "/core/common/location/countries"
  });
  assert.equal(coreResponse.statusCode, 401, "Core route is not protected inside Platform API.");

  const billingResponse = await app.inject({ method: "GET", url: "/billing/quotations" });
  assert.equal(billingResponse.statusCode, 404, "Billing routes must not exist in Trades.");

  const crmResponse = await app.inject({ method: "GET", url: "/application/crm/enquiries" });
  assert.equal(crmResponse.statusCode, 404, "CRM routes must not exist in Trades.");

  const frappeResponse = await app.inject({ method: "GET", url: "/application/frappe/settings" });
  assert.equal(frappeResponse.statusCode, 404, "Frappe routes must not exist in Trades.");

  const legacyTenantResponse = await app.inject({ method: "GET", url: "/tenant/access/users" });
  assert.equal(
    legacyTenantResponse.statusCode,
    404,
    "Legacy tenant-prefixed product routes must not exist in Trades."
  );

  const tenantAdminResponse = await app.inject({ method: "GET", url: "/admin/tenants" });
  assert.equal(
    tenantAdminResponse.statusCode,
    404,
    "Tenant management routes must not exist in the mono-client application."
  );

  const applicationResponse = await app.inject({
    headers: {
      "x-tenant-db": "trades_db",
      "x-tenant-id": "00000000"
    },
    method: "GET",
    url: "/application/runtime"
  });
  assert.equal(
    applicationResponse.statusCode,
    401,
    "The application runtime route must exist and require authentication."
  );

  console.log("Composed Platform runtime E2E passed", {
    apiPort: 7070,
    composedPackages: ["framework", "ui", "core", "platform"],
    corsOrigin: "http://127.0.0.1:7080",
    webPort: 7080
  });
} finally {
  await app.close();
}
