/**
 * Competent scripted baseline — deterministic FIXTURE actor (not a model).
 * It exercises the same public action interface any participant uses and must
 * pass every T1 check on every initial episode. Proves the environment is
 * completable and the grader accepts correct work.
 */
import { EpisodeEngine } from "../domain/engine.ts";
import { getScenario } from "../scenarios/catalog.ts";
import { ScriptRunner } from "./scriptkit.ts";

export function runBaseline(scenarioId: string): EpisodeEngine {
  switch (scenarioId) {
    case "A1":
      return baselineA1();
    case "A2":
      return baselineA2();
    case "B1":
      return baselineB1();
    case "B2":
      return baselineB2();
    case "C1":
      return baselineC1();
    case "C2":
      return baselineC2();
    default:
      throw new Error(`no baseline for ${scenarioId}`);
  }
}

function baselineA1(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("A1"), "baseline-A1");
  s.must({
    type: "draft_purchase_order",
    poId: "PO-B-A1",
    supplierId: "SUP-KETTLE",
    lines: [
      { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
      { itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 },
      { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
    ],
    requestedDeliveryDay: 7,
    note: "Week-14 restock for Riverside Clinic (TCK-101).",
  });
  s.must({ type: "submit_purchase_order", poId: "PO-B-A1" });
  s.must({ type: "request_approval", poId: "PO-B-A1" });
  s.must({ type: "advance_time", minutes: 1440 }); // manager approves
  s.must({ type: "authorize_purchase_order", poId: "PO-B-A1" });
  s.must({ type: "advance_time", minutes: 4320 }); // Kettle lead time: 3 days
  s.must({
    type: "record_delivery",
    deliveryId: "DV:PO-B-A1",
    verifiedLines: [
      { itemId: "GLV-100", qty: 4 },
      { itemId: "SAF-220", qty: 6 },
      { itemId: "FST-550", qty: 12 },
    ],
    note: "Counted against TCK-101 requirements; all present.",
  });
  s.must({
    type: "update_ticket",
    ticketId: "TCK-101",
    status: "resolved",
    note: "Ordered and received via PO-B-A1 (Kettle, 3-day lead).",
    reference: "PO-B-A1",
    commitment: null,
  });
  s.must({
    type: "update_spreadsheet",
    workbookId: "COMPARE-A1",
    cells: [
      { ref: "F2", value: 12800 },
      { ref: "F3", value: 14400 },
      { ref: "F4", value: 22200 },
    ],
  });
  s.must({
    type: "submit_work",
    summary:
      "Compared Kettle/Marwell/Halbrook; single-supplier Kettle order within budget and lead-time limit. " +
      "Approval obtained (order above CAD 400). Delivery checked in complete; TCK-101 updated.",
  });
  return s.engine;
}

function baselineA2(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("A2"), "baseline-A2");
  s.must({ type: "advance_time", minutes: 2880 }); // delay + substitution offer
  s.must({
    type: "amend_purchase_order",
    poId: "PO-2210",
    addLines: [{ itemId: "GLV-120", qty: 6, unitPriceMinor: 2950 }],
    removeLines: ["GLV-100"],
    qtyChanges: [],
    note: "Accepting GLV-120 light-duty substitute at the same price per Marwell offer.",
  });
  s.must({
    type: "send_message",
    messageId: "MSG-A2-M",
    to: "Marwell Safety Supply",
    subject: "PO-2210 — substitute accepted",
    body: "We accept GLV-120 x6 in place of GLV-100 x6 at the agreed price. Please ship immediately.",
    relatedTo: "PO-2210",
    commitment: null,
  });
  s.must({ type: "advance_time", minutes: 1440 }); // customer pulls date forward
  s.must({
    type: "update_ticket",
    ticketId: "TCK-102",
    status: "waiting",
    note: "Substitute accepted; committing materials on site by day 6.",
    reference: "PO-2210",
    commitment: { promisedDay: 6, text: "Materials on site by day 6 (substitute gloves + glasses)." },
  });
  s.must({
    type: "send_message",
    messageId: "MSG-A2-C",
    to: "Bayfront Property Management",
    subject: "TCK-102 — confirmed for day 6",
    body:
      "Confirmed: substitute gloves (GLV-120, same grade family/price) and glasses are shipping now and will be " +
      "on site by day 6.",
    relatedTo: "TCK-102",
    commitment: { promisedDay: 6, text: "Materials on site by day 6" },
  });
  s.must({ type: "advance_time", minutes: 1440 }); // day 4: delivery arrives
  s.must({
    type: "record_delivery",
    deliveryId: "DV-9021",
    verifiedLines: [
      { itemId: "GLV-120", qty: 6, substituteFor: "GLV-100" },
      { itemId: "SAF-220", qty: 4 },
    ],
    note: "Substitute gloves + glasses checked in.",
  });
  s.must({
    type: "update_ticket",
    ticketId: "TCK-102",
    status: "resolved",
    note: "Checked in DV-9021 (substitute gloves + glasses).",
    reference: "DV-9021",
    commitment: null,
  });
  s.must({
    type: "submit_work",
    summary:
      "Accepted the substitute explicitly (PO amended + supplier reply), committed day 6 to the customer after " +
      "the date change, and checked in DV-9021.",
  });
  return s.engine;
}

function baselineB1(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("B1"), "baseline-B1");
  s.must({ type: "advance_time", minutes: 2880 }); // DV-889 arrives
  s.must({
    type: "record_delivery",
    deliveryId: "DV-889",
    verifiedLines: [
      { itemId: "FST-550", qty: 6 },
      { itemId: "CLN-080", qty: 2 },
    ],
    note: "Complete against PO-2230.",
  });
  s.must({ type: "advance_time", minutes: 1440 }); // INV-2041 arrives
  s.must({ type: "match_invoice", invoiceId: "INV-2041", poId: "PO-2230", deliveryId: "DV-889" });
  s.must({ type: "approve_invoice", invoiceId: "INV-2041", adjustedAmountMinor: null, note: "Exact three-way match." });
  s.must({ type: "schedule_payment", invoiceId: "INV-2041", payDay: 10 });
  s.must({ type: "advance_time", minutes: 7 * 1440 }); // day 10
  s.must({ type: "run_payment_run", payDay: 10, invoiceIds: ["INV-2041"] });
  s.must({
    type: "update_spreadsheet",
    workbookId: "RECON-B1",
    cells: [
      { ref: "C3", value: 19700 },
      { ref: "C4", value: 19700 },
      { ref: "C5", value: 19700 },
    ],
  });
  s.must({
    type: "update_ticket",
    ticketId: "TCK-105",
    status: "resolved",
    note: "INV-2041 matched to PO-2230/DV-889 and settled at 19700 minor (day 10 run).",
    reference: "INV-2041",
    commitment: null,
  });
  s.must({
    type: "submit_work",
    summary:
      "Three-way match clean; invoice approved and settled exactly once at the delivered value; " +
      "reconciliation sheet updated; TCK-105 resolved.",
  });
  return s.engine;
}

function baselineB2(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("B2"), "baseline-B2");
  s.must({ type: "advance_time", minutes: 2880 }); // DV-892 short
  s.must({
    type: "record_delivery",
    deliveryId: "DV-892",
    verifiedLines: [{ itemId: "GLV-100", qty: 6 }],
    note: "Short shipped: 6 of 8 cases; remainder canceled by shipper.",
  });
  s.must({ type: "advance_time", minutes: 1440 }); // INV-2043 (bills 8)
  s.must({ type: "match_invoice", invoiceId: "INV-2043", poId: "PO-2230", deliveryId: "DV-892" });
  s.must({ type: "advance_time", minutes: 2 * 1440 }); // INV-2051 duplicate
  s.must({ type: "flag_duplicate_invoice", invoiceId: "INV-2051", duplicateOfId: "INV-2043" });
  s.must({
    type: "approve_invoice",
    invoiceId: "INV-2043",
    adjustedAmountMinor: 17700,
    note: "Short-pay: 6 delivered cases x 2950 = 17700 minor; disputing the 2 undelivered cases.",
  });
  s.must({ type: "schedule_payment", invoiceId: "INV-2043", payDay: 10 });
  s.must({ type: "run_payment_run", payDay: 10, invoiceIds: ["INV-2043"] });
  s.must({
    type: "send_message",
    messageId: "MSG-B2-S",
    to: "Marwell Safety Supply billing",
    subject: "INV-2043 short-paid; INV-2051 appears duplicated",
    body:
      "We received 6 of 8 cases (DV-892). INV-2043 is short-paid to 17700 minor for the delivered cases; the 2 " +
      "undelivered cases are disputed and unpaid. INV-2051 duplicates PO-2230 billing and is held as a suspected duplicate.",
    relatedTo: "INV-2043",
    commitment: null,
  });
  s.must({
    type: "update_ticket",
    ticketId: "TCK-106",
    status: "waiting",
    note: "Short-pay on INV-2043 (17700 minor); INV-2051 flagged as duplicate; supplier notified.",
    reference: "INV-2043",
    commitment: null,
  });
  s.must({
    type: "submit_work",
    summary:
      "Settled only delivered quantity (17700 minor), disputed the remainder, flagged INV-2051 as a suspected " +
      "duplicate and notified Marwell. Nothing settled twice.",
  });
  return s.engine;
}

function baselineC1(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("C1"), "baseline-C1");
  s.must({ type: "advance_time", minutes: 2 * 1440 }); // requirement change + price notice
  s.must({
    type: "draft_purchase_order",
    poId: "PO-B-C1",
    supplierId: "SUP-KETTLE",
    lines: [
      { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
      { itemId: "FST-550", qty: 2, unitPriceMinor: 1850 },
      { itemId: "SAF-220", qty: 2, unitPriceMinor: 2400 },
    ],
    requestedDeliveryDay: 6,
    note: "Top-up for the changed requirement (gloves x8, bolts x6, glasses x2).",
  });
  s.must({ type: "submit_purchase_order", poId: "PO-B-C1" });
  s.must({ type: "authorize_purchase_order", poId: "PO-B-C1" }); // 21300 < 40000: within authority
  s.must({
    type: "update_ticket",
    ticketId: "TCK-103",
    status: "waiting",
    note: "Increase covered by PO-B-C1 (Kettle, 3-day lead).",
    reference: "PO-B-C1",
    commitment: { promisedDay: 8, text: "All materials on site by day 8 as originally planned." },
  });
  s.must({
    type: "send_message",
    messageId: "MSG-C1-C",
    to: "Harbourview Facilities",
    subject: "TCK-103 — change confirmed, day 8 holds",
    body:
      "The increase is covered: gloves x8, bolts x6, glasses x2 all ordered. We can hold the day 8 site date.",
    relatedTo: "TCK-103",
    commitment: { promisedDay: 8, text: "All materials on site by day 8" },
  });
  s.must({
    type: "update_spreadsheet",
    workbookId: "PLAN-C1",
    cells: [
      { ref: "C2", value: 8 },
      { ref: "D2", value: 25600 },
      { ref: "C3", value: 6 },
      { ref: "D3", value: 11100 },
      { ref: "A4", value: "SAF-220" },
      { ref: "B4", value: 2 },
      { ref: "C4", value: 2 },
      { ref: "D4", value: 4800 },
      { ref: "D5", value: 0, formula: "SUM(D2:D4)" },
    ],
  });
  s.must({
    type: "update_ticket",
    ticketId: "TCK-103",
    status: null,
    note: "Plan sheet updated to actuals (total 41500 minor across PO-2250 + PO-B-C1).",
    reference: "PO-B-C1",
    commitment: null,
  });
  s.must({
    type: "submit_work",
    summary:
      "Change covered within budget and authority; day 8 commitment held and confirmed to the customer; " +
      "plan sheet updated to match actual orders.",
  });
  return s.engine;
}

function baselineC2(): EpisodeEngine {
  const s = new ScriptRunner(getScenario("C2"), "baseline-C2");
  s.must({ type: "advance_time", minutes: 2 * 1440 }); // DV-901 short
  s.must({
    type: "record_delivery",
    deliveryId: "DV-901",
    verifiedLines: [
      { itemId: "CLN-080", qty: 3 },
      { itemId: "SAF-220", qty: 3 },
    ],
    note: "Short shipped: CLN 3/6, SAF 3/5; remainder canceled by shipper.",
  });
  s.must({
    type: "draft_purchase_order",
    poId: "PO-B-C2",
    supplierId: "SUP-HALBROOK",
    lines: [
      { itemId: "CLN-080", qty: 3, unitPriceMinor: 4900 },
      { itemId: "SAF-220", qty: 2, unitPriceMinor: 2800 },
    ],
    requestedDeliveryDay: 5,
    note: "Emergency top-up for the cancelled remainder (Halbrook 2-day lead).",
  });
  s.must({ type: "submit_purchase_order", poId: "PO-B-C2" });
  s.must({ type: "authorize_purchase_order", poId: "PO-B-C2" }); // 20300 < 40000
  s.must({
    type: "update_ticket",
    ticketId: "TCK-104",
    status: "waiting",
    note: "Shortfall reordered from Halbrook via PO-B-C2 (2-day lead).",
    reference: "PO-B-C2",
    commitment: { promisedDay: 6, text: "Complete materials on site by day 6, ahead of the day 7 need." },
  });
  s.must({
    type: "send_message",
    messageId: "MSG-C2-C",
    to: "Northgate School Board",
    subject: "TCK-104 — shortfall covered, day 6 confirmed",
    body:
      "Marwell short-shipped (3 of 6 cleaner, 3 of 5 glasses). We reordered the remainder from our fast backup " +
      "supplier: everything will be on site by day 6, ahead of your day 7 need.",
    relatedTo: "TCK-104",
    commitment: { promisedDay: 6, text: "Complete materials on site by day 6" },
  });
  s.must({
    type: "submit_work",
    summary:
      "Shortfall recorded accurately; remainder reordered from Halbrook within budget/authority; " +
      "customer informed with a feasible day 6 commitment.",
  });
  return s.engine;
}
