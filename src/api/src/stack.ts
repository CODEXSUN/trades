import { tradesApiComponentKeys } from "./app.js";

export const TRADES_PACKAGE_VERSION = "1.0.9";

export const tradesPermissionKeys = Object.freeze([
  "trades.bank-account.view",
  "trades.bank-account.create",
  "trades.bank-account.update",
  "trades.bank-account.lifecycle",
  "trades.bank-account.delete",
  "trades.bank-account.entry",
  "trades.bank-account.transfer",
  "trades.bank-account.reconcile",
  "trades.deposit.view",
  "trades.deposit.create",
  "trades.deposit.update",
  "trades.deposit.lifecycle",
  "trades.deposit.delete",
  "trades.payment.view",
  "trades.payment.create",
  "trades.payment.update",
  "trades.payment.lifecycle",
  "trades.payment.delete",
  "trades.commission.view",
  "trades.commission.configure",
  "trades.commission.settle"
]);

export const tradesStackContribution = Object.freeze({
  applicationMode: "client" as const,
  capabilities: Object.freeze({
    api: true,
    database: true,
    web: true
  }),
  compatibility: Object.freeze({
    cxapp: "^1.0.2"
  }),
  components: tradesApiComponentKeys,
  contractVersion: 1,
  dependencies: Object.freeze([] as string[]),
  description: "Single-client banking, deposits, payments, and commission operations.",
  displayName: "Trades",
  id: "trades",
  packageId: "@codexsun/trades",
  permissions: tradesPermissionKeys,
  registrationOrder: Object.freeze(["database", "api", "web"] as const),
  requiredEnvironment: Object.freeze(["CLIENT_ID", "DB_NAME"] as const),
  version: TRADES_PACKAGE_VERSION
});
