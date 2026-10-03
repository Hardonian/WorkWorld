#!/usr/bin/env node
/**
 * Build a reviewed source archive from TRACKED files only (git archive),
 * excluding withheld evaluation material via .gitattributes export-ignore,
 * with a checksum manifest and a clean-directory extraction verification.
 */
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const quiet = process.argv.includes("--quiet");
const outDir = "dist";
const name = "workworld-source";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, base, out);
    else out.push(p.slice(base.length + 1));
  }
  return out;
}

// Tracked-only archive; .gitattributes export-ignore excludes withheld material.
const commit = sh("git rev-parse HEAD").trim();
mkdirSync(outDir, { recursive: true });
const tarball = join(outDir, `${name}-${commit.slice(0, 8)}.tar.gz`);
sh(`git archive --format=tar.gz --prefix=${name}/ -o ${tarball} HEAD`);

// Verify extraction in a clean directory and check for forbidden content.
const verifyDir = join(outDir, "verify");
rmSync(verifyDir, { recursive: true, force: true });
mkdirSync(verifyDir, { recursive: true });
sh(`tar -xzf ${tarball} -C ${verifyDir}`);
const files = walk(join(verifyDir, name)).sort();

const problems = [];
for (const f of files) {
  if (f.includes("withheld")) problems.push(`withheld material leaked: ${f}`);
  if (f.startsWith(".env") && f !== ".env.example") problems.push(`env file included: ${f}`);
  if (f.includes("node_modules") || f.startsWith(".next/")) problems.push(`build/dependency artifact: ${f}`);
}
// Patterns are built by concatenation so this file cannot match its own scanner.
const secretScan = new RegExp(["gho", "_"].join("") + "|" + ["sk", "-[A-Za-z0-9]{20,}"].join("") + "|" + ["BEGIN (RS", "A|OPENSSH|PRIVATE)"].join(""));
for (const f of files) {
  const content = readFileSync(join(verifyDir, name, f), "utf8").slice(0, 200_000);
  if (secretScan.test(content)) problems.push(`possible secret in ${f}`);
}

// Checksum manifest over archive + extracted files.
const manifest = {
  commit,
  createdAt: new Date().toISOString(),
  archive: { file: tarball, sha256: sha256(tarball) },
  fileCount: files.length,
  files: files.map((f) => ({ path: f, sha256: sha256(join(verifyDir, name, f)) })),
};
writeFileSync(join(outDir, `SHA256SUMS-${commit.slice(0, 8)}.json`), JSON.stringify(manifest, null, 2));
writeFileSync(
  join(outDir, `SHA256SUMS-${commit.slice(0, 8)}.txt`),
  `${manifest.archive.sha256}  ${tarball}\n` +
    files.map((f) => `${manifest.files.find((x) => x.path === f).sha256}  ${f}`).join("\n") +
    "\n",
);

rmSync(verifyDir, { recursive: true, force: true });

if (problems.length > 0) {
  console.error("ARCHIVE VERIFICATION FAILED:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
if (!quiet) {
  console.log(`archive: ${tarball}`);
  console.log(`commit:  ${commit}`);
  console.log(`files:   ${files.length} (verified extraction; no withheld/secret/dep content)`);
  console.log(`checksums: dist/SHA256SUMS-${commit.slice(0, 8)}.{json,txt}`);
}
