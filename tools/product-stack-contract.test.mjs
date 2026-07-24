import assert from "node:assert/strict";
import test from "node:test";
import { matchesServiceHealthContract } from "./dev-stack-health.mjs";
import { affectedProductStacks, productStackContract } from "./product-stack-contract.mjs";

test("Trades packages compose into the single Platform runtime without sharing ownership", () => {
  assert.deepEqual(productStackContract.trades.formula, ["framework", "ui", "core", "platform"]);
  assert.deepEqual(productStackContract.trades.services, ["platform-api", "platform-web"]);
  assert.deepEqual(productStackContract.trades.databaseScopes, ["trades-application"]);
  assert.deepEqual(productStackContract.trades.ownedDatabaseScopes, ["trades-application"]);
  assert.equal(productStackContract.trades.deploymentPolicy, "composed-platform-release");
});

test("stack impact keeps product-only changes inside their release boundary", () => {
  assert.deepEqual(affectedProductStacks(["src/platform/api/src/app.ts"]), ["trades"]);
  assert.deepEqual(affectedProductStacks(["src/platform/web/src/main.tsx"]), ["trades"]);
  assert.deepEqual(affectedProductStacks(["../core/api/src/app.ts"]), ["trades"]);
  assert.deepEqual(affectedProductStacks(["../framework/src/api/index.ts"]), ["trades"]);
  assert.deepEqual(affectedProductStacks(["tools/product-stack-contract.mjs"]), ["trades"]);
});

test("development attachment accepts only the expected healthy dependency", () => {
  const health = {
    data: { checks: { "platform-api": { status: "ok" } }, status: "ok" },
    success: true
  };
  assert.equal(matchesServiceHealthContract(health, "platform-api"), true);
  assert.equal(matchesServiceHealthContract(health, "core-api"), false);
  assert.equal(matchesServiceHealthContract({ ...health, success: false }, "platform-api"), false);
});
