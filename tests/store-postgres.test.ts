import { describe, it, expect } from "vitest";
import { PostgresStore } from "../src/server/store-postgres.ts";
import { hostedModeAvailable } from "../src/server/session.ts";

describe("PostgresStore Architecture & Interface (Tier 1, Blocker B3)", () => {
  it("instantiates cleanly with default or custom options", () => {
    const store = new PostgresStore({
      connectionString: "postgres://mock:mock@localhost:5432/mock_db",
      defaultOrgId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    });
    expect(store).toBeDefined();
    expect(typeof store.createRun).toBe("function");
    expect(typeof store.appendAction).toBe("function");
    expect(typeof store.saveState).toBe("function");
    expect(typeof store.loadState).toBe("function");
  });

  it("handles hostedModeAvailable toggle when WORKWORLD_HOSTED_STORE_WIRED is enabled", () => {
    process.env.WORKWORLD_MODE = "hosted";
    process.env.SUPABASE_URL = "https://mock.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.WORKWORLD_HOSTED_STORE_WIRED = "true";

    const status = hostedModeAvailable();
    expect(status.available).toBe(true);
    expect(status.reason).toMatch(/fully wired/);

    delete process.env.WORKWORLD_MODE;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WORKWORLD_HOSTED_STORE_WIRED;
  });

  it("safely cleans up connection pools", async () => {
    const store = new PostgresStore();
    await expect(store.close()).resolves.not.toThrow();
  });
});
