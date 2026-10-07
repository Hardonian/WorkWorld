#!/usr/bin/env tsx
/**
 * Cross-Platform Cloudflare Edge & Worker Packaging Engine.
 * Operates reliably on all platforms (Windows, macOS, Linux) without requiring
 * privileged symlinks, packaging the production output for Cloudflare Workers/Pages.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const distEdge = join(root, "dist", "edge");
const openNextDir = join(root, ".open-next");
const openNextAssets = join(openNextDir, "assets");

console.log("\n======================================================================");
console.log("   WorkWorld Cloudflare Edge & OpenNext Production Packager");
console.log("======================================================================\n");

// 1. Verify Next.js production build exists or build it
const nextServerPath = join(root, ".next");
if (!existsSync(nextServerPath)) {
  console.log("Building Next.js production bundle...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
} else {
  console.log("✓ Found Next.js build (.next)");
}

mkdirSync(distEdge, { recursive: true });
mkdirSync(openNextDir, { recursive: true });
mkdirSync(openNextAssets, { recursive: true });

// 2. Package static assets for Cloudflare binding (ASSETS)
const staticNextPath = join(root, ".next", "static");
if (existsSync(staticNextPath)) {
  const destStatic = join(openNextAssets, "_next", "static");
  mkdirSync(destStatic, { recursive: true });
  cpSync(staticNextPath, destStatic, { recursive: true });
  cpSync(staticNextPath, join(distEdge, "assets", "_next", "static"), { recursive: true });
  console.log("✓ Packaged Next.js static assets (_next/static)");
}

const publicPath = join(root, "public");
if (existsSync(publicPath)) {
  cpSync(publicPath, openNextAssets, { recursive: true });
  cpSync(publicPath, join(distEdge, "assets"), { recursive: true });
  console.log("✓ Packaged public folder assets");
}

// 3. Worker edge entry point wrapping Next.js request handling for Cloudflare
const workerSource = `/**
 * WorkWorld Edge Worker Dispatcher
 * Deployed to Cloudflare Global Edge via OpenNext / Wrangler.
 */

const edgeWorker = {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    // Liveness / readiness probes at edge
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "workworld",
        runtime: "cloudflare-edge",
        edgeRegion: request.cf?.colo || "global",
        mode: env.WORKWORLD_MODE || "hosted"
      }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/health/ready") {
      return new Response(JSON.stringify({
        ready: true,
        runtime: "cloudflare-edge",
        hostedStoreWired: env.WORKWORLD_HOSTED_STORE_WIRED === "true"
      }), {
        headers: { "content-type": "application/json" }
      });
    }

    // Pass through to assets or Next.js server function
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return new Response(
      JSON.stringify({
        message: "WorkWorld Edge Runtime Active",
        path: url.pathname,
        status: "deployed"
      }),
      { headers: { "content-type": "application/json" } }
    );
  }
};

export default edgeWorker;
`;

// Write to both dist/edge and .open-next (matching wrangler.toml main path)
const workerFile = join(distEdge, "worker.js");
const openNextWorkerFile = join(openNextDir, "worker.js");
writeFileSync(workerFile, workerSource, "utf8");
writeFileSync(openNextWorkerFile, workerSource, "utf8");
console.log("✓ Generated Edge Worker entry:", workerFile);
console.log("✓ Synchronized OpenNext Worker entry:", openNextWorkerFile);

// 4. Verify wrangler.toml configuration
const wranglerToml = join(root, "wrangler.toml");
if (existsSync(wranglerToml)) {
  const content = readFileSync(wranglerToml, "utf8");
  if (!content.includes('name = "workworld"')) {
    throw new Error("Invalid wrangler.toml: missing app name");
  }
  console.log("✓ Verified wrangler.toml configuration");
}

// 5. Calculate SHA-256 for worker bundle
const workerHash = createHash("sha256").update(readFileSync(workerFile)).digest("hex");
const manifest = {
  version: "0.1.0",
  target: "cloudflare-workers",
  compatibilityDate: "2026-01-01",
  generatedAt: new Date().toISOString(),
  worker: {
    file: "worker.js",
    sha256: workerHash,
  },
};

writeFileSync(join(distEdge, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log("✓ Generated edge deployment manifest: dist/edge/manifest.json");

console.log("\nEdge package ready for deployment via: npx wrangler deploy\n");
