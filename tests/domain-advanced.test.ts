import { describe, it, expect } from "vitest";
import { convertCurrency, calculateRealizedFx } from "../src/domain/fx.ts";
import { performThreeWayMatch } from "../src/domain/matching.ts";
import { generateDebitMemo } from "../src/domain/disputes.ts";
import { evaluateInventoryHealth } from "../src/domain/inventory.ts";
import { calculateSupplierScorecard } from "../src/domain/supplier-scorecard.ts";
import { verifyDomainInvariants } from "../src/domain/invariants.ts";
import type { PurchaseOrder, Delivery, Invoice, Supplier, EpisodeState } from "../src/domain/types.ts";

describe("Advanced Domain Engine Tests", () => {
  describe("FX & Multi-Currency Engine", () => {
    it("converts between currencies using standard exchange rates", () => {
      // 100 USD at 1.36 CAD = 136 CAD
      const cadMinor = convertCurrency(10000, "USD", "CAD");
      expect(cadMinor).toBe(13600);

      // Same currency returns exact amount
      expect(convertCurrency(5000, "CAD", "CAD")).toBe(5000);
    });

    it("calculates realized FX gains and losses accurately", () => {
      // 1000 USD booked at 1.35 CAD ($1350 CAD), settled at 1.30 CAD ($1300 CAD) -> $50 CAD gain
      const gain = calculateRealizedFx(100000, 1.35, 1.3);
      expect(gain.isGain).toBe(true);
      expect(gain.realizedGainOrLossMinor).toBe(5000);

      // Booked at 1.35 CAD, settled at 1.40 CAD -> loss
      const loss = calculateRealizedFx(100000, 1.35, 1.4);
      expect(loss.isGain).toBe(false);
      expect(loss.realizedGainOrLossMinor).toBe(5000);
    });
  });

  describe("Automated 3-Way Matching Engine", () => {
    const mockPo: PurchaseOrder = {
      id: "PO-101",
      supplierId: "SUP-A",
      lines: [{ itemId: "item-1", qty: 20, unitPriceMinor: 1000 }],
      status: "authorized",
      note: "",
      createdAtMinute: 10,
      requestedDeliveryDay: 5,
      managerApproved: true,
      approvals: [],
      amendments: [],
      budgetCommittedMinor: 20000,
      authorizeAttempts: 1,
    };

    const mockDelivery: Delivery = {
      id: "DEL-101",
      poId: "PO-101",
      lines: [{ itemId: "item-1", qty: 20 }],
      status: "checked_in",
      arrivedAtMinute: 60,
      note: "",
      carrierNote: "",
    };

    const mockInvoice: Invoice = {
      id: "INV-101",
      invoiceNumber: "101",
      supplierId: "SUP-A",
      poId: "PO-101",
      deliveryId: "DEL-101",
      lines: [{ itemId: "item-1", qty: 20, unitPriceMinor: 1000 }],
      amountMinor: 20000,
      adjustedAmountMinor: null,
      currency: "CAD",
      status: "received",
      dueDay: 30,
      receivedAtMinute: 70,
      duplicateOfId: null,
      disputeReason: null,
      settlementTxnIds: [],
    };

    it("identifies a perfect 3-way match", () => {
      const match = performThreeWayMatch(mockPo, mockDelivery, mockInvoice);
      expect(match.status).toBe("perfect_match");
      expect(match.isPayableInFull).toBe(true);
      expect(match.varianceMinor).toBe(0);
    });

    it("detects quantity short-shipment variance and calculates short-pay", () => {
      const shortDelivery: Delivery = {
        ...mockDelivery,
        lines: [{ itemId: "item-1", qty: 15 }], // 5 units short
      };

      const match = performThreeWayMatch(mockPo, shortDelivery, mockInvoice);
      expect(match.status).toBe("quantity_discrepancy");
      expect(match.isPayableInFull).toBe(false);
      // 15 units * 1000 minor = 15000 minor recommended
      expect(match.recommendedAdjustedAmountMinor).toBe(15000);
      expect(match.varianceMinor).toBe(5000);

      // Generate debit memo
      const debitMemo = generateDebitMemo(match, "SUP-A", "Apex Industrial", 120);
      expect(debitMemo.reasonCode).toBe("SHORT_DELIVERY");
      expect(debitMemo.debitMemoAmountMinor).toBe(5000);
      expect(debitMemo.formalNoticeLetter).toContain("FORMAL NOTICE OF SHORT-PAYMENT");
    });
  });

  describe("Inventory Reordering & Safety Stock", () => {
    it("computes safety stock and flags critical stockout risk when inventory is depleted", () => {
      const status = evaluateInventoryHealth({
        itemId: "valve-01",
        name: "Standard Valve",
        onHandQty: 2,
        dailyDemandRate: 10,
        leadTimeDays: 3,
      });

      expect(status.isBelowReorderPoint).toBe(true);
      expect(status.stockoutRisk).toBe("CRITICAL");
      expect(status.recommendedReorderQty).toBeGreaterThan(0);
    });
  });

  describe("Supplier Scorecards", () => {
    it("computes high score and Grade A for an on-time compliant vendor", () => {
      const supplier: Supplier = {
        id: "SUP-A",
        name: "Acme Fasteners",
        leadTimeDays: 2,
        paymentTermsDays: 30,
        catalog: [{ itemId: "screw-1", unitPriceMinor: 50 }],
      };

      const pos: PurchaseOrder[] = [
        {
          id: "PO-1",
          supplierId: "SUP-A",
          lines: [{ itemId: "screw-1", qty: 100, unitPriceMinor: 50 }],
          status: "received",
          note: "",
          createdAtMinute: 0,
          requestedDeliveryDay: 3,
          managerApproved: true,
          approvals: [],
          amendments: [],
          budgetCommittedMinor: 5000,
          authorizeAttempts: 1,
        },
      ];

      const deliveries: Delivery[] = [
        {
          id: "DEL-1",
          poId: "PO-1",
          lines: [{ itemId: "screw-1", qty: 100 }],
          status: "checked_in",
          arrivedAtMinute: 480 * 2, // Day 2 (within Day 3)
          note: "",
          carrierNote: "",
        },
      ];

      const invoices: Invoice[] = [
        {
          id: "INV-1",
          invoiceNumber: "INV-1",
          supplierId: "SUP-A",
          poId: "PO-1",
          deliveryId: "DEL-1",
          lines: [{ itemId: "screw-1", qty: 100, unitPriceMinor: 50 }],
          amountMinor: 5000,
          adjustedAmountMinor: null,
          currency: "CAD",
          status: "paid",
          dueDay: 30,
          receivedAtMinute: 1000,
          duplicateOfId: null,
          disputeReason: null,
          settlementTxnIds: ["TXN-1"],
        },
      ];

      const card = calculateSupplierScorecard(supplier, pos, deliveries, invoices);
      expect(card.letterGrade).toBe("A");
      expect(card.riskLevel).toBe("LOW");
      expect(card.compositeScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe("Domain Invariant Verifier", () => {
    it("passes verification on a valid state snapshot", () => {
      const state: EpisodeState = {
        runId: "run-01",
        scenarioId: "A1",
        scenarioVersion: "1.0.0",
        seed: 42,
        condition: "human",
        clockMinute: 100,
        status: "active",
        revision: 5,
        policy: {
          approvalThresholdMinor: 40000,
          budgetMinor: 250000,
          currency: "CAD",
          helpPolicy: { maxHelpRequests: 3, fatalBeyond: false },
        },
        items: {},
        suppliers: {},
        purchaseOrders: {},
        deliveries: {},
        invoices: {},
        ledger: {
          opening: {
            cash: 4000000,
            accounts_receivable: 0,
            inventory: 1000000,
            accounts_payable: 1000000,
          },
          txns: [],
        },
        tickets: {},
        messages: [],
        workbooks: {},
        workNotes: [],
        helpRequests: [],
        budget: { committedMinor: 0 },
        requirements: [],
        requirementDueDay: 5,
        pendingEvents: [],
        actionLog: [],
        submission: null,
      };

      const report = verifyDomainInvariants(state);
      expect(report.passed).toBe(true);
      expect(report.violations.length).toBe(0);
    });

    it("flags negative inventory invariant violation if inventory is negative", () => {
      const state: EpisodeState = {
        runId: "run-01",
        scenarioId: "A1",
        scenarioVersion: "1.0.0",
        seed: 42,
        condition: "human",
        clockMinute: 100,
        status: "active",
        revision: 5,
        policy: {
          approvalThresholdMinor: 40000,
          budgetMinor: 250000,
          currency: "CAD",
          helpPolicy: { maxHelpRequests: 3, fatalBeyond: false },
        },
        items: {},
        suppliers: {},
        purchaseOrders: {},
        deliveries: {},
        invoices: {},
        ledger: {
          opening: {
            cash: 4000000,
            accounts_receivable: 0,
            inventory: -50000, // Invalid negative inventory!
            accounts_payable: 1000000,
          },
          txns: [],
        },
        tickets: {},
        messages: [],
        workbooks: {},
        workNotes: [],
        helpRequests: [],
        budget: { committedMinor: 0 },
        requirements: [],
        requirementDueDay: 5,
        pendingEvents: [],
        actionLog: [],
        submission: null,
      };

      const report = verifyDomainInvariants(state);
      expect(report.passed).toBe(false);
      expect(report.violations.some((v) => v.code === "NEGATIVE_INVENTORY_BALANCE")).toBe(true);
    });
  });
});
