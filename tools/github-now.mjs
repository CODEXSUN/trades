#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const packageJson = readJson(join(root, "package.json"));
const version = String(packageJson.version);
const changelog = readFileSync(join(root, "assist", "documentation", "CHANGELOG.md"), "utf8");
const subject = option("--message") ?? defaultSubject(version, changelog);
const dryRun = args.includes("--dry-run");

if (!/^#\d{2,}\s+-\s+\S/u.test(subject)) {
  throw new Error('Commit subject must use "#00 - message" format.');
}

const files = git(["status", "--porcelain"], true).split(/\r?\n/u).filter(Boolean);
console.log(`Repository: ${packageJson.name}`);
console.log(`Version:    ${version}`);
console.log(`Subject:    ${subject}`);
console.log(`Changes:    ${files.length}`);
files.forEach((file) => console.log(`  ${file}`));

if (dryRun) {
  console.log("Dry run only. No pull, add, commit, or push was performed.");
  process.exit(0);
}

const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], true);
if (upstream) git(["pull", "--rebase", "--autostash"]);

git(["add", "-A"]);
const staged = git(["diff", "--cached", "--name-only"], true);
if (staged) git(["commit", "-m", subject]);
else console.log("No staged changes; skipping commit.");
git(["push"]);

function defaultSubject(currentVersion, text) {
  const escaped = currentVersion.replaceAll(".", "\\.");
  const match = text.match(new RegExp(`### \\[v ${escaped}\\][^\\n]*? - ([^\\r\\n]+)`, "u"));
  const title = match?.[1]?.trim() || "Update Trades";
  const reference = String(Number(currentVersion.split(".")[2])).padStart(2, "0");
  return `#${reference} - ${title}`;
}

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function git(gitArgs, quiet = false) {
  try {
    return (
      execFileSync("git", gitArgs, {
        cwd: root,
        encoding: "utf8",
        stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit"
      })?.trim?.() ?? ""
    );
  } catch (error) {
    if (quiet) return "";
    throw error;
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}
