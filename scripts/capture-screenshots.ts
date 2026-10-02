/**
 * Capture real screenshots of actual product interactions (evidence/m3).
 * Usage: npx tsx scripts/capture-screenshots.ts
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.WW_BASE ?? "http://localhost:3100";
const OUT = process.env.WW_OUT ?? "evidence/m3/screenshots";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err).slice(0, 200)));

  // 1. Home / episode selection
  await page.goto(BASE);
  await page.waitForSelector("text=Executable professional-work simulations");
  await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

  // 2. Guided workspace (brief tab)
  await page.getByRole("button", { name: "Start episode A1" }).click();
  await page.waitForSelector("text=Week-14 restock");
  await page.screenshot({ path: `${OUT}/02-workspace-brief.png`, fullPage: true });

  // 3. Orders tab after drafting an order
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByLabel("Requested delivery day").fill("7");
  await page.getByLabel("Line 1 quantity").fill("4");
  await page.getByLabel("Line 2 quantity").fill("6");
  await page.getByLabel("Line 3 quantity").fill("12");
  await page.getByRole("button", { name: "Draft order" }).click();
  await page.waitForSelector("text=/drafted/i");
  await page.screenshot({ path: `${OUT}/03-orders-drafted.png`, fullPage: true });

  // 4. Approval → authorize → advance → delivery check-in → submission evidence
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Request approval" }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await page.waitForSelector("text=/checked in/i");
  await page.screenshot({ path: `${OUT}/04-delivery-checked-in.png`, fullPage: true });

  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-101").fill("Ordered and received via the Kettle order.");
  await page.getByLabel("Reference for TCK-101").fill("PO-5001");
  await page.getByLabel("Status for TCK-101").selectOption("resolved");
  await page.getByRole("button", { name: "Update ticket" }).click();
  await page.getByLabel("Submission summary").fill("Restock complete; delivery checked in; ticket resolved.");
  await page.getByRole("button", { name: "Submit & view outcome evidence" }).click();
  await page.waitForSelector("text=/Outcome evidence/i");
  await page.screenshot({ path: `${OUT}/05-outcome-evidence.png`, fullPage: true });

  // 5. Assessor workspace with evidence + rubric form
  await page.goto(`${BASE}/assessor`);
  await page.waitForSelector("text=Review completed work");
  await page.screenshot({ path: `${OUT}/07-assessor.png`, fullPage: true });

  // 6. Mobile-width responsiveness check
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/06-mobile-workspace.png`, fullPage: true });

  await browser.close();
  console.log(`screenshots written to ${OUT}`);
  console.log(`console errors: ${consoleErrors.length}`);
  for (const e of consoleErrors) console.log("  ERR:", e);
  if (process.env.WW_REQUIRE_CLEAN_CONSOLE === "1" && consoleErrors.length > 0) {
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
