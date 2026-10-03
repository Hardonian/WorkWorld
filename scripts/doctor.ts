import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface DoctorResult {
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}

export function runDoctor(): DoctorResult {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({ name: "Node.js", ok: nodeMajor >= 22, detail: process.versions.node });
  checks.push({ name: "Lockfile", ok: existsSync("package-lock.json"), detail: "package-lock.json" });
  checks.push({ name: "Dependencies", ok: existsSync("node_modules/next/package.json"), detail: "node_modules" });

  const mode = process.env.WORKWORLD_MODE ?? "demo";
  checks.push({
    name: "Runtime mode",
    ok: mode === "demo",
    detail:
      mode === "demo"
        ? "demo (local file/memory persistence)"
        : "hosted selected, but the application auth/Postgres store path is not wired",
  });

  if (mode === "demo" && (process.env.WORKWORLD_STORE ?? "file") === "file") {
    const dataDir = resolve(process.env.WORKWORLD_DATA_DIR ?? "./var/demo-data");
    try {
      mkdirSync(dataDir, { recursive: true });
      accessSync(dataDir, constants.R_OK | constants.W_OK);
      checks.push({ name: "Demo data directory", ok: true, detail: dataDir });
    } catch {
      checks.push({ name: "Demo data directory", ok: false, detail: `${dataDir} is not readable/writable` });
    }
  }

  checks.push({
    name: "Assistant provider",
    ok: true,
    detail: process.env.OPENAI_API_KEY
      ? "OpenAI-compatible provider configured (credential not displayed)"
      : `optional local endpoint: ${process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"}`,
  });

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`);
  }

  const ok = !checks.some((check) => !check.ok);
  if (!ok) process.exitCode = 1;
  return { ok, checks };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/doctor.ts")) {
  runDoctor();
}
