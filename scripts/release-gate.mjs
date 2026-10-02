#!/usr/bin/env node
/**
 * Release gate — exits nonzero when a required technical gate lacks CURRENT
 * evidence. Hosted readiness is reported separately and optional hosted checks
 * never masquerade as passing local gates.
 */
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";

const results = [];

function redact(s) {
  // Never let credentials reach evidence/log output.
  let out = s;
  const pgUrl = process.env.WW_TEST_PG_URL ?? "";
  const pw = pgUrl.includes("://") ? (pgUrl.split("://")[1].split("@")[0].split(":")[1] ?? "") : "";
  for (const v of [process.env.SUPABASE_SERVICE_ROLE_KEY, pw]) {
    if (v && v.length >= 8) out = out.split(v).join("<redacted>");
  }
  return out;
}

function gate(id, description, cmd, required = true) {
  const started = new Date().toISOString();
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    results.push({ id, description, cmd, required, exitCode: 0, ok: true, started, tail: redact(output.trim().split("\n").slice(-3).join(" | ")) });
    console.log(`PASS ${id}`);
  } catch (e) {
    const err = e;
    results.push({ id, description, cmd, required, exitCode: err.status ?? 1, ok: false, started, tail: redact(`${err.stdout ?? ""} ${err.stderr ?? ""}`.trim().split("\n").slice(-3).join(" | ")) });
    console.log(`${required ? "FAIL" : "WARN"} ${id}`);
  }
}

console.log("WorkWorld release gate");
// Isolated test Postgres for the RLS suite. scripts/db-up.sh is idempotent and
// never touches any existing database; bringing it up here keeps the gate
// reflecting code state rather than ambient container state (e.g. after a
// reboot). If Docker is absent the suite's connection failure stays visible —
// nothing is skipped and no check is weakened.
try {
  execSync("docker --version", { stdio: "pipe" });
  try {
    execSync("bash scripts/db-up.sh", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    console.log("PASS db-up (idempotent; isolated workworld-pg-test container)");
  } catch {
    console.log("WARN db-up — could not start test Postgres; the tests gate below will fail until `npm run db:up` succeeds");
  }
} catch {
  console.log("WARN db-up — Docker not available; RLS suite will fail (see docs/RELEASE_CHECKLIST.md: DB tests informational when DB stack unavailable)");
}
gate("lint", "eslint clean", "npm run lint");
gate("typecheck", "tsc --noEmit", "npm run typecheck");
gate("tests", "unit/integration/db tests", "npx vitest run");
gate("baseline", "competent control passes all episodes", "npm run baseline");
gate("negatives", "negative controls fail for the right reasons", "npm run negatives");
gate("build", "production build", "npm run build");
gate("task-state", "TASK_STATE.json validates against schema", "npm run validate:task-state");
gate("archive", "source archive builds with checksums", "node scripts/build-archive.mjs --quiet");

// Hosted verification (only when hosted config is present): run the RLS
// suite against the REAL hosted project via WW_TEST_PG_URL (session mode).
// This is the B1 verification — without it hosted stays "pending", never
// inferred from config presence alone.
const hostedConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const hostedPgConfigured = Boolean(hostedConfigured && process.env.WW_TEST_PG_URL);
let hostedVerified = false;
if (hostedPgConfigured) {
  gate("hosted-rls", "RLS suite against the real hosted project", "npx vitest run tests/db", true);
  hostedVerified = results.find((r) => r.id === "hosted-rls").ok;
} else if (hostedConfigured) {
  console.log("WARN hosted-rls — hosted config present but WW_TEST_PG_URL absent; hosted verification pending");
}

const requiredFailures = results.filter((r) => r.required && !r.ok);

const localReady = requiredFailures.length === 0;

const summary = {
  generatedAt: new Date().toISOString(),
  localReadiness: localReady ? "local technical candidate: PASS" : "local technical candidate: FAIL",
  hostedReadiness: hostedVerified
    ? `hosted: VERIFIED against the hosted project (RLS suite green via WW_TEST_PG_URL; ${new URL(process.env.SUPABASE_URL).host})`
    : hostedConfigured
      ? "hosted: config present — verification pending (set WW_TEST_PG_URL to run the hosted RLS gate)"
      : "hosted: blocked_external (no hosted configuration; B1)",
  researchReadiness: "harness validation only — no live-model or human-study evidence",
  commercialReadiness: "none — protocols only",
  gates: results,
};

mkdirSync("evidence/release-gate", { recursive: true });
writeFileSync("evidence/release-gate/latest.json", JSON.stringify(summary, null, 2));
console.log("");
console.log(summary.localReadiness);
console.log(summary.hostedReadiness);
console.log(`evidence: evidence/release-gate/latest.json`);
process.exit(localReady ? 0 : 1);
