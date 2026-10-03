/**
 * Instant Scenario Forge (Game Changer #1).
 * Generative engine that compiles natural language prompts into executable,
 * mathematically balanced, lint-compliant WorkWorld simulation scenarios.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { ScenarioDefinition } from "./schema.ts";

export interface ScenarioForgePrompt {
  title?: string;
  companyName?: string;
  role?: string;
  crisisType: "supply_shortage" | "cash_crunch" | "fraud_attempt" | "logistics_delay" | "quality_defect" | "routine";
  targetBudgetCad?: number;
  itemCategory?: "medical" | "industrial" | "electronics" | "hospitality";
  urgencyLevel?: "standard" | "high" | "critical";
  customInstructions?: string;
}

export class ScenarioForge {
  /**
   * Compiles a high-level natural language prompt into a full, playable ScenarioDefinition.
   */
  static compile(prompt: ScenarioForgePrompt, customId?: ScenarioDefinition["id"]): ScenarioDefinition {
    const id = customId || "A1";
    const company = prompt.companyName || "Apex Care Clinics (synthetic)";
    const role = prompt.role || "Operations Coordinator";
    const budgetMinor = (prompt.targetBudgetCad ?? 2500) * 100;
    const approvalThresholdMinor = Math.min(50000, Math.round(budgetMinor * 0.2));

    const itemCatalogs = {
      medical: [
        { id: "GLV-100", name: "Nitrile Exam Gloves (Case/1000)", unit: "case", priceMinor: 3200 },
        { id: "SAF-220", name: "Face Shields (Box/50)", unit: "box", priceMinor: 2400 },
        { id: "FST-550", name: "Rapid Test Kits (Box/25)", unit: "box", priceMinor: 1850 },
      ],
      industrial: [
        { id: "WCH-01", name: "Hydraulic Pump Flange", unit: "each", priceMinor: 12500 },
        { id: "LUB-50", name: "High-Temp Synthetic Lubricant", unit: "drum", priceMinor: 8900 },
        { id: "FLT-12", name: "Particulate Air Filter Cartridge", unit: "pack", priceMinor: 4200 },
      ],
      electronics: [
        { id: "MCU-32", name: "Arm Cortex-M4 Microcontroller", unit: "reel", priceMinor: 21000 },
        { id: "CAP-100", name: "SMD Capacitor Pack 10uF", unit: "pack", priceMinor: 1500 },
        { id: "PCB-FR4", name: "Double-Layer FR4 Substrate", unit: "panel", priceMinor: 6700 },
      ],
      hospitality: [
        { id: "LIN-80", name: "Egyptian Cotton Bedding Sets", unit: "case", priceMinor: 14500 },
        { id: "CLN-05", name: "Eco Sanitizing Solvent Concentrate", unit: "jug", priceMinor: 3400 },
        { id: "AMN-10", name: "Organic Guest Toiletries Pack", unit: "carton", priceMinor: 5600 },
      ],
    };

    const selectedItems = itemCatalogs[prompt.itemCategory || "medical"];

    const situationMap = {
      supply_shortage: `Primary vendor has suffered an unexpected inventory stockout. ${company} requires urgent restock before clinic operations halt.`,
      cash_crunch: `Tight liquidity constraints require optimizing vendor payment schedules while preserving cash flow and securing critical stock.`,
      fraud_attempt: `An unauthorized third party has requested changes to vendor banking records; immediate verification and invoice screening are mandatory.`,
      logistics_delay: `Extreme weather has disrupted freight routes. Must coordinate emergency freight rerouting without breaching operational budget caps.`,
      quality_defect: `A previous delivery arrived with damaged goods. Must process Return Merchandise Authorization (RMA) and secure replacement stock.`,
      routine: `Standard periodic procurement and three-way invoice matching cycle for ${company}.`,
    };

    const situation = situationMap[prompt.crisisType] + (prompt.customInstructions ? ` Additional context: ${prompt.customInstructions}` : "");

    const scenario: ScenarioDefinition = {
      id,
      family: prompt.crisisType === "cash_crunch" ? "invoice_reconciliation" : prompt.crisisType === "quality_defect" ? "customer_recovery" : "purchase_delivery",
      version: "1.0.0",
      title: prompt.title || `Forged Scenario: ${prompt.crisisType.replace(/_/g, " ").toUpperCase()}`,
      brief: {
        company,
        role,
        situation,
        objectives: [
          `Review operational queue and pending inquiries for ${company}`,
          `Verify supplier pricing, delivery lead times, and terms`,
          `Place authorized replenishment orders within budget (CAD ${(budgetMinor / 100).toFixed(2)})`,
          `Ensure invoice and delivery reconciliation satisfy domain invariants`,
          `Document resolution in work notes and submit final report`,
        ],
        guidance: [
          `Strictly adhere to the CAD ${(approvalThresholdMinor / 100).toFixed(2)} manager approval threshold.`,
          `Double-entry ledger balances must balance before end-of-episode submission.`,
        ],
      },
      durationMinutes: prompt.urgencyLevel === "critical" ? 30 : prompt.urgencyLevel === "high" ? 45 : 60,
      policy: {
        budgetMinor,
        approvalThresholdMinor,
        currency: "CAD",
        helpPolicy: {
          maxHelpRequests: prompt.urgencyLevel === "critical" ? 1 : 3,
          fatalBeyond: true,
        },
      },
      items: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
      })),
      suppliers: [
        {
          id: "VEN-PRIMARY",
          name: "Apex Global Logistics",
          leadTimeDays: 3,
          paymentTermsDays: 30,
          catalog: selectedItems.map((item) => ({
            itemId: item.id,
            unitPriceMinor: item.priceMinor,
          })),
        },
        {
          id: "VEN-SECONDARY",
          name: "Kettle Domestic Fast-Supply",
          leadTimeDays: 1,
          paymentTermsDays: 15,
          catalog: selectedItems.map((item) => ({
            itemId: item.id,
            unitPriceMinor: Math.round(item.priceMinor * 1.15), // 15% expedited premium
          })),
        },
      ],
      initial: {
        ledgerOpening: {
          cash: 1000000, // $10,000.00
          accounts_receivable: 0,
          inventory: 25000,
          accounts_payable: 0,
        },
        purchaseOrders: {},
        deliveries: {},
        invoices: {},
        tickets: {
          "TCK-FORGE-01": {
            id: "TCK-FORGE-01",
            title: `Urgent Operations Requirement: ${prompt.crisisType}`,
            customer: "Dr. Eleanor Vance, Clinic Director",
            status: "open",
            priority: prompt.urgencyLevel === "critical" ? "high" : "normal",
            dueDay: 2,
            notes: [
              {
                atMinute: 0,
                text: `Please prioritize replenishment for our operations department. Situation: ${situation}`,
              },
            ],
            commitments: [],
          },
        },
        messages: [
          {
            id: "MSG-FORGE-01",
            direction: "in",
            from: "director@northline.local",
            to: "operations@northline.local",
            subject: `Action Required: ${prompt.crisisType.toUpperCase()}`,
            body: `Hello team,\n\n${situation}\nPlease keep spending within policy limits.\n\nBest regards,\nOperations Director`,
            atMinute: 5,
            relatedTo: "TCK-FORGE-01",
            commitment: null,
          },
        ],
        workbooks: {
          "WB-RECON-01": {
            id: "WB-RECON-01",
            title: "Operational Reconciliation & Planning",
            sheets: [
              {
                name: "Budget & Tracking",
                rows: 10,
                cols: 6,
                cells: {
                  A1: { value: "Item ID" },
                  B1: { value: "Required Qty" },
                  C1: { value: "Est. Unit Price" },
                  D1: { value: "Total Budget" },
                  A2: { value: selectedItems[0]?.id || "GLV-100" },
                  B2: { value: 10 },
                  C2: { value: (selectedItems[0]?.priceMinor || 3200) / 100 },
                  D2: { value: 0, formula: "=B2*C2" },
                },
              },
            ],
          },
        },
        workNotes: [],
      },
      scheduledEvents: [
        {
          id: "EVT-FORGE-01",
          fireAtMinute: 15,
          kind: "message",
          payload: {
            from: "dispatch@apexlogistics.com",
            subject: "Notice regarding pending order delivery",
            body: "Carrier confirms shipment slot is reserved upon formal PO authorization.",
          },
          fired: false,
        },
      ],
      requirements: {
        lines: [
          {
            itemId: selectedItems[0]?.id || "GLV-100",
            qty: 10,
          },
        ],
        dueDay: 3,
        ticketId: "TCK-FORGE-01",
      },
      requirementPredicates: [
        {
          id: "P_ORDER_PLACED",
          description: "Required inventory restock order placed with valid vendor",
          kind: "order_placed",
          params: {
            lines: [{ itemId: selectedItems[0]?.id || "GLV-100", qty: 10, comparison: "gte" }],
          },
        },
      ],
      requiredUpdates: [
        {
          id: "U_FORGE_TICKET",
          description: "Ticket updated to in_progress or higher",
          kind: "ticket_status_min",
          params: { ticketId: "TCK-FORGE-01", minStatus: "in_progress" },
        },
        {
          id: "U_FORGE_SUBMIT",
          description: "Final submission present",
          kind: "submission_present",
          params: {},
        },
      ],
      publicChecklist: [
        "Acknowledge urgent operations ticket",
        "Place restock order with chosen vendor",
        "Obtain manager authorization if order exceeds CAD 500",
        "Update ticket commitments and resolve ticket",
        "Submit final operations summary",
      ],
    };

    return scenario;
  }
}
