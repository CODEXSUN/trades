#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "src/api/src/database/schema.ts"), "utf8");
const migrations = ["bank-account", "commission", "deposit", "payment"].map((moduleName) =>
  readFileSync(
    resolve(root, `src/api/src/modules/${moduleName}/${moduleName}.migration.ts`),
    "utf8"
  )
);
const failures = [];

for (const migration of migrations) {
  for (const match of migration.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/gu)) {
    if (match[1] !== "schema_migrations" && !match[1].startsWith("trades_")) {
      failures.push(`unprefixed Trades migration table: ${match[1]}`);
    }
  }
}

const databaseShape =
  schema.match(/export type TradesDatabase = \{(?<body>[\s\S]*?)\n\};/u)?.groups?.body ?? "";
for (const match of databaseShape.matchAll(/^\s+([a-zA-Z0-9_]+):/gmu)) {
  if (match[1] !== "schema_migrations" && !match[1].startsWith("trades_")) {
    failures.push(`unprefixed Trades database type: ${match[1]}`);
  }
}

if (failures.length) {
  console.error("Trades table-prefix check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Trades table-prefix ownership verified.");
