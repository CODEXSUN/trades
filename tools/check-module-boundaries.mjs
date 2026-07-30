import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const apiModules = resolve(root, "src/platform/api/src/modules");
const webModules = resolve(root, "src/platform/web/src/modules");
const allowed = new Set([
  "bank-account",
  "commission",
  "deposit",
  "payment",
  "permission",
  "role",
  "role-permission",
  "trades-overview",
  "user",
  "user-role"
]);
const failures = [];

for (const moduleRoot of [apiModules, webModules]) {
  for (const entry of readdirSync(moduleRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowed.has(entry.name)) {
      failures.push(`unexpected module directory: ${relative(root, join(moduleRoot, entry.name))}`);
    }
  }
}

for (const name of [...allowed].filter((name) => name !== "trades-overview")) {
  if (!existsSync(join(apiModules, name, "index.ts")))
    failures.push(`API ${name}: missing index.ts`);
  if (!existsSync(join(webModules, name, "index.ts")))
    failures.push(`Web ${name}: missing index.ts`);
}
if (!existsSync(join(webModules, "trades-overview", "index.ts"))) {
  failures.push("Web trades-overview: missing index.ts");
}

for (const file of sourceFiles(resolve(root, "src/platform"))) {
  const source = readFileSync(file, "utf8");
  if (/@codexsun\/core|modules\/(?:app-registry|subscription|plan|entitlement)/u.test(source)) {
    failures.push(`${relative(root, file)}: imports a removed product/platform boundary`);
  }
}

if (failures.length) {
  console.error(`Module boundary check failed:\n${failures.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}
console.info("Module boundary check passed: Platform identity and four Trades modules only.");

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}
