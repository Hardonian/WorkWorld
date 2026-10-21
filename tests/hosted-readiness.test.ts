import { describe, expect, it } from "vitest";
import {
  assessHostedReadiness,
  exitCodeForReadiness,
  inspectMigrationManifest,
  validateMigrationOrder,
} from "../scripts/hosted-readiness.mjs";

const readyEnv: Record<string, string> = {
  WORKWORLD_MODE: "hosted",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value-that-must-not-appear",
  DATABASE_URL: "postgresql://user:database-password@db.example.test:5432/postgres",
  WORKWORLD_CERTIFICATION_SIGNING_KEY: "a".repeat(32),
  WORKWORLD_HOSTED_STORE_WIRED: "true",
};

describe("hosted launch readiness checker", () => {
  it("accepts the current ordered migration manifest", () => {
    const manifest = inspectMigrationManifest();
    expect(manifest.ok).toBe(true);
    expect(manifest.migrationCount).toBeGreaterThanOrEqual(4);
  });

  it("rejects non-increasing or malformed migration file names", () => {
    expect(validateMigrationOrder(["0002_second.sql", "0001_first.sql"]).ok).toBe(false);
    expect(validateMigrationOrder(["migration.sql"]).ok).toBe(false);
  });

  it("reports only configuration state, never credential values", () => {
    const report = assessHostedReadiness({ env: readyEnv });
    const rendered = JSON.stringify(report);

    expect(report.ready).toBe(true);
    expect(rendered).not.toContain(readyEnv.SUPABASE_SERVICE_ROLE_KEY);
    expect(rendered).not.toContain("database-password");
    expect(rendered).not.toContain(readyEnv.WORKWORLD_CERTIFICATION_SIGNING_KEY);
  });

  it("accepts the app-supported Supabase URL and browser-key fallbacks without a service role key", () => {
    const report = assessHostedReadiness({
      env: {
        ...readyEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
        SUPABASE_ANON_KEY: "legacy-browser-key",
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
    });

    expect(report.ready).toBe(true);
    expect(report.checks.find((item) => item.name === "Supabase service key (optional)")?.status).toBe("warn");
  });

  it("makes an incomplete or transaction-pooled hosted configuration fail only in strict mode", () => {
    const report = assessHostedReadiness({
      env: {
        ...readyEnv,
        DATABASE_URL: "postgresql://user:password@db.example.test:6543/postgres",
        WORKWORLD_CERTIFICATION_SIGNING_KEY: "too-short",
      },
    });

    expect(report.ready).toBe(false);
    expect(exitCodeForReadiness(report, false)).toBe(0);
    expect(exitCodeForReadiness(report, true)).toBe(1);
    expect(report.checks.some((item) => item.detail.includes("6543"))).toBe(true);
  });
});
