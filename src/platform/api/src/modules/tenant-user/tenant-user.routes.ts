import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { signAuthToken, verifyAuthToken } from "../../auth/jwt.js";
import { TenantUserService } from "./tenant-user.service.js";

const path = "/application/access/users";
const status = z.enum(["active", "inactive", "suspended"]);
const record = z.object({
  email: z.string(),
  id: z.number().int().positive(),
  isProtected: z.boolean(),
  name: z.string(),
  status,
  uuid: z.string().length(8)
});
const payload = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(180),
  password: z.string().min(8).max(128).optional(),
  status
});
const profilePayload = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(180),
    password: z.string().min(8).max(128).optional()
  })
  .strict();
const profileRecord = record
  .pick({ email: true, id: true, name: true, uuid: true })
  .extend({ avatarPath: z.string() });
const profileResponse = z.object({ accessToken: z.string(), profile: profileRecord });
const params = z.object({ id: z.string().regex(/^\d+$/) });
const query = z.object({ search: z.string().trim().optional() });
export async function registerTenantUserRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/tenant/profile",
    schemas: { response: profileRecord },
    handler: ({ request }) => new TenantUserService(tenantAccessContext(request)).getProfile()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/tenant/profile",
    schemas: { body: profilePayload, response: profileResponse },
    handler: async ({ body, request }) => {
      const profile = await new TenantUserService(tenantAccessContext(request)).updateProfile(body);
      const claims = tenantClaims(request.headers.authorization);
      return {
        profile,
        accessToken: signAuthToken({
          email: profile.email,
          name: profile.name,
          userId: profile.uuid,
          userType: "tenant",
          ...(claims.tenantCode ? { tenantCode: claims.tenantCode } : {}),
          ...(claims.tenantDbName ? { tenantDbName: claims.tenantDbName } : {}),
          ...(claims.tenantId ? { tenantId: claims.tenantId } : {}),
          ...(claims.tenantUuid ? { tenantUuid: claims.tenantUuid } : {}),
          ...(claims.tenantRole ? { tenantRole: claims.tenantRole } : {}),
          ...(claims.permissions ? { permissions: claims.permissions } : {})
        })
      };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new TenantUserService(tenantAccessContext(request)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => {
      const value = await new TenantUserService(tenantAccessContext(request)).get(params.id);
      if (!value) throw AppError.notFound("User was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => new TenantUserService(tenantAccessContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new TenantUserService(tenantAccessContext(request)).update(params.id, body)
  });
  action(app, "activate", "active");
  action(app, "deactivate", "inactive");
  action(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).forceDelete(params.id)
  });
}
function tenantClaims(authorization: string | undefined) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const claims = token ? verifyAuthToken(token) : null;
  if (!claims || claims.userType !== "tenant") throw AppError.unauthorized("Session expired.");
  return claims;
}
function action(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/${name}`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).setStatus(params.id, value)
  });
}
