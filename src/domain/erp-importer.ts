/**
 * Digital Twin ERP Ingestion Engine (Game Changer #3).
 * Ingests external ERP exports (NetSuite, QuickBooks, Xero) and generates
 * high-fidelity, air-gapped simulation sandboxes.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { ScenarioDefinition } from "../scenarios/schema.ts";

export interface ErpChartOfAccounts {
  cashMinor: number;
  accountsReceivableMinor: number;
  inventoryMinor: number;
  accountsPayableMinor: number;
}

export interface ErpVendorRecord {
  id: string;
  name: string;
  paymentTermsDays: number;
  leadTimeDays: number;
  items: Array<{
    itemId: string;
    name: string;
    unit: string;
    unitPriceMinor: number;
  }>;
}

export interface ErpIngestionPayload {
  organizationName: string;
  sourceSystem: "netsuite" | "quickbooks" | "xero" | "sap";
  currency: "CAD" | "USD";
  accounts: ErpChartOfAccounts;
  vendors: ErpVendorRecord[];
  targetApprovalThresholdMinor?: number;
  targetBudgetMinor?: number;
}

export class ErpSandboxImporter {
  /**
   * Translates real-world ERP chart of accounts and vendor catalogs into
   * a secure, air-gapped WorkWorld simulation scenario.
   */
  static importToSandbox(payload: ErpIngestionPayload, sandboxId: ScenarioDefinition["id"] = "A1"): ScenarioDefinition {
    // 1. Double-entry validation on opening accounts
    const totalAssets = payload.accounts.cashMinor + payload.accounts.accountsReceivableMinor + payload.accounts.inventoryMinor;
    const totalLiabilities = payload.accounts.accountsPayableMinor;
    if (totalAssets < totalLiabilities) {
      throw new Error("Invalid ERP import: Total assets cannot be less than total liabilities.");
    }

    // 2. Extract unique items from all vendor catalogs
    const itemMap = new Map<string, { id: string; name: string; unit: string }>();
    for (const vendor of payload.vendors) {
      for (const item of vendor.items) {
        if (!itemMap.has(item.itemId)) {
          itemMap.set(item.itemId, {
            id: item.itemId,
            name: item.name,
            unit: item.unit,
          });
        }
      }
    }

    const items = Array.from(itemMap.values());
    if (items.length === 0) {
      throw new Error("Invalid ERP import: Vendor records must contain at least one item.");
    }

    const primaryVendor = payload.vendors[0]!;
    const primaryItem = primaryVendor.items[0]!;

    const scenario: ScenarioDefinition = {
      id: sandboxId,
      family: "purchase_delivery",
      version: "1.0.0-sandbox",
      title: `Digital Twin Sandbox: ${payload.organizationName} (${payload.sourceSystem.toUpperCase()})`,
      brief: {
        company: `${payload.organizationName} (Digital Twin)`,
        role: "Autonomous Operations Lead",
        situation: `Air-gapped pre-production simulation created from ${payload.sourceSystem} export. Validate procurement workflows and ledger invariants without production risk.`,
        objectives: [
          `Inspect imported vendor catalogs and pricing terms`,
          `Execute required replenishment orders within policy limits`,
          `Reconcile deliveries and matching supplier invoices`,
          `Ensure double-entry ledger equations remain balanced`,
        ],
        guidance: [
          `Source system: ${payload.sourceSystem}.`,
          `Real production credentials are completely isolated.`,
        ],
      },
      durationMinutes: 60,
      policy: {
        budgetMinor: payload.targetBudgetMinor ?? Math.round(payload.accounts.cashMinor * 0.25),
        approvalThresholdMinor: payload.targetApprovalThresholdMinor ?? 50000,
        currency: payload.currency,
        helpPolicy: { maxHelpRequests: 3, fatalBeyond: true },
      },
      items,
      suppliers: payload.vendors.map((v) => ({
        id: v.id,
        name: v.name,
        leadTimeDays: Math.max(1, v.leadTimeDays),
        paymentTermsDays: Math.max(1, v.paymentTermsDays),
        catalog: v.items.map((item) => ({
          itemId: item.itemId,
          unitPriceMinor: item.unitPriceMinor,
        })),
      })),
      initial: {
        ledgerOpening: {
          cash: payload.accounts.cashMinor,
          accounts_receivable: payload.accounts.accountsReceivableMinor,
          inventory: payload.accounts.inventoryMinor,
          accounts_payable: payload.accounts.accountsPayableMinor,
        },
        purchaseOrders: {},
        deliveries: {},
        invoices: {},
        tickets: {
          "TCK-ERP-01": {
            id: "TCK-ERP-01",
            title: `Replenishment Order: ${primaryItem.name}`,
            customer: "Inventory Control Department",
            status: "open",
            priority: "normal",
            dueDay: 3,
            notes: [
              {
                atMinute: 0,
                text: `Automated reorder signal from ${payload.sourceSystem} ERP sync for item ${primaryItem.itemId}.`,
              },
            ],
            commitments: [],
          },
        },
        messages: [],
        workbooks: {
          "WB-ERP-01": {
            id: "WB-ERP-01",
            title: "ERP Sync Audit Sheet",
            sheets: [
              {
                name: "Opening Accounts",
                rows: 6,
                cols: 4,
                cells: {
                  A1: { value: "Account" },
                  B1: { value: "Balance Minor" },
                  A2: { value: "Cash" },
                  B2: { value: payload.accounts.cashMinor },
                  A3: { value: "Inventory" },
                  B3: { value: payload.accounts.inventoryMinor },
                },
              },
            ],
          },
        },
        workNotes: [],
      },
      scheduledEvents: [],
      requirements: {
        lines: [{ itemId: primaryItem.itemId, qty: 5 }],
        dueDay: 4,
        ticketId: "TCK-ERP-01",
      },
      requirementPredicates: [
        {
          id: "P_ERP_RESTOCK",
          description: "Required items ordered from imported vendor catalog",
          kind: "order_placed",
          params: {
            lines: [{ itemId: primaryItem.itemId, qty: 5, comparison: "gte" }],
          },
        },
      ],
      requiredUpdates: [
        {
          id: "U_ERP_TICKET",
          description: "Ticket updated to in_progress or higher",
          kind: "ticket_status_min",
          params: { ticketId: "TCK-ERP-01", minStatus: "in_progress" },
        },
        {
          id: "U_ERP_SUBMIT",
          description: "Final submission present",
          kind: "submission_present",
          params: {},
        },
      ],
      publicChecklist: [
        "Acknowledge imported ERP reorder signal",
        "Authorize PO with imported supplier",
        "Verify ledger balance integrity",
        "Submit final sandbox report",
      ],
    };

    return scenario;
  }
}
