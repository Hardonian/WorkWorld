#!/usr/bin/env tsx
/**
 * Validate TASK_STATE.json against the zod schema in src/schema/taskState.ts
 * and (re)write the JSON Schema representation to docs/TASK_STATE.schema.json.
 *
 * Usage:
 *   npx tsx scripts/validate-task-state.ts            # validate + refresh schema doc
 *   npx tsx scripts/validate-task-state.ts --check    # validate only (no writes)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { TaskState } from "../src/schema/taskState.ts";

const root = resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");

const raw = readFileSync(resolve(root, "TASK_STATE.json"), "utf8");
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`TASK_STATE.json is not valid JSON: ${(err as Error).message}`);
  process.exit(1);
}

const result = TaskState.safeParse(parsed);
if (!result.success) {
  console.error("TASK_STATE.json FAILED schema validation:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

if (!checkOnly) {
  const jsonSchema = z.toJSONSchema(TaskState, { io: "input" });
  writeFileSync(
    resolve(root, "docs/TASK_STATE.schema.json"),
    JSON.stringify(jsonSchema, null, 2) + "\n",
  );
}

console.log(
  `TASK_STATE.json OK: ${result.data.milestones.length} milestones, ` +
    `${result.data.externalBlockers.length} external blockers` +
    (checkOnly ? "" : "; docs/TASK_STATE.schema.json refreshed"),
);
