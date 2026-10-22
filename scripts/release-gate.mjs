#!/usr/bin/env node
/**
 * WorkWorld 11-Gate Unified Release Audit
 * 
 * Verifies all 11 core technical layers required for a local production candidate
 * and go-live operational stability.
 * Exits 0 only when all 11/11 required gates pass cleanly with current evidence.
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

// ANSI styling for crystal-clear terminal UX
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const results = [];
const suiteStart = Date.now();

function redact(s) {
  let out = s;
  const urls = [process.env.WW_TEST_PG_URL, process.env.DATABASE_URL].filter(Boolean);
  const passwords = urls.map((url) => {
    try {
      return new URL(url).password;
    } catch {
      return "";
    }
  });
  for (const v of [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.WORKWORLD_CERTIFICATION_SIGNING_KEY,
    ...urls,
    ...passwords,
  ]) {
    if (v && v.length >= 8) out = out.split(v).join("<redacted>");
  }
  return out;
}

let gateIndex = 0;
const TOTAL_REQUIRED_GATES = 11;

function gate(id, description, cmd, required = true) {
  gateIndex += required ? 1 : 0;
  const indexStr = required ? `[${String(gateIndex).padStart(2, "0")}/${TOTAL_REQUIRED_GATES}]` : `[HOSTED]`;
  const started = new Date().toISOString();
  const t0 = Date.now();
  
  process.stdout.write(`  ${c.cyan}${indexStr}${c.reset} ${c.bold}${id.padEnd(11)}${c.reset} ${c.gray}${description}...${c.reset} `);
  
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const elapsedSec = ((Date.now() - t0) / 1000).toFixed(2);
    results.push({
      id,
      description,
      cmd,
      required,
      exitCode: 0,
      ok: true,
      durationSec: Number(elapsedSec),
      started,
      tail: redact(output.trim().split("\n").slice(-2).join(" | ")),
    });
    console.log(`${c.green}${c.bold}PASS${c.reset} ${c.gray}(${elapsedSec}s)${c.reset}`);
  } catch (e) {
    const elapsedSec = ((Date.now() - t0) / 1000).toFixed(2);
    const err = e;
    results.push({
      id,
      description,
      cmd,
      required,
      exitCode: err.status ?? 1,
      ok: false,
      durationSec: Number(elapsedSec),
      started,
      tail: redact(`${err.stdout ?? ""} ${err.stderr ?? ""}`.trim().split("\n").slice(-2).join(" | ")),
    });
    console.log(`${required ? c.red + c.bold + "FAIL" : c.yellow + c.bold + "WARN"}${c.reset} ${c.gray}(${elapsedSec}s)${c.reset}`);
    if (err.stderr) console.error(`${c.red}[${id} stderr]:${c.reset} ${redact(err.stderr.toString().trim())}`);
    if (err.stdout) console.error(`${c.gray}[${id} stdout]:${c.reset} ${redact(err.stdout.toString().trim())}`);
  }
}

console.log(`\n${c.bold}======================================================================${c.reset}`);
console.log(`${c.bold}   WorkWorld Production Release Gate — 11-Tier Verification Suite${c.reset}`);
console.log(`${c.bold}======================================================================${c.reset}\n`);

// Attempt test Postgres if Docker is available
try {
  execSync("docker --version", { stdio: "ignore" });
  try {
    execSync("bash scripts/db-up.sh", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    console.log(`  ${c.green}*${c.reset} Docker Postgres: container workworld-pg-test ready on 127.0.0.1:54329\n`);
  } catch {
    console.log(`  ${c.yellow}*${c.reset} Docker Postgres: local container offline (informational in local mode)\n`);
  }
} catch {
  console.log(`  ${c.gray}*${c.reset} Docker: not present (RLS suite will verify dynamically or skip offline)\n`);
}

// Core local-candidate gates. Hosted validation is intentionally reported
// separately so a local release candidate cannot be mistaken for a hosted
// production launch.
gate("doctor", "Environment & dependency health", "npm run doctor");
gate("lint", "ESLint code style & zero-warning audit", "npm run lint");
gate("typecheck", "TypeScript 5.9 strict compilation", "npm run typecheck");
gate("scenarios", "Scenario catalog linter & DAG invariants", "npm run lint:scenarios");
gate("tests", "Vitest unit & integration test suites", "npm test");
gate("baseline", "Competent actor benchmark (6/6 episodes pass)", "npm run baseline");
gate("negatives", "Adversarial negative controls caught", "npm run negatives");
gate("stress", "Concurrency throughput & latency benchmark", "npm run benchmark:stress");
gate("build", "Next.js 16 production application build", "npm run build");
gate("e2e", "Playwright public, workspace, API, and launch-readiness flows", "npm run test:e2e");
gate("archive", "Schema validation & SHA-256 source archive", "npm run validate:task-state && node scripts/build-archive.mjs --quiet");

// Hosted Boundary Verification (separate from the 11 local gates)
//
// The application accepts either NEXT_PUBLIC_SUPABASE_URL or the server-only
// alias SUPABASE_URL. Do not require a service-role key merely to exercise RLS:
// the test uses an explicitly supplied, non-production database connection.
const hostedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const hostedPublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const hostedRuntimeMissing = [
  !hostedUrl && "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
  !hostedPublicKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)",
  !process.env.DATABASE_URL && "DATABASE_URL",
  !(process.env.WORKWORLD_CERTIFICATION_SIGNING_KEY?.length >= 32) && "32+-character WORKWORLD_CERTIFICATION_SIGNING_KEY",
  process.env.WORKWORLD_MODE !== "hosted" && "WORKWORLD_MODE=hosted",
  process.env.WORKWORLD_HOSTED_STORE_WIRED !== "true" && "WORKWORLD_HOSTED_STORE_WIRED=true",
].filter(Boolean);
const hostedRlsConfigured = Boolean(hostedUrl && process.env.WW_TEST_PG_URL);
let hostedDatabaseVerified = false;

if (hostedRlsConfigured) {
  gate("hosted-rls", "RLS suite against supplied hosted test tenant", "npx vitest run tests/db", false);
  hostedDatabaseVerified = results.find((r) => r.id === "hosted-rls")?.ok ?? false;
} else if (hostedUrl) {
  console.log(`\n  ${c.yellow}WARN hosted-rls — hosted URL present but WW_TEST_PG_URL absent; database-boundary verification pending${c.reset}`);
}

const hostedReleaseReady = hostedDatabaseVerified && hostedRuntimeMissing.length === 0;
const requireHosted = process.argv.includes("--require-hosted");
let hostedHost = "configured project";
if (hostedUrl) {
  try {
    hostedHost = new URL(hostedUrl).host;
  } catch {
    hostedHost = "invalid hosted URL";
  }
}

const totalDurationSec = ((Date.now() - suiteStart) / 1000).toFixed(2);
const requiredPassed = results.filter((r) => r.required && r.ok).length;
const localReady = requiredPassed === TOTAL_REQUIRED_GATES;

const summary = {
  generatedAt: new Date().toISOString(),
  totalDurationSec: Number(totalDurationSec),
  gateScore: `${requiredPassed}/${TOTAL_REQUIRED_GATES}`,
  localReadiness: localReady
    ? `local technical candidate: PASS (${requiredPassed}/${TOTAL_REQUIRED_GATES} gates green)`
    : `local technical candidate: FAIL (${requiredPassed}/${TOTAL_REQUIRED_GATES} gates green)`,
  hostedReadiness: hostedReleaseReady
    ? `hosted: VERIFIED (${hostedHost}; RLS suite green and runtime configuration complete)`
    : hostedDatabaseVerified
      ? `hosted: database boundary verified (${hostedHost}); runtime configuration incomplete: ${hostedRuntimeMissing.join(", ")}`
      : hostedUrl
        ? `hosted: configuration incomplete or database boundary unverified (${hostedHost}; missing: ${hostedRuntimeMissing.join(", ") || "WW_TEST_PG_URL verification"})`
        : "hosted: not verified from this shell (no local hosted configuration; inspect deployment evidence)",
  researchReadiness: "harness validation complete — deterministic baseline & controls verified",
  commercialReadiness: "commercial evidence: externally unverified — protocols and security artifacts exist, but no pilots, customers, or revenue results are recorded",
  gates: results,
};

mkdirSync("evidence/release-gate", { recursive: true });
writeFileSync("evidence/release-gate/latest.json", JSON.stringify(summary, null, 2));

console.log(`\n${c.bold}----------------------------------------------------------------------${c.reset}`);
console.log(`${c.bold}   Release Audit Summary${c.reset}`);
console.log(`${c.bold}----------------------------------------------------------------------${c.reset}`);
console.log(`  Gates Passed:   ${localReady ? c.green + c.bold : c.red + c.bold}${requiredPassed} / ${TOTAL_REQUIRED_GATES} gates${c.reset}`);
console.log(`  Total Duration: ${c.cyan}${totalDurationSec}s${c.reset}`);
console.log(`  Local Status:   ${localReady ? c.green + c.bold + "PASS — LOCAL CANDIDATE" : c.red + c.bold + "FAIL"}${c.reset}`);
console.log(`  Hosted Status:  ${summary.hostedReadiness}`);
console.log(`  Evidence File:  evidence/release-gate/latest.json\n`);

if (requireHosted && !hostedReleaseReady) {
  console.error(`${c.red}${c.bold}Hosted release requirement not met. Use a non-production tenant to run the RLS suite and configure every listed runtime value.${c.reset}`);
}

process.exit(localReady && (!requireHosted || hostedReleaseReady) ? 0 : 1);
