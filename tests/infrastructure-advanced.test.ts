import { describe, it, expect } from "vitest";
import { MigrationRunner } from "../src/server/migrations.ts";
import { MemoryCache } from "../src/server/cache.ts";
import { generateTraceContext, formatW3cTraceparent, parseW3cTraceparent } from "../src/server/telemetry.ts";

describe("Zero-Downtime Migration Runner (Item 081)", () => {
  it("plans and applies pending migrations sequentially", () => {
    const runner = new MigrationRunner([
      { version: 1, name: "create_users", upSql: "CREATE TABLE users", downSql: "DROP TABLE users" },
      { version: 2, name: "add_roles", upSql: "ALTER TABLE users ADD role", downSql: "ALTER TABLE users DROP role" },
    ]);

    const pending = runner.planPending([1]);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.version).toBe(2);

    const res = runner.simulateMigration(pending[0]!);
    expect(res.ok).toBe(true);
    expect(runner.planPending([1, 2])).toHaveLength(0);
  });
});

describe("In-Memory Caching (Item 082)", () => {
  it("stores, retrieves, and expires cache keys", async () => {
    const cache = new MemoryCache(2);
    cache.set("k1", "val1", 60);
    cache.set("k2", "val2", 60);

    expect(cache.get("k1")).toBe("val1");
    expect(cache.get("k2")).toBe("val2");

    // Exceeding capacity evicts oldest key
    cache.set("k3", "val3", 60);
    expect(cache.size()).toBe(2);
    expect(cache.get("k1")).toBeNull();
  });
});

describe("OpenTelemetry Tracing (Item 084)", () => {
  it("formats and parses W3C traceparent headers correctly", () => {
    const ctx = generateTraceContext();
    const header = formatW3cTraceparent(ctx);
    expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

    const parsed = parseW3cTraceparent(header);
    expect(parsed?.traceId).toBe(ctx.traceId);
    expect(parsed?.spanId).toBe(ctx.spanId);
    expect(parsed?.sampled).toBe(true);
  });
});
