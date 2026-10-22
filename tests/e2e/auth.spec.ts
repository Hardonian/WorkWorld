import { expect, test } from "@playwright/test";

test("hosted sign-in surface is available and an invalid callback stays contained", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();

  await page.goto("/auth/confirm");
  await expect(page).toHaveURL(/\/sign-in\?error=configuration$/);
});
