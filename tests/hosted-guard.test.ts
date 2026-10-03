import { describe, it, expect, afterEach } from "vitest";
import { hostedModeAvailable } from "../src/server/session.ts";

afterEach(() => {
  delete process.env.WORKWORLD_MODE;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    expect(h.reason).toMatch(/missing: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/);
    expect(h.reason).toMatch(/no fallback to demo data/);
  });

  it("hosted mode with configuration stays disabled until the application store/auth path is wired", () => {
    process.env.WORKWORLD_MODE = "hosted";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "not-a-real-key";
    const h = hostedModeAvailable();
    expect(h.available).toBe(false);
    expect(h.reason).toMatch(/not wired/);
    expect(h.reason).toMatch(/no fallback/);
  });
});
