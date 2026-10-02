/**
 * Family A — Purchase and delivery. Episodes A1 and A2.
 */
import type { ScenarioDefinition } from "./schema.ts";
import { ITEMS, SUPPLIERS, LEDGER_OPENING, POLICY, atDay } from "./fixtures.ts";

export const A1: ScenarioDefinition = {
  id: "A1",
  family: "purchase_delivery",
  version: "1.0.0",
  title: "Week-14 restock",
  brief: {
    role: "Operations Coordinator",
    company: "Northline Supply Co. (synthetic)",
    situation:
      "Riverside Clinic's quarterly restock is due. Your manager wants the order placed by day 3. " +
      "Compare suppliers on price, lead time and terms, then prepare an authorized order.",
    objectives: [
      "Order GLV-100 ×4 cases, SAF-220 ×6 boxes, FST-550 ×12 boxes",
      "Choose a supplier arrangement with lead time ≤ 5 days",
      "Stay within the CAD 2,500 purchase budget",
      "Get manager approval for orders above CAD 400",
      "Check in the delivery and keep TCK-101 current",
    ],
    guidance: [
      "Supplier catalogs show unit price, lead time and payment terms.",
      "Orders above the CAD 400 authority limit need manager approval before authorization (policy P1).",
      "Record what the carrier actually delivers; mismatches are handled explicitly.",
    ],
  },
  durationMinutes: atDay(10),
  policy: { ...POLICY, helpPolicy: { maxHelpRequests: 3, fatalBeyond: false } },
  items: ITEMS,
  suppliers: SUPPLIERS,
  initial: {
    ledgerOpening: LEDGER_OPENING,
    tickets: {
      "TCK-101": {
        id: "TCK-101",
        title: "Riverside Clinic — quarterly restock",
        customer: "Riverside Clinic",
        status: "open",
        priority: "normal",
        dueDay: 7,
        notes: [{ atMinute: 0, text: "Quarterly restock opened. Requirements on file." }],
        commitments: [],
      },
    },
    messages: [
      {
        id: "MSG-OPEN-1",
        direction: "in",
        from: "Dana Reyes (Operations Manager)",
        to: "you",
        subject: "Week-14 restock — order by day 3",
        body:
          "Please order the week-14 restock for Riverside Clinic (TCK-101): gloves GLV-100 x4 cases, " +
          "safety glasses SAF-220 x6 boxes, bolts FST-550 x12 boxes. Keep lead time under 5 days, " +
          "stay inside the CAD 2500 weekly budget, and get my approval before authorizing anything over CAD 400. " +
          "Compare suppliers first — Vantage is cheap but slow this quarter.",
        atMinute: 0,
        relatedTo: "TCK-101",
        commitment: null,
      },
    ],
    workbooks: {
      "COMPARE-A1": {
        id: "COMPARE-A1",
        name: "restock-comparison",
        cells: {
          A1: "Item",
          B1: "Qty",
          C1: "Kettle unit",
          D1: "Marwell unit",
          E1: "Halbrook unit",
          F1: "Chosen line total",
          A2: "GLV-100",
          B2: 4,
          C2: 3200,
          D2: 2950,
          E2: 3600,
          A3: "SAF-220",
          B3: 6,
          C3: 2400,
          D3: 2100,
          E3: 2800,
          A4: "FST-550",
          B4: 12,
          C4: 1850,
          D4: 0,
          E4: 2200,
          A6: "Chosen total",
          B6: { formula: "SUM(F2:F4)" },
        },
        edits: [],
      },
    },
    workNotes: [],
    committedMinor: 0,
  },
  scheduledEvents: [
    {
      id: "A1-reminder",
      fireAtMinute: atDay(6),
      kind: "reminder",
      payload: {
        from: "Dana Reyes (Operations Manager)",
        subject: "Restock status check",
        body: "Where are we with the Riverside restock? Keep TCK-101 updated either way.",
        relatedTo: "TCK-101",
      },
      fired: false,
    },
  ],
  requirements: {
    lines: [
      { itemId: "GLV-100", qty: 4 },
      { itemId: "SAF-220", qty: 6 },
      { itemId: "FST-550", qty: 12 },
    ],
    dueDay: 7,
    ticketId: "TCK-101",
  },
  requirementPredicates: [
    {
      id: "rp-order",
      description: "exact required quantities ordered from a supplier arrangement with lead time ≤ 5 days",
      kind: "order_placed",
      params: {
        lines: [
          { itemId: "GLV-100", qty: 4, comparison: "eq" },
          { itemId: "SAF-220", qty: 6, comparison: "eq" },
          { itemId: "FST-550", qty: 12, comparison: "eq" },
        ],
        maxLeadTimeDays: 5,
      },
    },
    {
      id: "rp-delivery",
      description: "the restock delivery is checked in",
      kind: "delivery_checked_in",
      params: {},
    },
  ],
  requiredUpdates: [
    {
      id: "ru-ticket",
      description: "TCK-101 carries a note referencing the order",
      kind: "ticket_note_referencing_entity",
      params: { ticketId: "TCK-101" },
    },
    { id: "ru-submit", description: "work submitted", kind: "submission_present", params: {} },
  ],
  publicChecklist: [
    "Compare supplier options (price, lead time, terms)",
    "Order GLV-100 ×4 cases, SAF-220 ×6 boxes, FST-550 ×12 boxes",
    "Use a supplier arrangement with lead time ≤ 5 days",
    "Get manager approval before authorizing orders above CAD 400",
    "Check in the delivery when it arrives",
    "Update TCK-101 with the order reference",
    "Submit your work",
  ],
};

export const A2: ScenarioDefinition = {
  id: "A2",
  family: "purchase_delivery",
  version: "1.0.0",
  title: "Delay and substitution",
  brief: {
    role: "Operations Coordinator",
    company: "Northline Supply Co. (synthetic)",
    situation:
      "PO-2210 (Marwell: gloves ×6, glasses ×4) is already authorized for the Bayfront retrofit (TCK-102). " +
      "Mid-order disruption: the supplier is delaying gloves and offering a substitute, while the customer pulls the date forward.",
    objectives: [
      "Respond to the substitution offer (accept or decline — but record the response)",
      "Keep records consistent with what actually arrives",
      "Re-commit to the customer only on a feasible date",
      "Keep TCK-102 current",
    ],
    guidance: [
      "Accepting a substitution is done by amending PO-2210 (records the change; never silent).",
      "Declining is fine too — say so to the supplier and plan around the delay.",
      "A customer promise is a commitment: promise only dates you can actually source (policy P8).",
    ],
  },
  durationMinutes: atDay(10),
  policy: { ...POLICY, helpPolicy: { maxHelpRequests: 3, fatalBeyond: false } },
  items: ITEMS,
  suppliers: SUPPLIERS,
  initial: {
    purchaseOrders: {
      "PO-2210": {
        id: "PO-2210",
        supplierId: "SUP-MARWELL",
        lines: [
          { itemId: "GLV-100", qty: 6, unitPriceMinor: 2950 },
          { itemId: "SAF-220", qty: 4, unitPriceMinor: 2100 },
        ],
        status: "authorized",
        note: "Bayfront retrofit materials (placed last week).",
        createdAtMinute: -7200,
        requestedDeliveryDay: 5,
        managerApproved: true,
        approvals: [{ atMinute: -7200, approvedBy: "Dana Reyes (Operations Manager)" }],
        amendments: [],
        budgetCommittedMinor: 26100,
      },
    },
    ledgerOpening: LEDGER_OPENING,
    tickets: {
      "TCK-102": {
        id: "TCK-102",
        title: "Bayfront Property — hallway lighting retrofit",
        customer: "Bayfront Property Management",
        status: "in_progress",
        priority: "high",
        dueDay: 6,
        notes: [{ atMinute: 0, text: "Materials ordered via PO-2210; site delivery expected day 5." }],
        commitments: [],
      },
    },
    messages: [],
    workbooks: {},
    workNotes: [],
    committedMinor: 26100,
  },
  scheduledEvents: [
    {
      id: "A2-msg-delay",
      fireAtMinute: atDay(2),
      kind: "message",
      payload: {
        from: "Marwell Safety Supply",
        subject: "PO-2210 — gloves delayed, substitution offered",
        body:
          "Bad news on PO-2210: GLV-100 production slipped and standard gloves would land ~4 days late. " +
          "We can ship GLV-120 light-duty gloves (same price) immediately, or hold for the original at the later date. " +
          "Glasses ship on schedule. Please confirm your choice.",
        relatedTo: "PO-2210",
        poId: "PO-2210",
        newRequestedDeliveryDay: 9,
      },
      fired: false,
    },
    {
      id: "A2-msg-customer",
      fireAtMinute: atDay(3),
      kind: "message",
      payload: {
        from: "Bayfront Property Management",
        subject: "TCK-102 — site moved up",
        body:
          "The hallway works moved up. We need the materials on site by day 6 now. " +
          "Can you confirm what you can actually deliver by then?",
        relatedTo: "TCK-102",
      },
      fired: false,
    },
    {
      id: "A2-deliv-accepted",
      fireAtMinute: atDay(4),
      kind: "delivery_arrival",
      payload: {
        poId: "PO-2210",
        deliveryId: "DV-9021",
        lines: [
          { itemId: "GLV-120", qty: 6, substituteFor: "GLV-100" },
          { itemId: "SAF-220", qty: 4 },
        ],
        carrierNote: "Substitute gloves loaded per Marwell note; glasses complete.",
      },
      fired: false,
    },
    {
      id: "A2-deliv-original",
      fireAtMinute: atDay(8),
      kind: "delivery_arrival",
      payload: {
        poId: "PO-2210",
        deliveryId: "DV-9022",
        lines: [{ itemId: "GLV-100", qty: 6 }],
        carrierNote: "Original gloves — delayed shipment.",
      },
      fired: false,
    },
  ],
  requirements: {
    lines: [
      { itemId: "GLV-100", qty: 6 },
      { itemId: "SAF-220", qty: 4 },
    ],
    dueDay: 6,
    ticketId: "TCK-102",
  },
  requirementPredicates: [
    {
      id: "rp-commitment",
      description: "a revised customer commitment was recorded after the date change",
      kind: "commitment_recorded",
      params: { ticketId: "TCK-102", afterMinute: atDay(3) },
    },
    {
      id: "rp-sub-response",
      description: "the substitution offer was answered (PO amended or message to Marwell)",
      kind: "at_least_one",
      params: { ids: ["rp-sub-amend", "rp-sub-message"] },
    },
    {
      id: "rp-sub-amend",
      description: "PO-2210 amended to reflect the decision",
      kind: "po_amended",
      params: { poId: "PO-2210" },
    },
    {
      id: "rp-sub-message",
      description: "a message went to Marwell about the substitution",
      kind: "outbound_message",
      params: { toContains: "Marwell" },
    },
    {
      id: "rp-arrival",
      description: "the arriving delivery was checked in",
      kind: "delivery_checked_in",
      params: { deliveryId: "DV-9021" },
    },
  ],
  requiredUpdates: [
    {
      id: "ru-customer-reply",
      description: "customer reply sent on TCK-102",
      kind: "outbound_message",
      params: { relatedTo: "TCK-102" },
    },
    {
      id: "ru-ticket",
      description: "TCK-102 carries a note referencing a business record",
      kind: "ticket_note_referencing_entity",
      params: { ticketId: "TCK-102" },
    },
    { id: "ru-submit", description: "work submitted", kind: "submission_present", params: {} },
  ],
  publicChecklist: [
    "Decide on the substitute gloves and record the decision (amend PO-2210 or reply to Marwell)",
    "Check in whatever actually arrives",
    "Answer Bayfront's date question with a feasible commitment",
    "Keep TCK-102 current",
    "Submit your work",
  ],
};
