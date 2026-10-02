import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end completion of the remaining episodes through the browser UI.
 * Each test drives the same shared workspace components a human uses.
 */

async function start(page: Page, id: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Start episode ${id}` }).click();
  await expect(page.getByRole("heading", { name: /Day 0/ })).toBeVisible();
}

async function advanceDays(page: Page, n: number) {
  for (let i = 0; i < n; i++) await page.getByRole("button", { name: "Advance 1 day" }).click();
}

async function draftOrder(
  page: Page,
  supplier: string,
  lines: { slot: 1 | 2 | 3; item: string; qty: string }[],
  reqDay: string,
) {
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByLabel("Order supplier").selectOption(supplier);
  await page.getByLabel("Requested delivery day").fill(reqDay);
  for (const l of lines) {
    await page.getByLabel(`Line ${l.slot} item`).selectOption(l.item);
    await page.getByLabel(`Line ${l.slot} quantity`).fill(l.qty);
  }
  await page.getByRole("button", { name: "Draft order" }).click();
  await expect(page.getByRole("status").getByText(/drafted/i)).toBeVisible();
}

async function readLastPoId(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  return (await page.locator("span.font-mono").last().innerText()).trim();
}

function invoiceRow(page: Page, invoiceNumber: string) {
  return page.locator("li", { hasText: invoiceNumber });
}

async function submit(page: Page, summary: string) {
  await page.getByLabel("Submission summary").fill(summary);
  await page.getByRole("button", { name: "Submit & view outcome evidence" }).click();
  await expect(page.getByText(/Outcome evidence — PASS/i)).toBeVisible();
}

test("A2: accept substitution, respond to date change, check in, complete", async ({ page }) => {
  await start(page, "A2");
  await advanceDays(page, 2); // supplier delay + substitution offer

  // Accept the substitute: amend PO-2210 (swap GLV-100 → GLV-120).
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("button", { name: "Amend" }).click();
  await page.getByLabel("Amendment item").selectOption("GLV-120");
  await page.getByLabel("Added line quantity").fill("6");
  await page.getByRole("button", { name: "mark remove" }).first().click();
  await page.getByRole("button", { name: "Apply amendment" }).click();
  await expect(page.getByRole("status").getByText(/amended/i)).toBeVisible();

  // Tell the supplier.
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Marwell Safety Supply");
  await page.getByLabel("Related to (ticket / PO / invoice id)").fill("PO-2210");
  await page.getByLabel("Subject").fill("Substitute accepted");
  await page.getByLabel("Body").fill("We accept GLV-120 x6 at the agreed price.");
  await page.getByRole("button", { name: "Send message" }).click();

  // Customer pulls the date forward (day 3).
  await advanceDays(page, 1);

  // Re-commit on the ticket (day 6) and reply to the customer.
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-102").fill("Substitute accepted; committing day 6.");
  await page.getByLabel("Reference for TCK-102").fill("PO-2210");
  await page.getByLabel("Status for TCK-102").selectOption("waiting");
  await page.getByLabel("Promise day for TCK-102").fill("6");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Bayfront Property Management");
  await page.getByLabel("Related to (ticket / PO / invoice id)").fill("TCK-102");
  await page.getByLabel("Subject").fill("Confirmed for day 6");
  await page.getByLabel("Body").fill("Substitute gloves and glasses will be on site by day 6.");
  await page.getByLabel("Promised day (optional commitment)").fill("6");
  await page.getByRole("button", { name: "Send message" }).click();

  // Delivery arrives day 4.
  await advanceDays(page, 1);
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await expect(page.getByRole("status").getByText(/checked in/i)).toBeVisible();

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-102").fill("Checked in DV-9021.");
  await page.getByLabel("Reference for TCK-102").fill("DV-9021");
  await page.getByLabel("Status for TCK-102").selectOption("resolved");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await submit(page, "Substitute accepted and recorded; customer re-committed on a feasible date.");
});

test("B1: three-way match, single settlement, reconciliation sheet, complete", async ({ page }) => {
  await start(page, "B1");
  await advanceDays(page, 2);
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await advanceDays(page, 1);

  // Match → approve → schedule → run payment (exactly once).
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page.getByLabel("Delivery for INV-2041").selectOption("DV-889");
  await expect(page.getByRole("status").getByText(/matched/i)).toBeVisible();
  await invoiceRow(page, "INV-2041").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").getByText(/approved/i)).toBeVisible();
  await invoiceRow(page, "INV-2041").getByRole("button", { name: "Schedule payment" }).click();
  await expect(page.getByRole("status").getByText(/scheduled/i)).toBeVisible();
  await invoiceRow(page, "INV-2041").getByRole("button", { name: "Run payment (once)" }).click();
  await expect(page.getByRole("status").getByText(/settled/i)).toBeVisible();

  // Reconciliation sheet (add missing cells, then record the matched values).
  await page.getByRole("button", { name: "Sheets", exact: true }).click();
  for (const ref of ["C3", "C4", "C5"]) {
    await page.getByLabel("New cell reference").fill(ref);
    await page.getByRole("button", { name: "Add cell" }).click();
    await page.getByLabel(`Cell ${ref}`).fill("19700");
  }
  await page.getByRole("button", { name: "Save cells" }).click();
  await expect(page.getByRole("status").getByText(/cell\(s\) updated/i)).toBeVisible();

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-105").fill("INV-2041 settled at delivered value.");
  await page.getByLabel("Reference for TCK-105").fill("INV-2041");
  await page.getByLabel("Status for TCK-105").selectOption("resolved");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await submit(page, "Matched, approved and settled exactly once; sheet updated.");
});

test("B2: short-pay, duplicate flag, supplier notice, complete", async ({ page }) => {
  await start(page, "B2");
  await advanceDays(page, 2);
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await advanceDays(page, 1);
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page.getByLabel("Delivery for INV-2043").selectOption("DV-892");
  await expect(page.getByRole("status").getByText(/matched/i)).toBeVisible();
  await advanceDays(page, 2); // duplicate invoice arrives

  // Flag the duplicate.
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page.getByLabel("Duplicate of for INV-2051").selectOption("INV-2043");
  await expect(page.getByRole("status").getByText(/flagged/i)).toBeVisible();

  // Short-pay INV-2043 to the delivered value (6 × 2950 = 17700).
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page.getByLabel("Approved amount for INV-2043").fill("17700");
  await invoiceRow(page, "INV-2043").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").getByText(/approved/i)).toBeVisible();
  await invoiceRow(page, "INV-2043").getByRole("button", { name: "Schedule payment" }).click();
  await invoiceRow(page, "INV-2043").getByRole("button", { name: "Run payment (once)" }).click();
  await expect(page.getByRole("status").getByText(/settled/i)).toBeVisible();

  // Notice to supplier + ticket.
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Marwell Safety Supply billing");
  await page.getByLabel("Subject").fill("Short-pay and duplicate invoice");
  await page.getByLabel("Body").fill("Paid 17700 minor for delivered cases; remainder disputed; INV-2051 is a duplicate.");
  await page.getByRole("button", { name: "Send message" }).click();

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-106").fill("Short-paid INV-2043; INV-2051 flagged.");
  await page.getByLabel("Reference for TCK-106").fill("INV-2043");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await submit(page, "Short-paid delivered quantity; duplicate flagged; supplier notified.");
});

test("C1: requirement change, top-up order, revised commitment, plan sheet, complete", async ({ page }) => {
  await start(page, "C1");
  await advanceDays(page, 2); // requirement change + price notice

  await draftOrder(
    page,
    "SUP-KETTLE",
    [
      { slot: 1, item: "GLV-100", qty: "4" },
      { slot: 2, item: "SAF-220", qty: "2" },
      { slot: 3, item: "FST-550", qty: "2" },
    ],
    "6",
  );
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await expect(page.getByRole("status").getByText(/authorized/i)).toBeVisible();
  const poId = await readLastPoId(page);

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-103").fill(`Increase covered by ${poId}.`);
  await page.getByLabel("Reference for TCK-103").fill(poId);
  await page.getByLabel("Status for TCK-103").selectOption("waiting");
  await page.getByLabel("Promise day for TCK-103").fill("8");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Harbourview Facilities");
  await page.getByLabel("Related to (ticket / PO / invoice id)").fill("TCK-103");
  await page.getByLabel("Subject").fill("Day 8 holds");
  await page.getByLabel("Body").fill("The increase is covered; all materials on site by day 8.");
  await page.getByLabel("Promised day (optional commitment)").fill("8");
  await page.getByRole("button", { name: "Send message" }).click();

  await page.getByRole("button", { name: "Sheets", exact: true }).click();
  await page.getByLabel("Cell C2").fill("8");
  await page.getByLabel("Cell D2").fill("25600");
  await page.getByRole("button", { name: "Save cells" }).click();

  await submit(page, "Change covered within budget; day 8 commitment held and communicated.");
});

test("C2: shortfall, recovery order, customer update, complete", async ({ page }) => {
  await start(page, "C2");
  await advanceDays(page, 2);
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await expect(page.getByRole("status").getByText(/checked in/i)).toBeVisible();

  await draftOrder(
    page,
    "SUP-HALBROOK",
    [
      { slot: 1, item: "CLN-080", qty: "3" },
      { slot: 2, item: "SAF-220", qty: "2" },
    ],
    "5",
  );
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await expect(page.getByRole("status").getByText(/authorized/i)).toBeVisible();
  const poId = await readLastPoId(page);

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-104").fill(`Shortfall reordered via ${poId}.`);
  await page.getByLabel("Reference for TCK-104").fill(poId);
  await page.getByLabel("Status for TCK-104").selectOption("waiting");
  await page.getByRole("button", { name: "Update ticket" }).click();

  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Northgate School Board");
  await page.getByLabel("Related to (ticket / PO / invoice id)").fill("TCK-104");
  await page.getByLabel("Subject").fill("Shortfall covered");
  await page.getByLabel("Body").fill("Reordered the cancelled remainder from our fast backup supplier.");
  await page.getByLabel("Promised day (optional commitment)").fill("6");
  await page.getByRole("button", { name: "Send message" }).click();

  await submit(page, "Shortfall recorded; remainder reordered; customer updated with a feasible date.");
});
