import { expect, test } from "@playwright/test";

test("sign-in offers both invitation and password paths and degrades without hosted configuration", async ({ page, request }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("synthetic@example.invalid");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("not configured");
  await page.getByRole("link", { name: "Use a password instead" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  const invalidConfirmation = await request.get("/auth/confirm", { maxRedirects: 0 });
  expect(invalidConfirmation.status()).toBe(307);
  expect(invalidConfirmation.headers().location).toContain("/sign-in?error=");
});
