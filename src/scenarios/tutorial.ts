/**
 * Guided Apprenticeship Onboarding Tutorial (Pillar 3, Item 028).
 * Step-by-step checkpoints for training new apprentices and AI agents.
 * Pure domain definitions: zero React/Next.js dependencies.
 */

import type { Scenario } from "../domain/types.ts";

export interface TutorialCheckpoint {
  step: number;
  title: string;
  instruction: string;
  hint: string;
  expectedAction: string;
}

export const TUTORIAL_CHECKPOINTS: TutorialCheckpoint[] = [
  {
    step: 1,
    title: "Inspect Supplier Catalogs",
    instruction: "Navigate to the Suppliers tab to compare unit price, lead time, and payment terms.",
    hint: "Check Kettle vs Apex; Kettle has 3-day lead time with Net 30 terms.",
    expectedAction: "view_suppliers",
  },
  {
    step: 2,
    title: "Draft an Authorized Purchase Order",
    instruction: "Create an order for GLV-100 x4 cases. Request manager approval if the total exceeds CAD 400.",
    hint: "Policy P1 requires manager approval for orders over CAD 400.",
    expectedAction: "draft_purchase_order",
  },
  {
    step: 3,
    title: "Advance Simulation Clock",
    instruction: "Advance time by 1 day to allow your manager to review and approve the PO.",
    hint: "Click '+1h' or 'Advance 1 day' to move logical time.",
    expectedAction: "advance_time",
  },
  {
    step: 4,
    title: "Authorize & Receive Delivery",
    instruction: "Authorize the approved order, advance until shipment arrives, then check in the delivery.",
    hint: "Checking in increments your inventory count and accrues unbilled inventory.",
    expectedAction: "check_in_delivery",
  },
  {
    step: 5,
    title: "Update Ticket & Submit",
    instruction: "Link the order reference to customer ticket TCK-101 and submit your work for evaluation.",
    hint: "Summarize your actions in the submission notes before submitting.",
    expectedAction: "submit_work",
  },
];

export const SCENARIO_TUTORIAL: Scenario = {
  id: "TUT-01",
  family: "A",
  title: "Guided Apprenticeship Tutorial",
  description: "An interactive, self-paced walkthrough introducing core business workflows: purchasing, manager approval, receiving, and reconciliation.",
  difficulty: "beginner",
  tags: ["tutorial", "onboarding", "walkthrough", "apprentice"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Junior Operations Apprentice",
    situation: "Welcome to WorkWorld! Learn the end-to-end lifecycle of an operations coordinator. Follow the step-by-step checklist to complete your first order.",
    objectives: [
      "Step 1: Check the supplier catalogs",
      "Step 2: Draft an order for GLV-100 x4 cases",
      "Step 3: Get manager approval and authorize",
      "Step 4: Check in the delivery when it arrives",
      "Step 5: Reference the PO on ticket TCK-101 and submit",
    ],
    guidance: ["Follow instructions in each step. Helpful hints are always available."],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 100000,
    approvalThresholdMinor: 40000,
    helpPolicy: { maxHelpRequests: 10, fatalBeyond: false },
  },
  supplierCatalog: {
    "VEN-KETTLE": {
      supplierId: "VEN-KETTLE",
      name: "Kettle Co.",
      terms: "net_30",
      leadDays: 3,
      items: {
        "GLV-100": { itemId: "GLV-100", name: "Exam Gloves Case", unitPriceMinor: 1250, unitOfMeasure: "case" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "GLV-100": 0 },
    inbox: [],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 500000, accounts_receivable: 0, inventory: 0, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-101": {
        id: "TCK-101",
        subject: "Tutorial Sample Ticket",
        status: "open",
        priority: "normal",
        customer: "Riverside Clinic",
        history: [{ atMinute: 0, text: "Awaiting restock PO confirmation." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_TUT_DONE", tier: "T1", description: "Completed tutorial checkpoints", points: 100 },
    ],
  },
};
