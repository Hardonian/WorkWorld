import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
execFileSync(process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), "scripts/build-edge.ts"], { stdio: "inherit", windowsHide: true });
execFileSync(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "tests/edge-packaging.test.ts"], { stdio: "inherit", windowsHide: true, env: { ...process.env, WORKWORLD_VERIFY_EDGE: "true" } });
