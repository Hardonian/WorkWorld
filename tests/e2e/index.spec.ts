import { expect, test } from "@playwright/test";

test("public Index exposes evidence and private preflight", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can this agent do the work?" })).toBeVisible();
  await page.getByRole("link", { name: /Explore the Index/ }).click();
  await expect(page.getByRole("heading", { name: "Results with receipts." })).toBeVisible();
  await page.getByRole("link", { name: "Evidence →" }).first().click();
  await expect(page.getByRole("heading", { name: "Scripted baseline control" })).toBeVisible();
  await page.getByRole("link", { name: /Public Index/ }).click();
  await page.getByRole("link", { name: "Certify your agent" }).click();
  await expect(page.getByRole("heading", { name: "Know the operating envelope before production." })).toBeVisible();
  await page.getByRole("button", { name: "Prepare private run" }).click();
  await expect(page.getByRole("status")).toContainText("Preflight prepared");
});

test("public evidence API includes replay contract", async ({ request }) => {
  const response = await request.get("/api/index/runs/baseline-v1-seed-42");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({
    schema: "workworld-index/evidence@1",
    public: true,
  });
});
