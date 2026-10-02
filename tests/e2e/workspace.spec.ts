import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end: a human completes episode A1 through the browser UI.
 * Covers: start episode, order flow with approval, time advance, delivery
 * check-in, ticket update, submission, outcome evidence, refresh/resume.
 */

async function startA1(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Executable professional-work simulations/ })).toBeVisible();
  await page.getByRole("button", { name: "Start episode A1" }).click();
  await expect(page.getByRole("heading", { name: /Day 0/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Week-14 restock/ })).toBeVisible();
}

test("guided episode A1: order → approval → delivery → ticket → submission → outcome evidence", async ({ page }) => {
  await startA1(page);

  // Brief is visible first (guided start).
  await expect(page.getByText("Riverside Clinic", { exact: false }).first()).toBeVisible();

  // Draft the order.
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByLabel("Requested delivery day").fill("7");
  await page.getByLabel("Line 1 quantity").fill("4");
  await page.getByLabel("Line 2 quantity").fill("6");
  await page.getByLabel("Line 3 quantity").fill("12");
  await page.getByRole("button", { name: "Draft order" }).click();

  // The action feedback confirms the draft, then submit + request approval.
  await expect(page.getByRole("status").getByText(/drafted/i)).toBeVisible();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.getByRole("status").getByText(/approval requested/i)).toBeVisible();

  // Manager responds within a day (logical time).
  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await expect(page.getByText("manager approved", { exact: false }).first()).toBeVisible();

  // Authorize.
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await expect(page.getByRole("status").getByText(/authorized/i)).toBeVisible();

  // Advance 3 days for the Kettle delivery.
  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Advance 1 day" }).click();

  // Check in the delivery.
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await expect(page.getByRole("status").getByText(/checked in/i)).toBeVisible();

  // Capture the PO id for the ticket reference.
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  const poId = (await page.locator("span.font-mono").first().innerText()).trim();

  // Update the ticket with a reference and resolve it.
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-101").fill("Order placed and received.");
  await page.getByLabel("Reference for TCK-101").fill(poId);
  await page.getByLabel("Status for TCK-101").selectOption("resolved");
  await page.getByRole("button", { name: "Update ticket" }).click();
  await expect(page.getByRole("status").getByText(/updated/i)).toBeVisible();

  // Refresh mid-work: state must survive (server-side session).
  await page.reload();
  await expect(page.getByRole("heading", { name: /Day \d+/ })).toBeVisible();

  // Submit and inspect outcome evidence.
  await page.getByLabel("Submission summary").fill("Restock ordered, approved, received; ticket resolved.");
  await page.getByRole("button", { name: "Submit & view outcome evidence" }).click();
  await expect(page.getByText(/Outcome evidence — PASS/i)).toBeVisible();
  await expect(page.getByText("requirements_met")).toBeVisible();
});

test("fresh session shows the episode picker; workspace without session degrades gracefully", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { name: "No active episode" })).toBeVisible();
  await page.getByRole("link", { name: "Choose an episode" }).click();
  await expect(page.getByRole("heading", { name: /Executable professional-work simulations/ })).toBeVisible();
  // All six episodes are offered.
  for (const id of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    await expect(page.getByText(`${id} ·`, { exact: false }).first()).toBeVisible();
  }
});

test("rejected actions preserve work and show actionable errors", async ({ page }) => {
  await startA1(page);
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByLabel("Requested delivery day").fill("7");
  await page.getByLabel("Line 1 quantity").fill("4000");
  await page.getByRole("button", { name: "Draft order" }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  // Authorizing 4000 cases (1,280,000 minor) must be rejected for budget,
  // and the workspace must remain usable afterwards.
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await expect(page.getByRole("status").getByText(/Rejected/i)).toBeVisible();
  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await expect(page.getByRole("heading", { name: /Day 1/ })).toBeVisible();
});
