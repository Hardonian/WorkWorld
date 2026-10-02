/**
 * Real demo video capture (Playwright recording) of the demo-script flow.
 * Output: evidence/m8/demo.webm — an actual recording, never staged.
 * Usage: npx tsx scripts/capture-demo-video.ts
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.WW_BASE ?? "http://localhost:3100";
const OUT = "evidence/m8";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();

  await page.goto(BASE);
  await page.waitForSelector("text=Executable professional-work simulations");
  await page.waitForTimeout(1500);

  await page.getByRole("button", { name: "Start episode A2" }).click();
  await page.waitForSelector("text=Delay and substitution");
  await page.waitForTimeout(1500);

  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("button", { name: "Amend" }).click();
  await page.getByLabel("Amendment item").selectOption("GLV-120");
  await page.getByLabel("Added line quantity").fill("6");
  await page.getByRole("button", { name: "mark remove" }).first().click();
  await page.getByRole("button", { name: "Apply amendment" }).click();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByLabel("To", { exact: true }).fill("Marwell Safety Supply");
  await page.getByLabel("Subject").fill("Substitute accepted");
  await page.getByLabel("Body").fill("We accept GLV-120 x6 at the agreed price.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await page.getByLabel("Note for TCK-102").fill("Substitute accepted; committing day 6.");
  await page.getByLabel("Reference for TCK-102").fill("PO-2210");
  await page.getByLabel("Promise day for TCK-102").fill("6");
  await page.getByRole("button", { name: "Update ticket" }).click();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Advance 1 day" }).click();
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await page.getByRole("button", { name: "Check in delivery" }).click();
  await page.waitForTimeout(1200);

  await page.getByLabel("Submission summary").fill(
    "Accepted substitute explicitly; re-committed day 6; delivery checked in.",
  );
  await page.getByRole("button", { name: "Submit & view outcome evidence" }).click();
  await page.waitForSelector("text=/Outcome evidence/i");
  await page.waitForTimeout(2500);

  await context.close();
  await browser.close();
  console.log(`demo video written to ${OUT}/ (playwright video file)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
