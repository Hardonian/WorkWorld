#!/usr/bin/env node
/**
 * Release gate — exits nonzero when a required technical gate lacks CURRENT
 * evidence. Hosted readiness is reported separately and optional hosted checks
 * never masquerade as passing local gates.
 */
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";

const results = [];

function gate(id, description, cmd, required = true) {
  const started = new Date().toISOString();
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    results.push({ id, description, cmd, required, exitCode: 0, ok: true, started, tail: output.trim().split("\n").slice(-3).join(" | ") });
    console.log(`PASS ${id}`);
  } catch (e) {
    const err = e;
    results.push({ id, description, cmd, required, exitCode: err.status ?? 1, ok: false, started, tail: `${err.stdout ?? ""} ${err.stderr ?? ""}`.trim().split("\n").slice(-3).join(" | ") });
    console.log(`${required ? "FAIL" : "WARN"} ${id}`);
  }
}

console.log("WorkWorld release gate");
gate("lint", "eslint clean", "npm run lint");
gate("typecheck", "tsc --noEmit", "npm run typecheck");
gate("tests", "unit/integration/db tests", "npx vitest run");
gate("baseline", "competent control passes all episodes", "npm run baseline");
gate("negatives", "negative controls fail for the right reasons", "npm run negatives");
gate("build", "production build", "npm run build");
gate("task-state", "TASK_STATE.json validates against schema", "npm run validate:task-state");
gate("archive", "source archive builds with checksums", "node scripts/build-archive.mjs --quiet");

const requiredFailures = results.filter((r) => r.required && !r.ok);

const localReady = requiredFailures.length === 0;
const hostedConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const summary = {
  generatedAt: new Date().toISOString(),
  localReadiness: localReady ? "local technical candidate: PASS" : "local technical candidate: FAIL",
  hostedReadiness: hostedConfigured
    ? "hosted: config present — still requires verification against the hosted project (blocked_external until then)"
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
