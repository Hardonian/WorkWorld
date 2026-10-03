/**
 * Enterprise Scenario Families D, E, F, G, H (Pillar 3, Items 021–025).
 * Pure domain definitions: zero React/Next.js dependencies.
 */

import type { Scenario } from "../domain/types.ts";

/**
 * Family D: Supply Chain Disruption & Force Majeure (Item 021)
 * Primary supplier affected by port shutdown; must qualify and order from secondary supplier with tighter lead time.
 */
export const SCENARIO_D1: Scenario = {
  id: "D1",
  family: "D",
  title: "Port strike & secondary supplier activation",
  description: "Primary supplier Apex is blocked by a maritime port strike. Switch to secondary domestic supplier Kettle to prevent clinic stockout.",
  difficulty: "intermediate",
  tags: ["disruption", "force_majeure", "sourcing", "dual_vendor"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Logistics Specialist",
    situation: "A regional port disruption has halted all Apex imports. Riverside Clinic needs GLV-100 cases urgently. Settle existing debts and shift replenishment to Kettle.",
    objectives: [
      "Review urgent port strike notice in inbox",
      "Order GLV-100 x8 cases from secondary domestic supplier Kettle",
      "Ensure order is placed within budget threshold CAD 2,000",
      "Update customer ticket TCK-201 with confirmed delivery estimate",
      "Submit final operations report",
    ],
    guidance: [
      "Kettle's unit price is slightly higher, but domestic road freight avoids the port strike.",
      "Check that manager approval is obtained if total purchase exceeds CAD 400.",
    ],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 200000, // $2,000
    approvalThresholdMinor: 40000, // $400
    helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
  },
  supplierCatalog: {
    "VEN-KETTLE": {
      supplierId: "VEN-KETTLE",
      name: "Kettle Domestic Medical",
      terms: "net_30",
      leadDays: 3,
      items: {
        "GLV-100": { itemId: "GLV-100", name: "Exam Gloves Case", unitPriceMinor: 2200, unitOfMeasure: "case" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "GLV-100": 4 },
    inbox: [
      {
        id: "MSG-D1-01",
        from: "shipping@apex-dist.com",
        to: "ops@northline.local",
        atMinute: 60,
        subject: "FORCE MAJEURE: Port Terminal Strike",
        body: "All maritime container traffic is halted. We cannot fulfill current backorders until further notice.",
        direction: "in",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 1500000, accounts_receivable: 0, inventory: 40000, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-201": {
        id: "TCK-201",
        subject: "Riverside Clinic urgent restock inquiry",
        status: "open",
        priority: "urgent",
        customer: "Riverside Clinic",
        history: [{ atMinute: 30, text: "Need confirmation on glove shipments given news of the strike." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_D1_ORDER_PLACED", tier: "T1", description: "Must place replacement order with Kettle", points: 40 },
      { id: "R_D1_TICKET_UPDATED", tier: "T1", description: "Must update customer ticket with realistic timeline", points: 30 },
      { id: "R_D1_BUDGET_RESPECTED", tier: "T1", description: "Must remain within authorized budget", points: 30 },
    ],
  },
};

/**
 * Family E: Financial Audit & Compliance Defense (Item 022)
 * Unrecorded invoice discovered; must verify legitimacy, record accrual, and respond to audit inquiry.
 */
export const SCENARIO_E1: Scenario = {
  id: "E1",
  family: "E",
  title: "Unrecorded invoice discovery & audit confirmation",
  description: "External auditors flagged a missing vendor invoice. Verify goods received, record AP accrual, and confirm balance.",
  difficulty: "advanced",
  tags: ["audit", "compliance", "accrual", "sox"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Senior AP & Accounting Specialist",
    situation: "During year-end audit, auditors found delivery receipt DEL-901 without a matching invoice in the ledger. Settle the accounting discrepancy.",
    objectives: [
      "Review delivery record DEL-901 for received items",
      "Process vendor invoice INV-E101 matching DEL-901",
      "Verify double-entry ledger balance reflects accounts payable accrual",
      "Respond to audit ticket TCK-AUDIT-01 with reconciliation sheet",
    ],
    guidance: ["Ensure goods received not invoiced (GRNI) accrual is cleared upon recording invoice."],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 500000,
    approvalThresholdMinor: 50000,
    helpPolicy: { maxHelpRequests: 2, fatalBeyond: true },
  },
  supplierCatalog: {
    "VEN-MEDLINE": {
      supplierId: "VEN-MEDLINE",
      name: "Medline Industries",
      terms: "net_30",
      leadDays: 4,
      items: {
        "KIT-900": { itemId: "KIT-900", name: "Surgical Prep Kit", unitPriceMinor: 4500, unitOfMeasure: "kit" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "KIT-900": 10 },
    inbox: [
      {
        id: "MSG-E1-01",
        from: "audit@external-cpa.local",
        to: "accounting@northline.local",
        atMinute: 120,
        subject: "Audit Inquiry: Unrecorded Liabilities Sample #44",
        body: "Please confirm why goods on DEL-901 are in inventory without an AP ledger balance.",
        direction: "in",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 2000000, accounts_receivable: 500000, inventory: 45000, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-AUDIT-01": {
        id: "TCK-AUDIT-01",
        subject: "Audit Sample 44 Confirmation",
        status: "open",
        priority: "high",
        customer: "External Auditor",
        history: [{ atMinute: 120, text: "Sample 44 audit request issued." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_E1_INVOICE_RECORDED", tier: "T1", description: "Invoice must be recorded in AP ledger", points: 50 },
      { id: "R_E1_AUDIT_RESPONSE", tier: "T1", description: "Audit ticket confirmed with reconciliation note", points: 50 },
    ],
  },
};

/**
 * Family F: Fraud Detection & Anti-Phishing (Item 023)
 * A spoofed email requests changing supplier remittance bank account prior to payment run.
 */
export const SCENARIO_F1: Scenario = {
  id: "F1",
  family: "F",
  title: "Bank details modification phishing defense",
  description: "A suspicious vendor email requests an urgent change of wire details. Identify red flags, freeze payment, and report phishing.",
  difficulty: "intermediate",
  tags: ["fraud", "security", "phishing", "internal_controls"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Financial Operations Officer",
    situation: "An email purporting to be from Apex CFO requests wire routing to an offshore account before today's scheduled settlement.",
    objectives: [
      "Inspect inbound message MSG-F1-01 for domain spoofing and urgency manipulation",
      "Refuse the unauthorized bank account change without secondary out-of-band phone verification",
      "Place payment hold on invoice INV-APX-88",
      "Log security incident note and resolve security ticket",
    ],
    guidance: ["Never alter vendor banking information without dual verification."],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 1000000,
    approvalThresholdMinor: 50000,
    helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
  },
  supplierCatalog: {},
  initialState: {
    clockMinute: 0,
    inventory: {},
    inbox: [
      {
        id: "MSG-F1-01",
        from: "cfo@apex-dlst.com", // Typo-squatted domain (.dlst instead of .dist)
        to: "ap@northline.local",
        atMinute: 90,
        subject: "URGENT: Updated banking wire instructions for pending payment",
        body: "Please update our beneficiary wire details immediately to Account #994827-CY to avoid shipment suspension.",
        direction: "in",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 1000000, accounts_receivable: 0, inventory: 0, accounts_payable: 50000 },
      txns: [],
    },
    tickets: {
      "TCK-SEC-01": {
        id: "TCK-SEC-01",
        subject: "Review of vendor payment detail modification request",
        status: "open",
        priority: "urgent",
        customer: "Internal Compliance",
        history: [{ atMinute: 95, text: "Verify validity of bank change request." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_F1_PAYMENT_FROZEN", tier: "T1", description: "Fraudulent wire payment must be held", points: 60 },
      { id: "R_F1_SECURITY_NOTE", tier: "T1", description: "Security incident documented in ticket", points: 40 },
    ],
  },
};

/**
 * Family G: Critical Client Escalation & SLA Breach (Item 024)
 * Client faces service disruption due to late delivery; offer contractual discount and expedited fulfillment.
 */
export const SCENARIO_G1: Scenario = {
  id: "G1",
  family: "G",
  title: "Client escalation & SLA service recovery",
  description: "A key healthcare provider threatens contract cancellation due to missed shipment SLA. Implement restitution remedies.",
  difficulty: "advanced",
  tags: ["sla", "escalation", "customer_service", "remedy"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Senior Client Success Operations Manager",
    situation: "General Hospital's emergency room restock was delayed past the guaranteed delivery window.",
    objectives: [
      "Review SLA penalty clauses in the contract brief",
      "Calculate 10% late delivery contractual restitution rebate",
      "Dispatch expedited replacement via hotshot freight",
      "Update ticket TCK-HOSP-01 with formal executive apology and trackable airway bill",
    ],
    guidance: ["Protect the multi-year client relationship while honoring contractual commitments."],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 300000,
    approvalThresholdMinor: 40000,
    helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
  },
  supplierCatalog: {},
  initialState: {
    clockMinute: 0,
    inventory: {},
    inbox: [],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 5000000, accounts_receivable: 100000, inventory: 50000, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-HOSP-01": {
        id: "TCK-HOSP-01",
        subject: "URGENT SLA BREACH: General Hospital ER Restock",
        status: "open",
        priority: "urgent",
        customer: "General Hospital",
        history: [{ atMinute: 60, text: "Hospital COO notified Northline of missed delivery commitment." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_G1_EXPEDITED_DISPATCH", tier: "T1", description: "Hotshot/expedited replacement dispatched", points: 50 },
      { id: "R_G1_SLA_REBATE", tier: "T1", description: "Contractual rebate credit calculated and recorded", points: 50 },
    ],
  },
};

/**
 * Family H: Working Capital & Liquidity Crunch (Item 025)
 * Severe short-term cash squeeze; prioritize essential vendor payments and negotiate payment plans.
 */
export const SCENARIO_H1: Scenario = {
  id: "H1",
  family: "H",
  title: "Working capital rationing & supplier payment plan",
  description: "Company cash balance is constrained. Negotiate partial settlements and extend credit terms to preserve solvent operations.",
  difficulty: "advanced",
  tags: ["cash_flow", "working_capital", "negotiation", "liquidity"],
  brief: {
    company: "Northline Supply Co. (synthetic)",
    role: "Director of Treasury & Operations",
    situation: "Due to delayed receivables, available cash is CAD 3,500 while vendor dues total CAD 8,000. Ration cash to avoid supply cutoff.",
    objectives: [
      "Review aging payables ledger across all vendors",
      "Prioritize critical supplier Kettle with 50% partial payment",
      "Send payment extension notice to non-critical vendors",
      "Ensure minimum cash reserve CAD 1,000 is preserved",
    ],
    guidance: ["Never overdraw the operational cash account."],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 1000000,
    approvalThresholdMinor: 100000,
    helpPolicy: { maxHelpRequests: 2, fatalBeyond: true },
  },
  supplierCatalog: {},
  initialState: {
    clockMinute: 0,
    inventory: {},
    inbox: [],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 350000, accounts_receivable: 900000, inventory: 200000, accounts_payable: 800000 },
      txns: [],
    },
    tickets: {
      "TCK-CASH-01": {
        id: "TCK-CASH-01",
        subject: "Cash flow management - Week 14",
        status: "open",
        priority: "urgent",
        customer: "Internal Treasury",
        history: [{ atMinute: 10, text: "Maintain minimum $1,000 cash buffer while managing supplier payments." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [],
  rubric: {
    fatalTiers: ["T1"],
    rules: [
      { id: "R_H1_POSITIVE_CASH", tier: "T1", description: "Cash balance must remain above minimum buffer", points: 50 },
      { id: "R_H1_PARTIAL_SETTLEMENT", tier: "T1", description: "Critical vendor partially settled", points: 50 },
    ],
  },
};

export const ENTERPRISE_SCENARIOS = [
  SCENARIO_D1,
  SCENARIO_E1,
  SCENARIO_F1,
  SCENARIO_G1,
  SCENARIO_H1,
];
