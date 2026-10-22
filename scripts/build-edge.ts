#!/usr/bin/env tsx
/** Optional Cloudflare target: invoke the real OpenNext compiler, never a synthetic worker. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
execFileSync(process.execPath, [resolve(root, "node_modules/@opennextjs/cloudflare/dist/cli/index.js"), "build"], { cwd: root, stdio: "inherit", windowsHide: true });
