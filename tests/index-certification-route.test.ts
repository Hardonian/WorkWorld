import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getHostedIdentity: vi.fn() }));

vi.mock("../src/server/supabase-auth.ts", () => ({
  getHostedIdentity: mocks.getHostedIdentity,
}));

import { POST } from "../src/app/api/index/certifications/route.ts";

afterEach(() => {
  delete process.env.WORKWORLD_MODE;
});

describe("WorkWorld Index certification endpoint", () => {
  it("requires verified identity before a hosted preflight is created", async () => {
    process.env.WORKWORLD_MODE = "hosted";
    mocks.getHostedIdentity.mockResolvedValue(null);
    const response = await POST(new Request("http://workworld.test/api/index/certifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentName: "FinanceOps", adapter: "openai-compatible", maxBudgetUsd: 25 }),
    }) as never);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("keeps the local demo preflight usable without a hosted account", async () => {
    mocks.getHostedIdentity.mockResolvedValue(null);
    const response = await POST(new Request("http://workworld.test/api/index/certifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentName: "FinanceOps", adapter: "openai-compatible", maxBudgetUsd: 25 }),
    }) as never);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ schema: "workworld-index/preflight@1" });
  });
});
