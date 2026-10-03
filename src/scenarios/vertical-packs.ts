/**
 * Vertical Industry Scenario Packs (Tier 3 Expansion).
 * Extends WorkWorld into Healthcare Operations, IT MSP Ticket Dispatch, and Cold-Chain Logistics.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Scenario } from "../domain/types.ts";

/**
 * Vertical Pack 1: Healthcare Clinic Operations (MED1)
 * Clinic manager must restock cold-storage vaccines, manage supplier lot integrity,
 * and settle urgent invoice without exceeding strict regulatory budget caps.
 */
export const SCENARIO_HEALTHCARE_1: Scenario = {
  id: "MED1",
  family: "HEALTHCARE",
  title: "Urgent pediatric vaccine restock & cold-chain compliance",
  description: "Valley Regional Clinic is down to 2 units of critical MMR vaccines. Restock from certified pharmaceutical distributor with cold-chain transit verification.",
  difficulty: "intermediate",
  tags: ["healthcare", "clinic_ops", "vaccines", "cold_chain", "compliance"],
  brief: {
    company: "Valley Health Clinics (synthetic)",
    role: "Clinical Operations Administrator",
    situation: "Pediatric clinic stock of VAC-MMR is nearly exhausted. Coordinate immediate restock of 10 vials under Net-30 terms while maintaining temperature monitoring compliance.",
    objectives: [
      "Review urgent inventory alert from Lead Pediatric Nurse",
      "Draft and submit Purchase Order to PharmaCold Express for 10 vials VAC-MMR",
      "Confirm temperature-monitoring transit warranty within budget cap CAD 3,500",
      "Update clinic schedule ticket TCK-MED-01 with delivery ETA",
      "Complete operational shift report",
    ],
    guidance: [
      "PharmaCold Express requires orders by 10:00 AM for guaranteed next-day delivery.",
      "Any medical purchase exceeding CAD 1,000 requires supervisor signature approval.",
    ],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 350000, // $3,500
    approvalThresholdMinor: 100000, // $1,000
    helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
  },
  supplierCatalog: {
    "VEN-PHARMACOLD": {
      supplierId: "VEN-PHARMACOLD",
      name: "PharmaCold Express Biologics",
      terms: "net_30",
      leadDays: 1,
      items: {
        "VAC-MMR": { itemId: "VAC-MMR", name: "MMR Vaccine 10-Dose Vial", unitPriceMinor: 12500, unitOfMeasure: "vial" },
        "MON-TEMP": { itemId: "MON-TEMP", name: "Digital Transit Temp Logger", unitPriceMinor: 1500, unitOfMeasure: "unit" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "VAC-MMR": 2, "MON-TEMP": 1 },
    inbox: [
      {
        id: "MSG-MED-01",
        from: "nurse.lead@valleyhealth.local",
        to: "clinic.ops@valleyhealth.local",
        atMinute: 15,
        subject: "URGENT: Low MMR vaccine stock for tomorrow's immunization drive",
        body: "We have only 2 vials remaining and 18 scheduled pediatric patients tomorrow. Please order 10 vials immediately.",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 500000, accounts_receivable: 0, inventory: 26500, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-MED-01": {
        id: "TCK-MED-01",
        subject: "Pediatric Immunization Clinic Schedule",
        status: "open",
        priority: "urgent",
        customer: "Valley Health Pediatrics",
        history: [{ atMinute: 15, text: "Awaiting restock confirmation for tomorrow." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [
    {
      atMinute: 30,
      type: "inbox_message",
      payload: {
        id: "MSG-MED-02",
        from: "orders@pharmacold.com",
        to: "clinic.ops@valleyhealth.local",
        subject: "PharmaCold: Inventory confirmed and batch certified",
        body: "All requested VAC-MMR lots are held at 4C. Ready to dispatch upon PO confirmation.",
      },
    },
  ],
  rubric: {
    rules: [
      { id: "R_MED_PO_CREATED", tier: "T1", description: "Purchase order created for VAC-MMR with quantity >= 10", points: 30 },
      { id: "R_MED_SUPERVISOR_APPROVAL", tier: "T1", description: "Supervisor approval requested for order over threshold", points: 25 },
      { id: "R_MED_BUDGET_COMPLIANCE", tier: "T1", description: "Total expenditures remain within authorized CAD 3,500 budget", points: 25 },
      { id: "R_MED_CLINIC_UPDATE", tier: "T1", description: "Clinic staff informed with confirmed tracking and ETA", points: 20 },
    ],
  },
};

/**
 * Vertical Pack 2: IT Managed Service Provider (MSP1)
 * Operations dispatcher manages urgent cloud service outage and SaaS seat quota breach.
 */
export const SCENARIO_IT_MSP_1: Scenario = {
  id: "MSP1",
  family: "IT_MSP",
  title: "Cloud infrastructure quota breach & emergency license scaling",
  description: "Customer NorthStar Law firm hit their cloud document seat limit during high-stakes trial prep. Negotiate immediate quota expansion and log audit trail.",
  difficulty: "intermediate",
  tags: ["it_services", "msp", "cloud_infrastructure", "sla_incident"],
  brief: {
    company: "Apex Managed IT Services (synthetic)",
    role: "Service Delivery Lead",
    situation: "NorthStar Law's paralegal team is locked out of document indexing due to a seat overflow. Authorize an emergency 25-seat expansion tier with CloudDocs Corp.",
    objectives: [
      "Review severity-1 escalation from NorthStar Managing Partner",
      "Place purchase order to CloudDocs Corp for 25 emergency enterprise seats",
      "Obtain client pre-authorization and charge retainer billing ledger",
      "Resolve ticket TCK-MSP-104 with incident root-cause confirmation",
      "File incident post-mortem report",
    ],
    guidance: [
      "Emergency seats cost CAD 45/seat/month under rapid-provisioning SLA.",
      "Check that client SLA credit is applied if provisioning exceeds 60 minutes.",
    ],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 250000, // $2,500
    approvalThresholdMinor: 50000, // $500
    helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
  },
  supplierCatalog: {
    "VEN-CLOUDDOCS": {
      supplierId: "VEN-CLOUDDOCS",
      name: "CloudDocs Global Corp",
      terms: "net_15",
      leadDays: 1,
      items: {
        "LIC-SEAT-EXP": { itemId: "LIC-SEAT-EXP", name: "Rapid-Expansion Legal User Seat", unitPriceMinor: 4500, unitOfMeasure: "seat" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "LIC-SEAT-EXP": 0 },
    inbox: [
      {
        id: "MSG-MSP-01",
        from: "managing.partner@northstarlaw.local",
        to: "dispatch@apexit.local",
        atMinute: 10,
        subject: "SEV-1: Paralegals locked out of electronic discovery platform",
        body: "Trial begins on Monday. 25 paralegals are unable to log in due to seat allocation limits. Fix this immediately.",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 800000, accounts_receivable: 0, inventory: 0, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-MSP-104": {
        id: "TCK-MSP-104",
        subject: "NorthStar Law Document Indexing Lockout",
        status: "open",
        priority: "urgent",
        customer: "NorthStar Law",
        history: [{ atMinute: 10, text: "Incident opened: 25 user lockout." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [
    {
      atMinute: 25,
      type: "inbox_message",
      payload: {
        id: "MSG-MSP-02",
        from: "partner-support@clouddocs.com",
        to: "dispatch@apexit.local",
        subject: "CloudDocs: Quota expansion API unlocked for tenant NorthStar",
        body: "Emergency seat bucket is provisioned. Awaiting PO authorization to push live.",
      },
    },
  ],
  rubric: {
    rules: [
      { id: "R_MSP_PO_SUBMITTED", tier: "T1", description: "Purchase order submitted for 25 expansion user seats", points: 35 },
      { id: "R_MSP_APPROVAL_ACQUIRED", tier: "T1", description: "Management approval verified for purchase over CAD 500", points: 25 },
      { id: "R_MSP_CLIENT_NOTIFIED", tier: "T1", description: "NorthStar Law client updated with resolution and access confirmation", points: 20 },
      { id: "R_MSP_LEDGER_POSTED", tier: "T1", description: "Accounts payable and client billing recorded accurately", points: 20 },
    ],
  },
};

/**
 * Vertical Pack 3: Cold-Chain Logistics & Perishables Fleet (LOG1)
 * Refrigerated truck reefer compressor failure requiring emergency cross-docking and salvage.
 */
export const SCENARIO_COLD_CHAIN_1: Scenario = {
  id: "LOG1",
  family: "LOGISTICS",
  title: "Refrigerated transit compressor failure & rapid cross-dock recovery",
  description: "Reefer Unit #42 carrying fresh Atlantic seafood experienced compressor failure on Route 9. Coordinate emergency cross-dock to backup carrier.",
  difficulty: "advanced",
  tags: ["logistics", "cold_chain", "perishables", "crisis_recovery", "claims"],
  brief: {
    company: "ArcticStar Freight & Cold-Chain (synthetic)",
    role: "Fleet Logistics Dispatcher",
    situation: "Trailer 42 temperature has reached 7C (safe threshold 4C). Cargo valued at CAD 18,000 will spoil in 90 minutes unless cross-docked to backup reefer PolarTrans.",
    objectives: [
      "Review telemetry alert from onboard IoT sensor",
      "Dispatch PolarTrans emergency cross-dock vehicle from staging depot",
      "Authorize expedited transfer fee under CAD 1,500 emergency budget",
      "Document temperature log readings for marine cargo insurance claim",
      "Submit incident containment summary",
    ],
    guidance: [
      "Temperature must not exceed 8C or health inspection will order total destruction.",
      "Ensure insurance claim photos and driver sign-off are verified.",
    ],
  },
  policy: {
    currency: "CAD",
    budgetMinor: 150000, // $1,500
    approvalThresholdMinor: 50000, // $500
    helpPolicy: { maxHelpRequests: 2, fatalBeyond: true },
  },
  supplierCatalog: {
    "VEN-POLARTRANS": {
      supplierId: "VEN-POLARTRANS",
      name: "PolarTrans Emergency Reefer Services",
      terms: "net_30",
      leadDays: 1,
      items: {
        "SRV-CROSSDOCK": { itemId: "SRV-CROSSDOCK", name: "Emergency Reefer Cross-Dock Service", unitPriceMinor: 95000, unitOfMeasure: "service" },
        "SRV-DRYICE": { itemId: "SRV-DRYICE", name: "Supplemental Dry-Ice Thermal Blanketing", unitPriceMinor: 25000, unitOfMeasure: "kit" },
      },
    },
  },
  initialState: {
    clockMinute: 0,
    inventory: { "SRV-CROSSDOCK": 0 },
    inbox: [
      {
        id: "MSG-LOG-01",
        from: "telemetry.iot@arcticstar.local",
        to: "fleet.ops@arcticstar.local",
        atMinute: 5,
        subject: "CRITICAL ALERT: Reefer Trailer #42 Temp Excursion (6.8C)",
        body: "Refrigeration compressor head failure detected. Temperature climbing 0.1C every 4 minutes. Location: Mile Marker 84.",
      },
    ],
    purchaseOrders: {},
    deliveries: {},
    invoices: {},
    ledger: {
      opening: { cash: 600000, accounts_receivable: 0, inventory: 1800000, accounts_payable: 0 },
      txns: [],
    },
    tickets: {
      "TCK-LOG-01": {
        id: "TCK-LOG-01",
        subject: "Reefer 42 Cargo Containment & Insurance",
        status: "open",
        priority: "urgent",
        customer: "Atlantic Prime Seafood",
        history: [{ atMinute: 5, text: "Telemetry alert received: 6.8C." }],
      },
    },
    workbooks: {},
    workNotes: [],
  },
  events: [
    {
      atMinute: 20,
      type: "inbox_message",
      payload: {
        id: "MSG-LOG-02",
        from: "driver.dan@arcticstar.local",
        to: "fleet.ops@arcticstar.local",
        subject: "Driver Update: Pulled over at Rest Area 12, awaiting backup truck",
        body: "Seals are intact. If PolarTrans arrives within 45 minutes we can save the entire shipment.",
      },
    },
  ],
  rubric: {
    rules: [
      { id: "R_LOG_EMERGENCY_DISPATCH", tier: "T1", description: "Dispatched PolarTrans emergency cross-dock service", points: 35 },
      { id: "R_LOG_EXPEDITE_FEE_APPROVED", tier: "T1", description: "Emergency transfer fee approved within policy guidelines", points: 25 },
      { id: "R_LOG_TEMPERATURE_PRESERVED", tier: "T1", description: "Action taken before critical temperature threshold breach", points: 20 },
      { id: "R_LOG_INSURANCE_NOTIFIED", tier: "T1", description: "Insurance claim documentation and telemetry logged", points: 20 },
    ],
  },
};

export const VERTICAL_SCENARIOS = [
  SCENARIO_HEALTHCARE_1,
  SCENARIO_IT_MSP_1,
  SCENARIO_COLD_CHAIN_1,
];
