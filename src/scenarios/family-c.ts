/**
 * Family C — Customer/project recovery. Episodes C1 and C2.
 */
import type { ScenarioDefinition } from "./schema.ts";
import { ITEMS, SUPPLIERS, LEDGER_OPENING, POLICY, atDay } from "./fixtures.ts";

export const C1: ScenarioDefinition = {
  id: "C1",
  family: "customer_recovery",
  version: "1.0.0",
  title: "Requirement change mid-project",
  brief: {
    role: "Operations Coordinator",
    company: "Northline Supply Co. (synthetic)",
    situation:
      "Harbourview Facilities (TCK-103) has a committed plan: gloves ×4 and bolts ×4 by day 8, with PO-2250 " +
      "already authorized from Kettle. Mid-project the requirement changes — and a supplier price notice follows.",
    objectives: [
      "Revise the plan for the changed requirements (gloves ×8, bolts ×6, glasses ×2)",
      "Source the increase within budget and authority rules",
      "Re-commit to the customer only on a feasible date",
      "Keep the plan sheet, ticket and communication consistent",
    ],
    guidance: [
      "Existing orders keep their agreed price; new orders take the current catalog price.",
      "The customer is asking a direct question — answer it with a date you can actually hit (policy P8).",
      "Update the plan sheet so its totals match your actual orders.",
    ],
  },
  durationMinutes: atDay(12),
  policy: { ...POLICY, helpPolicy: { maxHelpRequests: 3, fatalBeyond: false } },
  items: ITEMS,
  suppliers: SUPPLIERS,
  initial: {
    purchaseOrders: {
      "PO-2250": {
        id: "PO-2250",
        supplierId: "SUP-KETTLE",
        lines: [
          { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
          { itemId: "FST-550", qty: 4, unitPriceMinor: 1850 },
        ],
        status: "authorized",
        note: "Harbourview scheduled-maintenance materials.",
        createdAtMinute: -2880,
        requestedDeliveryDay: 6,
        managerApproved: true,
        approvals: [{ atMinute: -2880, approvedBy: "Dana Reyes (Operations Manager)" }],
        amendments: [],
        budgetCommittedMinor: 20200,
      },
    },
    ledgerOpening: LEDGER_OPENING,
    tickets: {
      "TCK-103": {
        id: "TCK-103",
        title: "Harbourview Facilities — scheduled maintenance materials",
        customer: "Harbourview Facilities",
        status: "in_progress",
        priority: "high",
        dueDay: 8,
        notes: [
          {
            atMinute: 0,
            text: "Plan committed: gloves x4 + bolts x4 on site by day 8 (PO-2250, Kettle, 3-day lead).",
          },
        ],
        commitments: [],
      },
    },
    messages: [],
    workbooks: {
      "PLAN-C1": {
        id: "PLAN-C1",
        name: "harbourview-plan",
        cells: {
          A1: "Item",
          B1: "Planned qty",
          C1: "Ordered qty",
          D1: "Line total (minor)",
          A2: "GLV-100",
          B2: 4,
          C2: 4,
          D2: 12800,
          A3: "FST-550",
          B3: 4,
          C3: 4,
          D3: 7400,
          A5: "Plan total",
          D5: { formula: "SUM(D2:D3)" },
        },
        edits: [],
      },
    },
    workNotes: [],
    committedMinor: 20200,
  },
  scheduledEvents: [
    {
      id: "C1-requirement-change",
      fireAtMinute: atDay(1),
      kind: "requirement_change",
      payload: {
        from: "Harbourview Facilities",
        subject: "TCK-103 — requirement change",
        body:
          "Scope changed: we now need gloves x8 cases, bolts x6 boxes and safety glasses x2 boxes. " +
          "The site date is still day 8. Can you still make that? Please confirm what you can commit to.",
        relatedTo: "TCK-103",
        ticketId: "TCK-103",
        addLines: [
          { itemId: "GLV-100", qty: 8 },
          { itemId: "FST-550", qty: 6 },
          { itemId: "SAF-220", qty: 2 },
        ],
        removeLines: [],
        newDueDay: 8,
      },
      fired: false,
    },
    {
      id: "C1-price-change",
      fireAtMinute: atDay(2),
      kind: "price_change",
      payload: {
        supplierId: "SUP-MARWELL",
        itemId: "GLV-100",
        newPriceMinor: 3186,
        body:
          "Price update: GLV-100 list price moves to 3186 minor/case for NEW orders only. " +
          "Orders already authorized keep their agreed price.",
      },
      fired: false,
    },
  ],
  requirements: {
    lines: [
      { itemId: "GLV-100", qty: 4 },
      { itemId: "FST-550", qty: 4 },
    ],
    dueDay: 8,
    ticketId: "TCK-103",
  },
  requirementPredicates: [
    {
      id: "rp-order",
      description: "the changed requirements are fully covered by authorized orders",
      kind: "order_placed",
      params: {
        lines: [
          { itemId: "GLV-100", qty: 8, comparison: "gte" },
          { itemId: "FST-550", qty: 6, comparison: "gte" },
          { itemId: "SAF-220", qty: 2, comparison: "gte" },
        ],
      },
    },
    {
      id: "rp-commitment",
      description: "a revised commitment was recorded after the requirement change",
      kind: "commitment_recorded",
      params: { ticketId: "TCK-103", afterMinute: atDay(1) },
    },
  ],
  requiredUpdates: [
    {
      id: "ru-customer",
      description: "customer answered on TCK-103",
      kind: "outbound_message",
      params: { relatedTo: "TCK-103" },
    },
    {
      id: "ru-ticket",
      description: "TCK-103 carries a note referencing a business record",
      kind: "ticket_note_referencing_entity",
      params: { ticketId: "TCK-103" },
    },
    {
      id: "ru-plan",
      description: "plan workbook updated to match reality",
      kind: "workbook_edited",
      params: { workbookId: "PLAN-C1" },
    },
    { id: "ru-submit", description: "work submitted", kind: "submission_present", params: {} },
  ],
  publicChecklist: [
    "Read the changed requirements (gloves ×8, bolts ×6, glasses ×2)",
    "Cover the increase with authorized orders within budget",
    "Answer Harbourview with a feasible commitment",
    "Update the plan sheet and TCK-103",
    "Submit your work",
  ],
};

export const C2: ScenarioDefinition = {
  id: "C2",
  family: "customer_recovery",
  version: "1.0.0",
  title: "Supply-driven recovery",
  brief: {
    role: "Operations Coordinator",
    company: "Northline Supply Co. (synthetic)",
    situation:
      "Northgate School Board (TCK-104) expects term-start supplies by day 7. PO-2260 (Marwell: cleaner ×6, " +
      "glasses ×5) is authorized. The delivery lands short — the supplier has a production issue.",
    objectives: [
      "Record the shortfall accurately",
      "Recover: reorder the shortfall or re-commit honestly",
      "Keep the customer informed with a real date",
      "Keep TCK-104 current",
    ],
    guidance: [
      "Halbrook can supply fast at premium prices — check the budget and authority rules before ordering.",
      "Silence is the failure mode here: the ticket and the customer need an update either way.",
      "Do not promise a date the sourcing cannot support (policy P8).",
    ],
  },
  durationMinutes: atDay(12),
  policy: { ...POLICY, helpPolicy: { maxHelpRequests: 3, fatalBeyond: false } },
  items: ITEMS,
  suppliers: SUPPLIERS,
  initial: {
    purchaseOrders: {
      "PO-2260": {
        id: "PO-2260",
        supplierId: "SUP-MARWELL",
        lines: [
          { itemId: "CLN-080", qty: 6, unitPriceMinor: 4100 },
          { itemId: "SAF-220", qty: 5, unitPriceMinor: 2100 },
        ],
        status: "authorized",
        note: "Northgate term-start supplies.",
        createdAtMinute: -2880,
        requestedDeliveryDay: 5,
        managerApproved: true,
        approvals: [{ atMinute: -2880, approvedBy: "Dana Reyes (Operations Manager)" }],
        amendments: [],
        budgetCommittedMinor: 35100,
      },
    },
    ledgerOpening: LEDGER_OPENING,
    tickets: {
      "TCK-104": {
        id: "TCK-104",
        title: "Northgate School Board — term-start supplies",
        customer: "Northgate School Board",
        status: "in_progress",
        priority: "high",
        dueDay: 7,
        notes: [{ atMinute: 0, text: "Materials committed for day 7 via PO-2260 (Marwell)." }],
        commitments: [],
      },
    },
    messages: [],
    workbooks: {},
    workNotes: [],
    committedMinor: 35100,
  },
  scheduledEvents: [
    {
      id: "C2-shortfall",
      fireAtMinute: atDay(2),
      kind: "delivery_arrival",
      payload: {
        poId: "PO-2260",
        deliveryId: "DV-901",
        lines: [
          { itemId: "CLN-080", qty: 3 },
          { itemId: "SAF-220", qty: 3 },
        ],
        carrierNote:
          "Short shipped: supplier production issue. Remaining CLN-080 x3 and SAF-220 x2 canceled by shipper.",
      },
      fired: false,
    },
  ],
  requirements: {
    lines: [
      { itemId: "CLN-080", qty: 6 },
      { itemId: "SAF-220", qty: 5 },
    ],
    dueDay: 7,
    ticketId: "TCK-104",
  },
  requirementPredicates: [
    {
      id: "rp-delivery",
      description: "the short delivery was checked in",
      kind: "delivery_checked_in",
      params: { deliveryId: "DV-901" },
    },
    {
      id: "rp-recovery",
      description: "a recovery path was taken (reorder or honest re-commitment)",
      kind: "at_least_one",
      params: { ids: ["rp-reorder", "rp-recommit"] },
    },
    {
      id: "rp-reorder",
      description: "the shortfall was reordered after the disruption",
      kind: "order_placed",
      params: {
        afterMinute: atDay(2),
        lines: [
          { itemId: "CLN-080", qty: 3, comparison: "gte" },
          { itemId: "SAF-220", qty: 2, comparison: "gte" },
        ],
      },
    },
    {
      id: "rp-recommit",
      description: "a revised commitment was recorded after the disruption",
      kind: "commitment_recorded",
      params: { ticketId: "TCK-104", afterMinute: atDay(2) },
    },
  ],
  requiredUpdates: [
    {
      id: "ru-customer",
      description: "customer updated on TCK-104",
      kind: "outbound_message",
      params: { relatedTo: "TCK-104" },
    },
    {
      id: "ru-ticket",
      description: "TCK-104 carries a note referencing a business record",
      kind: "ticket_note_referencing_entity",
      params: { ticketId: "TCK-104" },
    },
    { id: "ru-submit", description: "work submitted", kind: "submission_present", params: {} },
  ],
  publicChecklist: [
    "Check in DV-901 and record the shortfall accurately",
    "Decide: reorder the shortfall (watch budget/authority) or re-commit honestly",
    "Update the customer with a real date",
    "Keep TCK-104 current",
    "Submit your work",
  ],
};
