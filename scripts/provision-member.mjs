#!/usr/bin/env node
/** Explicit operator provisioning; no Auth user creation or invitation email is sent. */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const email = value("--email");
const role = value("--role") ?? "participant";
const orgId = value("--org-id") ?? randomUUID();
const orgName = value("--org-name");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["participant", "assessor", "admin"].includes(role) || (!value("--org-id") && !orgName)) {
  console.error("Usage: node scripts/provision-member.mjs --email EMAIL --role participant|assessor|admin --org-id UUID|--org-name NAME [--apply]");
  process.exit(2);
}
if (!process.env.WW_ADMIN_DATABASE_URL) { console.error("Set the server-only WW_ADMIN_DATABASE_URL for the operator connection."); process.exit(2); }
const url = new URL(process.env.WW_ADMIN_DATABASE_URL);
for (const key of ["sslmode", "sslrootcert", "sslkey", "sslcert"]) url.searchParams.delete(key);
const ca = process.env.WORKWORLD_DB_CA_CERT ?? await readFile(new URL("../deploy/supabase/prod-ca-2021.crt", import.meta.url), "utf8");
const client = new Client({ connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true }, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
try {
  await client.connect();
  await client.query("begin");
  const user = await client.query("select id, email_confirmed_at from auth.users where lower(email)=lower($1)", [email]);
  if (user.rowCount !== 1 || !user.rows[0].email_confirmed_at) throw new Error("The confirmed Auth account must exist before membership provisioning.");
  const userId = user.rows[0].id;
  if (!value("--org-id")) await client.query("insert into workworld.orgs(id,name) values($1,$2)", [orgId, orgName]);
  else if ((await client.query("select id from workworld.orgs where id=$1", [orgId])).rowCount !== 1) throw new Error("Organization not found.");
  await client.query("insert into workworld.profiles(id,display_name) values($1,'Workspace member') on conflict(id) do nothing", [userId]);
  await client.query("insert into workworld.memberships(org_id,user_id,role) values($1,$2,$3) on conflict(org_id,user_id) do update set role=excluded.role", [orgId, userId, role]);
  const apply = args.includes("--apply");
  await client.query(apply ? "commit" : "rollback");
  console.log(JSON.stringify({ applied: apply, userId, orgId, role }));
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(error instanceof Error && /confirmed Auth|Organization not found/.test(error.message) ? error.message : "Provisioning failed. Check operator permissions and configuration; no membership was committed.");
  process.exitCode = 1;
} finally { await client.end(); }
