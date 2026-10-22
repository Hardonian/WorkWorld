import { afterEach, describe, expect, it, vi } from "vitest";
import { hostedPathPolicy } from "../src/server/hosted-capabilities.ts";
import { PostgresStore, postgresConnectionOptions } from "../src/server/store-postgres.ts";
import { requestErrorResponse } from "../src/server/http.ts";
import { POST as checkout } from "../src/app/api/billing/checkout/route.ts";
import { POST as stripeWebhook, runtime } from "../src/app/api/webhooks/stripe/route.ts";

afterEach(() => vi.unstubAllEnvs());

describe("hosted production boundaries", () => {
  it("blocks fixture-backed integrations and protects private workspaces", () => {
    for (const url of ["/api/webhooks/stripe", "/api/lti/launch", "/api/billing/checkout", "/api/assist"]) expect(hostedPathPolicy(url)).toBe("unavailable");
    expect(hostedPathPolicy("/api/assessor")).toBe("authenticated");
    expect(hostedPathPolicy("/workspace")).toBe("authenticated");
    expect(hostedPathPolicy("/health")).toBe("public");
  });

  it("cannot create a fabricated hosted checkout or acknowledge an unprocessed webhook", async () => {
    vi.stubEnv("WORKWORLD_MODE", "hosted");
    expect((await checkout(new Request("https://workworld.test/api/billing/checkout") as never)).status).toBe(503);
    expect((await stripeWebhook(new Request("https://workworld.test/api/webhooks/stripe") as never)).status).toBe(503);
    expect(runtime).toBe("nodejs");
  });

  it("keeps database credentials and exception details out of errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = requestErrorResponse(new Error("postgresql://private-password@db"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-password");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("private-password");
    spy.mockRestore();
  });

  it("rolls back failed transactions before releasing pooled connections", async () => {
    const commands: string[] = [];
    const release = vi.fn();
    const client = { query: vi.fn(async (sql: string) => { commands.push(sql); return { rows: [] }; }), release };
    const store = new PostgresStore({ pool: { connect: async () => client } as never, requireAuthenticatedIdentity: true, jwtClaims: { sub: "11111111-1111-1111-1111-111111111111" } });
    await expect(store.withClient(async () => { throw new Error("operation failed"); })).rejects.toThrow("operation failed");
    expect(commands).toEqual(["begin", "set local role authenticated", "select set_config('request.jwt.claims', $1, true)", "rollback"]);
    expect(release).toHaveBeenCalledWith(false);
  });

  it("destroys a connection if rollback fails", async () => {
    const release = vi.fn();
    const client = { query: vi.fn(async (sql: string) => { if (sql === "rollback") throw new Error("connection lost"); }), release };
    const store = new PostgresStore({ pool: { connect: async () => client } as never });
    await expect(store.withClient(async () => { throw new Error("write failed"); })).rejects.toThrow("write failed");
    expect(release).toHaveBeenCalledWith(true);
  });

  it("retains CA and hostname verification even if URL SSL parameters are present", () => {
    vi.stubEnv("WORKWORLD_DB_CA_CERT", "trusted-ca");
    const options = postgresConnectionOptions("postgresql://test:test@database.example/test?sslmode=no-verify");
    expect(options.ssl).toEqual({ ca: "trusted-ca", rejectUnauthorized: true });
    expect(options.connectionString).not.toContain("sslmode");
  });
});
