import { describe, it, expect } from "vitest";
import { TokenBucketRateLimiter } from "../src/server/rate-limiter.ts";
import { signWebhookPayload, dispatchWebhook } from "../src/server/webhooks.ts";
import { WORKWORLD_MCP_TOOLS, handleMcpRequest } from "../src/server/mcp.ts";
import { WorkWorldClient } from "../src/sdk/client.ts";

describe("Developer Platform & API Infrastructure", () => {
  describe("Rate Limiting", () => {
    it("allows requests within capacity and blocks over-limit requests", () => {
      const limiter = new TokenBucketRateLimiter(3, 0); // 3 tokens, 0 refill
      expect(limiter.check("client-1").allowed).toBe(true);
      expect(limiter.check("client-1").allowed).toBe(true);
      expect(limiter.check("client-1").allowed).toBe(true);
      // 4th request must be blocked
      const result = limiter.check("client-1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("Outbound Webhooks", () => {
    it("signs payloads deterministically with HMAC-SHA256", () => {
      const secret = "test-secret-key-123";
      const payload = JSON.stringify({ test: "data" });
      const sig1 = signWebhookPayload(payload, secret);
      const sig2 = signWebhookPayload(payload, secret);
      expect(sig1).toBe(sig2);
      expect(sig1.length).toBe(64); // SHA-256 hex string
    });

    it("skips dispatch if event type is not subscribed", async () => {
      const res = await dispatchWebhook(
        { url: "https://example.com/webhook", secret: "sec", events: ["grade.finalized"] },
        "action.executed",
        "run-1",
        "A1",
        1,
        {}
      );
      expect(res.ok).toBe(true);
    });
  });

  describe("Model Context Protocol (MCP)", () => {
    it("lists all available operations tools", async () => {
      expect(WORKWORLD_MCP_TOOLS.length).toBeGreaterThanOrEqual(4);
      const res = await handleMcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      });

      expect(res.jsonrpc).toBe("2.0");
      expect(res.result).toBeDefined();
      if (!res.result || !("tools" in res.result) || !Array.isArray(res.result.tools)) {
        throw new Error("Expected tools array in result");
      }
      expect(res.result.tools.length).toBeGreaterThanOrEqual(4);
      const toolNames = res.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain("observe_state");
      expect(toolNames).toContain("submit_action");
      expect(toolNames).toContain("get_financial_ledger");
    });
  });

  describe("Client SDK Instance", () => {
    it("instantiates client with custom baseUrl and exposes operations methods", () => {
      const client = new WorkWorldClient({ baseUrl: "https://api.workworld.internal" });
      expect(client).toBeDefined();
      expect(typeof client.startEpisode).toBe("function");
      expect(typeof client.step).toBe("function");
      expect(typeof client.grade).toBe("function");
      expect(typeof client.observe).toBe("function");
    });
  });
});
