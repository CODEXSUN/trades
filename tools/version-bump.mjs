#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packagePath = join(root, "package.json");
const lockPath = join(root, "package-lock.json");
const changelogPath = join(root, "assist", "documentation", "CHANGELOG.md");
const stackPath = join(root, "src", "api", "src", "stack.ts");
const webBundlePath = join(root, "src", "web", "src", "cxapp.tsx");
const args = process.argv.slice(2);
const packageJson = readJson(packagePath);
const currentVersion = String(packageJson.version);
const nextVersion = requestedVersion(currentVersion);

if (args.includes("--dry-run")) {
  console.log(`Version bump dry run: ${currentVersion} -> ${nextVersion}`);
  process.exit(0);
}

packageJson.version = nextVersion;
writeJson(packagePath, packageJson);

const lock = readJson(lockPath);
lock.version = nextVersion;
if (lock.packages?.[""]) lock.packages[""].version = nextVersion;
writeJson(lockPath, lock);

replaceVersion(stackPath, currentVersion, nextVersion);
replaceVersion(webBundlePath, currentVersion, nextVersion);
updateChangelog(currentVersion, nextVersion);

console.log(`Bumped @codexsun/trades ${currentVersion} -> ${nextVersion}`);

function requestedVersion(version) {
  const explicit = option("--to");
  if (explicit) {
    assertVersion(explicit);
    return explicit;
  }

  assertVersion(version);
  const [major, minor, patch] = version.split(".").map(Number);
  if (args.includes("--major")) return `${major + 1}.0.0`;
  if (args.includes("--minor")) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updateChangelog(previousVersion, version) {
  const title = option("--title") ?? "Version update";
  const databaseUpdate = args.includes("--database-update");
  let changelog = readFileSync(changelogPath, "utf8")
    .replace(/Current version: .*/u, `Current version: ${version}`)
    .replace(/Release tag: .*/u, `Release tag: v-${version}`)
    .replace(/Changelog label: .*/u, `Changelog label: v ${version}`);
  const entry = [
    `## v-${version}`,
    "",
    `### [v ${version}] ${timestamp()} - ${title}`,
    "",
    "#### Database Changes",
    "",
    `- Database update: ${databaseUpdate ? "Yes" : "No"}.`,
    "",
    "#### App Codebase Changes",
    "",
    `- Bumped repository version from ${previousVersion} to ${version}.`,
    ""
  ].join("\n");
  const insertAt = changelog.indexOf("## v-");
  changelog = `${changelog.slice(0, insertAt)}${entry}\n${changelog.slice(insertAt)}`;
  writeFileSync(changelogPath, changelog, "utf8");
}

function replaceVersion(file, previousVersion, version) {
  const source = readFileSync(file, "utf8");
  const updated = source.replace(`version: "${previousVersion}"`, `version: "${version}"`);
  if (updated === source) throw new Error(`Version marker not found in ${file}`);
  writeFileSync(file, updated, "utf8");
}

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function assertVersion(value) {
  if (!/^\d+\.\d+\.\d+$/u.test(value)) throw new Error(`Invalid semantic version: ${value}`);
}

function timestamp() {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
    timeZone: "Asia/Calcutta"
  })
    .format(new Date())
    .replace(",", "");
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
