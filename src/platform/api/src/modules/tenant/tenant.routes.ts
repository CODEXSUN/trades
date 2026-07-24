import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { TenantService } from "./tenant.service.js";

const portalContentSchema = z.object({
  description: z.string(),
  label: z.string(),
  title: z.string()
});

export async function registerTenantRoutes(app: FastifyInstance) {
  const tenantService = new TenantService();
  registerContractRoute(app, {
    method: "GET",
    url: "/public/app-portal",
    schemas: {
      response: z.object({
        brandName: z.string(),
        configured: z.boolean(),
        domain: z.string(),
        eyebrow: z.string(),
        features: z.array(portalContentSchema),
        footerText: z.string(),
        headline: z.string(),
        loginPath: z.literal("/login"),
        posts: z.array(portalContentSchema.extend({ href: z.string() })),
        publicSiteUrl: z.string().nullable(),
        slides: z.array(portalContentSchema),
        summary: z.string(),
        tenantCode: z.string().nullable(),
        theme: z.enum(["blue", "emerald", "slate", "violet"])
      })
    },
    handler: ({ request }) =>
      tenantService.getPublicPortal(
        String(request.headers["x-forwarded-host"] ?? request.headers.host ?? "")
      )
  });

  app.get("/application/runtime", async (request) => {
    const { tenantId } = tenantAccessContext(request);
    return ok(await tenantService.getTenantRuntime(tenantId), {
      requestId: request.id,
      ...(tenantId ? { tenantId } : {})
    });
  });
}
