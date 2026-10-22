import { describe, it, expect, afterEach } from "vitest";
import { hostedModeAvailable } from "../src/server/session.ts";

afterEach(() => {
  for (const key of [
    "WORKWORLD_MODE",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "WORKWORLD_HOSTED_STORE_WIRED",
  ]) {
    delete process.env[key];
  }
});

describe("hosted mode availability (honest degradation)", () => {
  it("demo mode never claims hosted availability", () => {
    const h = hostedModeAvailable();
    expect(h.available).toBe(false);
    expect(h.reason).toMatch(/demo/);
  });

  it("hosted mode without configuration is disabled with an explicit reason and no demo fallback", () => {
    process.env.WORKWORLD_MODE = "hosted";
    const h = hostedModeAvailable();
    expect(h.available).toBe(false);
    expect(h.reason).toMatch(/missing: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DATABASE_URL/);
    expect(h.reason).toMatch(/no fallback to demo data/);
  });

  it("hosted mode with configuration stays disabled until the application store/auth path is wired", () => {
    process.env.WORKWORLD_MODE = "hosted";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.DATABASE_URL = "postgres://user:password@localhost:5432/workworld";
    const h = hostedModeAvailable();
    expect(h.available).toBe(false);
    expect(h.reason).toMatch(/awaiting authenticated acceptance and activation/);
    expect(h.reason).toMatch(/no fallback/);
  });
});
