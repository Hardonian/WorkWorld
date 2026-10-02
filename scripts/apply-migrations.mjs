#!/usr/bin/env node
/**
 * Apply db/migrations/*.sql in order to the target database.
 * Target: WW_TEST_PG_URL (session-mode pooler or direct) or DATABASE_URL.
 * Migrations are idempotent (guarded role creation, `if not exists` DDL).
 *
 * Refuses transaction-pooler URLs (:6543): `set role` / `set_config`
 * session state is required by the RLS suite and breaks across pooled
 * transactions. Use session mode (:5432) or a direct connection.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const url = process.env.WW_TEST_PG_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("apply-migrations: set WW_TEST_PG_URL or DATABASE_URL");
  process.exit(1);
}
if (url.includes(":6543/")) {
  console.error(
    "apply-migrations: refusing transaction-pooler URL (:6543). Use session mode (:5432) or direct connection.",
  );
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new Client({
  connectionString: url,
  ssl: url.includes("supabase.com") ? undefined : undefined,
});
await client.connect();
try {
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    const t0 = Date.now();
    await client.query(sql);
    console.log(`applied ${f} (${Date.now() - t0}ms)`);
  }
  console.log(`apply-migrations: ${files.length} file(s) OK`);
} finally {
  await client.end();
}
