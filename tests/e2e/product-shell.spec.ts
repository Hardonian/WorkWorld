import { expect, test } from "@playwright/test";

test("workspace command palette and keyboard help are operable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start episode A1" }).click();
  await expect(page.getByRole("heading", { name: /Week-14 restock/ })).toBeVisible();

  // Test opening via header trigger button
  await page.getByRole("button", { name: /Commands/ }).click();
  await expect(page.getByPlaceholder(/Type a command/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder(/Type a command/)).toBeHidden();

  // Test opening via keyboard shortcut
  await page.locator("body").click();
  await page.keyboard.press("Control+k");
  await expect(page.getByPlaceholder(/Type a command/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder(/Type a command/)).toBeHidden();

  // Test keyboard help modal
  await page.keyboard.press("?");
  await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible();
  await page.getByRole("button", { name: "Close shortcuts modal" }).click();
  await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeHidden();
});

test("theme preference can be changed from the catalog", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
  await expect(toggle).toBeVisible();
  const before = await page.locator("html").getAttribute("class");
  await toggle.click();
  await expect.poll(() => page.locator("html").getAttribute("class")).not.toBe(before);
});
