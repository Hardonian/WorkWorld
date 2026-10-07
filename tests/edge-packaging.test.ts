import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Cloudflare Edge & OpenNext Packaging Validation", () => {
  it("verifies edge worker bundle and deployment manifest exist", () => {
    const workerFile = join(process.cwd(), "dist", "edge", "worker.js");
    const manifestFile = join(process.cwd(), "dist", "edge", "manifest.json");

    expect(existsSync(workerFile)).toBe(true);
    expect(existsSync(manifestFile)).toBe(true);

    const workerContent = readFileSync(workerFile, "utf8");
    expect(workerContent).toContain("WorkWorld Edge Worker Dispatcher");
    expect(workerContent).toContain("/health");
    expect(workerContent).toContain("/health/ready");

    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    expect(manifest.target).toBe("cloudflare-workers");
    expect(manifest.worker.sha256).toBeDefined();
  });
});
