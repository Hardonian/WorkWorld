import { expect, test } from "@playwright/test";

test("demo API v1 starts, observes, mutates, and grades one shared-engine run", async ({ request }) => {
  const started = await request.post("/api/v1/episodes", {
    data: { scenarioId: "A1", condition: "agent", seed: 42 },
  });
  expect(started.status()).toBe(200);
  const startBody = await started.json();
  expect(startBody.sessionId).toBe(startBody.runId);
  expect(startBody.observation.revision).toBe(0);

  const observed = await request.get(
    `/api/v1/episodes?sessionId=${encodeURIComponent(startBody.sessionId)}`,
  );
  expect(observed.status()).toBe(200);
  expect((await observed.json()).observation.scenarioId).toBe("A1");

  const stepped = await request.post("/api/v1/actions", {
    data: {
      sessionId: startBody.sessionId,
      action: {
        type: "advance_time",
        minutes: 60,
        expectedRevision: 0,
        idempotencyKey: "e2e-api-advance-1",
      },
    },
  });
  expect(stepped.status()).toBe(200);
  const stepBody = await stepped.json();
  expect(stepBody.ok).toBe(true);
  expect(stepBody.observation.clockMinute).toBe(60);

  const graded = await request.post("/api/v1/evaluations", {
    data: { sessionId: startBody.sessionId },
  });
  expect(graded.status()).toBe(200);
  expect((await graded.json()).report.checks.length).toBeGreaterThan(0);
});

test("readiness and the experimental JSON-RPC tool catalog are reachable", async ({ request }) => {
  const ready = await request.get("/health/ready");
  expect(ready.status()).toBe(200);
  expect((await ready.json()).status).toBe("ready");

  const tools = await request.post("/api/mcp", {
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  expect(tools.status()).toBe(200);
  expect((await tools.json()).result.tools.length).toBeGreaterThanOrEqual(4);
});
