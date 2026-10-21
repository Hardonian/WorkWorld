import { expect, test } from "@playwright/test";

test("launch surface exposes security headers and never treats a simulated battle as a public ranking", async ({ page, request }) => {
  const landing = await request.get("/");
  expect(landing.status()).toBe(200);
  expect(landing.headers()["x-content-type-options"]).toBe("nosniff");
  expect(landing.headers()["x-frame-options"]).toBe("DENY");
  expect(landing.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(landing.headers()["x-powered-by"]).toBeUndefined();

  const evidence = await request.get("/api/index/runs/baseline-v1-seed-42");
  expect(evidence.headers()["content-disposition"]).toContain("workworld-index-baseline-v1-seed-42.json");
  expect(evidence.headers()["cache-control"]).toContain("s-maxage=900");
  expect((await request.get("/api/index/runs/not-a-run")).status()).toBe(404);

  await page.goto("/arena");
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByText(/live agent rows are intentionally withheld/i)).toBeVisible();
  await expect(page.getByText(/Claude 3.7 Sonnet|GPT-4o/)).toHaveCount(0);
});
