#!/usr/bin/env node
/**
 * Local-only hosted launch readiness check.
 *
 * It deliberately does not connect to Supabase, Postgres, a hosting provider,
 * or any other network service. It reports configuration presence and the
 * committed migration manifest without printing environment-variable values.
 *
 * Usage:
 *   node scripts/hosted-readiness.mjs
 *   node scripts/hosted-readiness.mjs --strict
 *   node scripts/hosted-readiness.mjs --json --strict
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MIGRATION_DIR = join(ROOT_DIR, "db", "migrations");
const MIGRATION_FILE_PATTERN = /^(\d{4,})_([a-z0-9][a-z0-9_-]*)\.sql$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function check(name, status, detail) {
  return { name, status, detail };
}

function hasValue(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalSqlHash(contents) {
  // Git can check SQL files out with CRLF on Windows. Hash canonical LF text so
  // the committed manifest remains portable across developer and deploy hosts.
  const canonical = contents.replace(/\r\n/g, "\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function inspectHttpsUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, origin: null };
  }
  try {
    const url = new URL(value);
    return {
      ok: url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password,
      origin: url.origin,
    };
  } catch {
    return { ok: false, origin: null };
  }
}

function inspectPostgresUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }
  try {
    const url = new URL(value);
    if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:") || !url.hostname) {
      return { ok: false, reason: "invalid" };
    }
    if (url.port === "6543") {
      return { ok: false, reason: "transaction-pooler" };
    }
    return { ok: true, reason: "valid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/**
 * Validate the canonical order and filename shape of a migration inventory.
 * Exported for focused unit tests and for future migration tooling.
 */
export function validateMigrationOrder(files) {
  const seenVersions = new Set();
  let previousVersion = null;

  for (const file of files) {
    const match = MIGRATION_FILE_PATTERN.exec(file);
    if (!match) {
      return { ok: false, reason: "migration filename does not use the required numeric-prefix format" };
    }
    const version = BigInt(match[1]);
    if (seenVersions.has(version.toString())) {
      return { ok: false, reason: "migration version prefixes must be unique" };
    }
    if (previousVersion !== null && version <= previousVersion) {
      return { ok: false, reason: "migration versions must be strictly increasing" };
    }
    seenVersions.add(version.toString());
    previousVersion = version;
  }

  return { ok: true, reason: "migration filenames use a unique, increasing numeric order" };
}

/**
 * Verify the checked-out SQL inventory against the committed manifest.
 * No migration is executed and no database is contacted.
 */
export function inspectMigrationManifest({
  migrationDirectory = DEFAULT_MIGRATION_DIR,
  manifestPath = join(migrationDirectory, "manifest.json"),
} = {}) {
  const checks = [];
  let files;
  try {
    files = readdirSync(migrationDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();
  } catch {
    return {
      ok: false,
      migrationCount: 0,
      checks: [check("Migration directory", "fail", "db/migrations is unavailable")],
    };
  }

  if (files.length === 0) {
    checks.push(check("Migration inventory", "fail", "no SQL migrations were found"));
  }

  const order = validateMigrationOrder(files);
  checks.push(check("Migration order", order.ok ? "pass" : "fail", order.reason));

  if (!existsSync(manifestPath)) {
    checks.push(check("Migration manifest", "fail", "manifest.json is missing"));
    return { ok: false, migrationCount: files.length, checks };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    checks.push(check("Migration manifest", "fail", "manifest.json is not valid JSON"));
    return { ok: false, migrationCount: files.length, checks };
  }

  const schemaOk =
    manifest &&
    typeof manifest === "object" &&
    manifest.version === 1 &&
    manifest.algorithm === "sha256" &&
    Array.isArray(manifest.migrations);
  checks.push(
    check(
      "Migration manifest schema",
      schemaOk ? "pass" : "fail",
      schemaOk ? "version 1 SHA-256 manifest" : "manifest must declare version 1, sha256, and migrations",
    ),
  );
  if (!schemaOk) {
    return { ok: false, migrationCount: files.length, checks };
  }

  const entries = manifest.migrations;
  const validEntries = entries.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.file === "string" &&
      typeof entry.sha256 === "string" &&
      SHA256_PATTERN.test(entry.sha256),
  );
  const manifestFiles = validEntries ? entries.map((entry) => entry.file) : [];
  const inventoryMatches =
    validEntries &&
    files.length === manifestFiles.length &&
    files.every((file, index) => file === manifestFiles[index]);
  checks.push(
    check(
      "Migration inventory",
      inventoryMatches ? "pass" : "fail",
      inventoryMatches
        ? `${files.length} ordered SQL migration(s) match the manifest`
        : "checked-out SQL migration inventory does not exactly match the manifest",
    ),
  );
  if (!inventoryMatches) {
    return { ok: false, migrationCount: files.length, checks };
  }

  const expectedHashes = new Map(entries.map((entry) => [entry.file, entry.sha256]));
  const mismatches = files.filter((file) => {
    const contents = readFileSync(join(migrationDirectory, file), "utf8");
    return canonicalSqlHash(contents) !== expectedHashes.get(file);
  });
  checks.push(
    check(
      "Migration SHA-256",
      mismatches.length === 0 ? "pass" : "fail",
      mismatches.length === 0
        ? "all migration contents match the committed manifest"
        : "one or more migration contents differ from the committed manifest",
    ),
  );

  return {
    ok: checks.every((item) => item.status === "pass"),
    migrationCount: files.length,
    checks,
  };
}

function postgresCheck(name, value, required) {
  const inspected = inspectPostgresUrl(value);
  if (inspected.ok) {
    return check(name, "pass", "session-capable PostgreSQL connection is configured");
  }
  if (!required && inspected.reason === "missing") {
    return check(name, "warn", "not configured; run the RLS suite against a non-production tenant before launch");
  }
  const detail =
    inspected.reason === "transaction-pooler"
      ? "transaction-pooler connections on port 6543 are not supported for RLS session claims"
      : "a PostgreSQL connection string is required";
  return check(name, "fail", detail);
}

/**
 * Assess environment presence/shape and migration integrity without showing
 * any value. A warning is advisory; only failed checks make the report unready.
 *
 * @param {{
 *   env?: Record<string, string | undefined>;
 *   migrationDirectory?: string;
 *   manifestPath?: string;
 * }} options
 */
export function assessHostedReadiness({
  env = process.env,
  migrationDirectory = DEFAULT_MIGRATION_DIR,
  manifestPath = join(migrationDirectory, "manifest.json"),
} = {}) {
  const checks = [];
  checks.push(
    check(
      "Runtime mode",
      env.WORKWORLD_MODE === "hosted" ? "pass" : "fail",
      env.WORKWORLD_MODE === "hosted"
        ? "WORKWORLD_MODE is hosted"
        : "set WORKWORLD_MODE=hosted in the deployment environment",
    ),
  );

  const hasPublicUrl = hasValue(env, "NEXT_PUBLIC_SUPABASE_URL");
  const hasServerUrl = hasValue(env, "SUPABASE_URL");
  const publicUrl = inspectHttpsUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serverUrl = inspectHttpsUrl(env.SUPABASE_URL);
  const projectUrlIsUsable =
    (hasPublicUrl || hasServerUrl) &&
    (!hasPublicUrl || publicUrl.ok) &&
    (!hasServerUrl || serverUrl.ok);
  checks.push(
    check(
      "Supabase project URL",
      projectUrlIsUsable ? "pass" : "fail",
      projectUrlIsUsable
        ? hasPublicUrl
          ? "HTTPS public project URL is configured"
          : "HTTPS server project URL is configured as the supported public-client fallback"
        : "set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL to an HTTPS project URL",
    ),
  );
  const bothUrlsConfigured = hasPublicUrl && hasServerUrl;
  const urlsAreConsistent = publicUrl.ok && serverUrl.ok && publicUrl.origin === serverUrl.origin;
  checks.push(
    check(
      "Supabase project consistency",
      bothUrlsConfigured && !urlsAreConsistent ? "fail" : bothUrlsConfigured ? "pass" : "warn",
      bothUrlsConfigured
        ? urlsAreConsistent
          ? "public and server clients point to the same project"
          : "public and server Supabase URLs must point to the same HTTPS project"
        : "one configured URL is supported; set both only when they target the same project",
    ),
  );

  const hasPublishableKey = hasValue(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const hasLegacyAnonKey = hasValue(env, "SUPABASE_ANON_KEY");
  checks.push(
    check(
      "Supabase browser key",
      hasPublishableKey || hasLegacyAnonKey ? "pass" : "fail",
      hasPublishableKey
        ? "publishable browser key is configured"
        : hasLegacyAnonKey
          ? "legacy browser key is configured; migrate to a publishable key when practical"
          : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY is required",
    ),
  );
  checks.push(
    check(
      "Supabase service key (optional)",
      hasValue(env, "SUPABASE_SERVICE_ROLE_KEY") ? "pass" : "warn",
      hasValue(env, "SUPABASE_SERVICE_ROLE_KEY")
        ? "server-only service key is configured"
        : "not configured; required only for explicitly implemented server-admin operations",
    ),
  );

  const exposedServerSecret = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_WORKWORLD_CERTIFICATION_SIGNING_KEY",
  ].some((name) => hasValue(env, name));
  checks.push(
    check(
      "Public secret boundary",
      exposedServerSecret ? "fail" : "pass",
      exposedServerSecret
        ? "a server-only credential is configured with a NEXT_PUBLIC_ prefix"
        : "no known server-only credential is exposed through NEXT_PUBLIC_",
    ),
  );

  checks.push(postgresCheck("Application Postgres connection", env.DATABASE_URL, true));
  checks.push(postgresCheck("RLS test Postgres connection", env.WW_TEST_PG_URL, false));

  const signingKey = env.WORKWORLD_CERTIFICATION_SIGNING_KEY;
  checks.push(
    check(
      "Certification signing key",
      typeof signingKey === "string" && signingKey.length >= 32 ? "pass" : "fail",
      typeof signingKey === "string" && signingKey.length >= 32
        ? "server-only signing key meets the minimum length"
        : "WORKWORLD_CERTIFICATION_SIGNING_KEY must be a server-only secret of at least 32 characters",
    ),
  );
  checks.push(
    check(
      "Hosted EventStore activation",
      env.WORKWORLD_HOSTED_STORE_WIRED === "true" ? "pass" : "fail",
      env.WORKWORLD_HOSTED_STORE_WIRED === "true"
        ? "activation flag is set; verify authenticated storage operations before deployment"
        : "set WORKWORLD_HOSTED_STORE_WIRED=true only after authenticated storage and RLS tests pass",
    ),
  );

  const migrations = inspectMigrationManifest({ migrationDirectory, manifestPath });
  checks.push(...migrations.checks);

  return {
    scope: "local configuration and migration-manifest inspection only; no network calls or credential validation",
    ready: checks.every((item) => item.status !== "fail"),
    migrationCount: migrations.migrationCount,
    checks,
  };
}

export function exitCodeForReadiness(report, strict) {
  return strict && !report.ready ? 1 : 0;
}

function parseArgs(args) {
  const allowed = new Set(["--strict", "--json"]);
  const unknown = args.filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) {
    return { ok: false, strict: false, json: false };
  }
  return { ok: true, strict: args.includes("--strict"), json: args.includes("--json") };
}

function printReport(report) {
  console.log("WorkWorld hosted launch readiness (local-only; no credentials shown)");
  for (const item of report.checks) {
    const label = item.status.toUpperCase().padEnd(4);
    console.log(`${label} ${item.name}: ${item.detail}`);
  }
  console.log(`\nStatus: ${report.ready ? "READY FOR OPERATOR VERIFICATION" : "NOT READY"}`);
  console.log(`Scope: ${report.scope}`);
}

const isDirectInvocation = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectInvocation) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error("Usage: node scripts/hosted-readiness.mjs [--strict] [--json]");
    process.exitCode = 2;
  } else {
    const report = assessHostedReadiness();
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
    process.exitCode = exitCodeForReadiness(report, args.strict);
  }
}
