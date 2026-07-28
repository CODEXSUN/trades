import { AppError } from "@codexsun/framework/errors";
import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import type { TradesDatabase } from "./database/schema.js";

export type TradesActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
};

export type TradesAuditEvent = {
  action: string;
  actorEmail: string;
  clientId: string;
  moduleKey: string;
  recordId: number;
  recordLabel: string;
  recordUuid: string;
};

export type TradesHostRequestContext = {
  actor: TradesActor;
  audit(event: TradesAuditEvent): Promise<void> | void;
  authorize(permission: string): Promise<void> | void;
  clientId: string;
  database: Kysely<TradesDatabase>;
  databaseName: string;
};

export type TradesHostAdapter = {
  resolve(request: FastifyRequest): Promise<TradesHostRequestContext> | TradesHostRequestContext;
};

export type TradesModuleContext = {
  actorEmail: string;
  audit(event: Omit<TradesAuditEvent, "actorEmail" | "clientId">): Promise<void>;
  authorize(permission: string): Promise<void>;
  clientId: string;
  database: Kysely<TradesDatabase>;
};

const contexts = new WeakMap<FastifyRequest, TradesHostRequestContext>();

export function setTradesHostRequestContext(
  request: FastifyRequest,
  context: TradesHostRequestContext
) {
  contexts.set(request, context);
}

export function tradesRequestContext(request: FastifyRequest): TradesModuleContext {
  const context = contexts.get(request);
  if (!context) throw AppError.forbidden("Trades requires an active CXApp request context.");
  const actorEmail = context.actor.email?.trim() || context.actor.id;
  return {
    actorEmail,
    audit: (event) =>
      Promise.resolve(
        context.audit({
          ...event,
          actorEmail,
          clientId: context.clientId
        })
      ),
    authorize: (permission) => Promise.resolve(context.authorize(permission)),
    clientId: context.clientId,
    database: context.database
  };
}
