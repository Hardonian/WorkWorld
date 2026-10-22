import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe.skipIf(process.env.WORKWORLD_VERIFY_EDGE !== "true")("optional real Cloudflare build", () => {
  it("contains the compiled OpenNext application rather than a placeholder dispatcher", () => {
    expect(existsSync(".open-next/worker.js")).toBe(true);
    const worker = readFileSync(".open-next/worker.js", "utf8");
    expect(worker).not.toContain("WorkWorld Edge Runtime Active");
    expect(worker).not.toContain('ready: true');
    expect(existsSync(".open-next/server-functions/default/handler.mjs")).toBe(true);
  });
});
