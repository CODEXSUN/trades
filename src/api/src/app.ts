import "@codexsun/framework/api";
import type { FastifyInstance } from "fastify";
import { bankAccountModule } from "./modules/bank-account/index.js";
import { commissionModule } from "./modules/commission/index.js";
import { depositModule } from "./modules/deposit/index.js";
import { paymentModule } from "./modules/payment/index.js";
import { setTradesHostRequestContext, type TradesHostAdapter } from "./request-context.js";

export const tradesApiModuleKeys = Object.freeze([
  bankAccountModule.key,
  depositModule.key,
  paymentModule.key,
  commissionModule.key
]);

export const tradesApiComponentKeys = Object.freeze([
  "trades.bank-account",
  "trades.deposit",
  "trades.payment",
  "trades.commission"
]);

export async function registerTradesApiForHost(app: FastifyInstance, adapter: TradesHostAdapter) {
  await app.register(async (tradesApp) => {
    tradesApp.addHook("onRequest", (request, _reply, done) => {
      void Promise.resolve(adapter.resolve(request))
        .then((context) => {
          if (!context.clientId.trim()) {
            throw new Error("Trades requires a trusted CXApp client ID.");
          }
          if (!context.databaseName.trim()) {
            throw new Error("Trades requires a CXApp-resolved database name.");
          }
          setTradesHostRequestContext(request, context);
          done();
        })
        .catch((error: unknown) => done(error as Error));
    });
    for (const module of [bankAccountModule, depositModule, paymentModule, commissionModule]) {
      await module.register({ app: tradesApp });
    }
  });
}
