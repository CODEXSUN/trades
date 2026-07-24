import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail, ok } from "@codexsun/framework/http";
import { AuthService } from "./auth.service.js";
import { verifyAuthToken } from "./jwt.js";
import { env } from "../env.js";

const authService = new AuthService();

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/development/client-login", async (request, reply) => {
    if (
      env.NODE_ENV !== "development" ||
      env.DEV_AUTO_CLIENT_LOGIN !== "1" ||
      env.CLIENT_CORPORATE_ID.trim().toUpperCase() !== "TRADES"
    ) {
      return reply.code(404).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_DISABLED",
            message: "Development client login is disabled."
          },
          { requestId: request.id }
        )
      );
    }

    const result = await authService.login({
      email: env.CLIENT_ADMIN_EMAIL,
      password: env.CLIENT_ADMIN_PASSWORD
    });

    if (!result || !("tenantId" in result)) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_FAILED",
            message: "Trades development credentials are invalid."
          },
          { requestId: request.id }
        )
      );
    }

    return ok(result, {
      requestId: request.id,
      tenantId: result.tenantId
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as LoginBody | undefined;
    const loginInput: {
      email?: string;
      password?: string;
    } = {};
    if (body?.email) loginInput.email = body.email;
    if (body?.password) loginInput.password = body.password;
    const result = await authService.login(loginInput);

    if (!result) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid email or password."
          },
          { requestId: request.id }
        )
      );
    }

    return ok(result, {
      requestId: request.id,
      ...("tenantId" in result && result.tenantId ? { tenantId: result.tenantId } : {})
    });
  });

  app.get("/auth/session", async (request, reply) => {
    const token = bearerToken(request);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_SESSION_EXPIRED",
            message: "Session expired. Please sign in again."
          },
          { requestId: request.id }
        )
      );
    }

    return ok(
      {
        authenticated: true,
        email: payload.email,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        name: payload.name,
        sessionIssuedAt: payload.sessionIssuedAt,
        tenantCode: payload.tenantCode,
        tenantDbName: payload.tenantDbName,
        tenantId: payload.tenantId,
        tenantUuid: payload.tenantUuid,
        tenantRole: payload.tenantRole,
        permissions: payload.permissions ?? [],
        userType: payload.userType
      },
      {
        requestId: request.id,
        ...(payload.tenantId ? { tenantId: payload.tenantId } : {})
      }
    );
  });

  app.post("/auth/logout", async (request) => ok({ loggedOut: true }, { requestId: request.id }));
}

type LoginBody = {
  email?: string;
  password?: string;
};

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }
  return authorization.slice("Bearer ".length).trim();
}
