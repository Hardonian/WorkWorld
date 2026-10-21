import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AgentSafetyCertificationRunner } from "../src/server/agent-certification.ts";
import { supabasePublicConfig } from "../src/server/supabase-auth.ts";

describe("WorkWorld Index enterprise foundations", () => {
  it("does not permit a source-embedded certificate signing secret", () => {
    expect(() => new AgentSafetyCertificationRunner("short")).toThrow(/32 characters/);
  });

  it("keeps certification metadata in private RLS-protected tables", () => {
    const migration = readFileSync("db/migrations/0004_index_certification.sql", "utf8");
    expect(migration).toContain("alter table workworld.certification_preflights enable row level security");
    expect(migration).toContain("alter table workworld.certification_artifacts enable row level security");
    expect(migration).toContain("configuration_digest");
  });

  it("is inert until public Supabase credentials are explicitly configured", () => {
    const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(supabasePublicConfig()).toBeNull();
    if (oldUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  });
});
