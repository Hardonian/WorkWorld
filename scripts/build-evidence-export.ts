/**
 * Build a reviewable, sanitized evidence export (no secrets, no participant data).
 * Per the independent review contract: candidate identity, case mapping,
 * technical logs, grader controls, evaluation manifests, workflow evidence,
 * hosted boundaries, deployment proof, external evidence.
 *
 * Usage: npx tsx scripts/build-evidence-export.ts --label m5 [--skip-checks]
 * Output: evidence-exports/<label>/ + evidence-exports/<label>.zip
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function sh(cmd: string): { cmd: string; output: string; exitCode: number } {
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { cmd, output: output.slice(-8000), exitCode: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      cmd,
      output: `${err.stdout ?? ""}\n${err.stderr ?? ""}`.slice(-8000),
      exitCode: err.status ?? 1,
    };
  }
}

async function main() {
  const label = arg("label", `export-${Date.now()}`)!;
  const root = process.cwd();
  const outDir = join(root, "evidence-exports", label);
  mkdirSync(outDir, { recursive: true });

  // --- Candidate identity -------------------------------------------------
  const commit = sh("git rev-parse HEAD").output.trim();
  const branch = sh("git rev-parse --abbrev-ref HEAD").output.trim();
  const dirty = sh("git status --porcelain").output.trim().split("\n").filter(Boolean);
  const identity = {
    repository: "https://github.com/Hardonian/WorkWorld",
    branch,
    commit,
    dirtyTree: dirty,
    generatedAt: new Date().toISOString(),
    graderVersion: "1.0.0",
    taskState: JSON.parse(readFileSync(join(root, "TASK_STATE.json"), "utf8")).milestones.map(
      (m: { id: string; status: string }) => ({ id: m.id, status: m.status }),
    ),
  };
  writeFileSync(join(outDir, "candidate-identity.json"), JSON.stringify(identity, null, 2));

  // --- Technical logs (real commands, real output) -------------------------
  const logs: ReturnType<typeof sh>[] = [];
  if (!arg("skip-checks")) {
    logs.push(sh("npx tsc --noEmit"));
    logs.push(sh("npx vitest run"));
    logs.push(sh("npm run baseline"));
    logs.push(sh("npm run negatives"));
    logs.push(sh("npx tsx scripts/eval-runner.ts --adapter baseline --out eval-runs"));
    logs.push(sh("npx tsx scripts/eval-runner.ts --adapter negatives-with-controls --out eval-runs"));
  }
  writeFileSync(
    join(outDir, "technical-logs.txt"),
    logs
      .map(
        (l) =>
          `COMMAND: ${l.cmd}\nEXIT: ${l.exitCode}\n---\n${l.output}\n===`,
      )
      .join("\n") || "(checks skipped for this export run)",
  );

  // --- Case mapping + grader contract ------------------------------------
  for (const f of [
    "docs/validation-pack/CASE_MAPPING.md",
    "docs/GRADER_CONTRACT.md",
    "docs/RELEASE_CHECKLIST.md",
  ]) {
    if (existsSync(f)) cpSync(f, join(outDir, f.replace(/\//g, "_")));
  }

  // --- Evaluation manifests (raw, with failures retained) -----------------
  const manifestDir = join(outDir, "run-manifests");
  mkdirSync(manifestDir, { recursive: true });
  if (existsSync("eval-runs")) {
    for (const f of readdirSync("eval-runs")) {
      if (f.endsWith(".json") || f.endsWith(".csv") || f.endsWith(".md")) {
        cpSync(join("eval-runs", f), join(manifestDir, f));
      }
    }
  }

  // --- Workflow evidence (real screenshots) -------------------------------
  if (existsSync("evidence/m3/screenshots")) {
    cpSync("evidence/m3/screenshots", join(outDir, "workflow-screenshots"), { recursive: true });
  }

  // --- Hosted boundaries / deployment proof / external evidence -----------
  writeFileSync(
    join(outDir, "hosted-boundaries.md"),
    `# Hosted boundaries\n\nStatus: **unverified against a hosted project** (external blocker B1, docs/BLOCKERS.md).\nRLS policies and migrations are tested against a local Dockerized Postgres with\nSupabase-compatible roles (scope of that test stated in the M6 evidence).\nHosted readiness is reported SEPARATELY from the synthetic local demo.\nGenerated: ${new Date().toISOString()}\n`,
  );
  writeFileSync(
    join(outDir, "deployment-proof.md"),
    `# Deployment proof\n\nStatus at this export: see the label's README. Local technical candidate only until\nthe M8 export records clean-install, smoke, backup/restore and rollback evidence.\nNo hosted preview URL exists; none is claimed.\n`,
  );
  writeFileSync(
    join(outDir, "external-evidence.md"),
    `# External evidence\n\nNone. No practitioner review, human study, pilot, customer, or revenue exists.\nPractitioner review and human-study governance are pending (materials/ drafts).\nNo participant data has been collected.\n`,
  );

  // --- README index with readiness states ---------------------------------
  writeFileSync(
    join(outDir, "README.md"),
    `# WorkWorld evidence export — ${label}\n\nGenerated ${new Date().toISOString()} · commit \`${commit}\` · branch \`${branch}\`\nDirty tree at generation: ${dirty.length} file(s) — see candidate-identity.json.\n\n## Readiness states (kept distinct)\n\n| Dimension | State |\n|-----------|-------|\n| Local technical candidate | ${identity.taskState.find((m: { id: string }) => m.id === "M7")?.status === "passed" ? "verified" : "in progress — see TASK_STATE"} |\n| Hosted candidate | **blocked/external** (no hosted config; B1) |\n| Research evidence | **harness validation only** — no live-model or human results |\n| Commercial evidence | **none** — protocols only (no customers, pilots, or revenue) |\n\n## Contents\n\n- candidate-identity.json — repo/branch/commit/dirty-tree/task states\n- technical-logs.txt — exact commands, exit codes, actual output (failures retained)\n- docs_validation-pack_CASE_MAPPING.md — WW-X case → test mapping with limitations\n- docs_GRADER_CONTRACT.md — checks, categories, claim limits\n- run-manifests/ — raw manifests, CSVs and reports (fixture vs stochastic separated)\n- workflow-screenshots/ — real product interactions\n- hosted-boundaries.md / deployment-proof.md / external-evidence.md\n\n## Claim limits\n\nFixture runs validate the harness; they are not model-capability evidence.\nDeterministic checks verify narrow tested properties only. Nothing here is\nverified skill, employability, accreditation, hiring suitability, or traction.\n`,
  );

  // --- Zip ----------------------------------------------------------------
  sh(`cd ${JSON.stringify(join(root, "evidence-exports"))} && zip -qr ${label}.zip ${label}`);
  console.log(`export: ${outDir}`);
  console.log(`zip:    ${join(root, "evidence-exports", `${label}.zip`)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
