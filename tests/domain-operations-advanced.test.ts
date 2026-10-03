import { describe, it, expect } from "vitest";
import { checkBinCapacity, createStockTransfer, summarizeWarehouseNetwork, type WarehouseLocation } from "../src/domain/warehouse.ts";
import { amortizePrepaidContracts, calculatePrepaidAssetBalance, type PrepaidContract } from "../src/domain/accruals.ts";
import { createRmaRequest, issueRmaCreditMemo } from "../src/domain/rma.ts";
import { calculateFreightQuotes, findBestFreightOption } from "../src/domain/logistics.ts";

describe("Warehouse & Bin Management (Item 015)", () => {
  const whMain: WarehouseLocation = {
    id: "WH-MAIN",
    name: "Central Distribution Center",
    type: "distribution_center",
    capacityUnits: 1000,
    bins: {
      "A-01-1": { itemId: "GLV-100", maxCapacity: 100, currentQty: 60 },
      "A-01-2": { itemId: null, maxCapacity: 100, currentQty: 0 },
    },
  };

  const whClinic: WarehouseLocation = {
    id: "WH-CLINIC",
    name: "On-site Clinic Depot",
    type: "point_of_care",
    capacityUnits: 200,
    bins: {
      "C-01-1": { itemId: "GLV-100", maxCapacity: 50, currentQty: 10 },
    },
  };

  it("checks bin capacity and prevents mixed SKU placement in active bin", () => {
    const valid = checkBinCapacity(whMain, "A-01-1", "GLV-100", 30);
    expect(valid.ok).toBe(true);

    const overflow = checkBinCapacity(whMain, "A-01-1", "GLV-100", 50);
    expect(overflow.ok).toBe(false);
    expect(overflow.reason).toContain("Capacity exceeded");

    const mismatch = checkBinCapacity(whMain, "A-01-1", "SAF-220", 10);
    expect(mismatch.ok).toBe(false);
    expect(mismatch.reason).toContain("cannot co-locate");
  });

  it("creates stock transfer between distinct warehouse locations", () => {
    const res = createStockTransfer(whMain, whClinic, "GLV-100", 20, 3);
    expect(res.error).toBeUndefined();
    expect(res.transfer?.fromWarehouseId).toBe("WH-MAIN");
    expect(res.transfer?.toWarehouseId).toBe("WH-CLINIC");
    expect(res.transfer?.quantity).toBe(20);
    expect(res.transfer?.status).toBe("in_transit");
  });

  it("summarizes multi-warehouse network capacity and stock", () => {
    const summary = summarizeWarehouseNetwork([whMain, whClinic]);
    expect(summary.totalCapacity).toBe(1200);
    expect(summary.totalOccupied).toBe(70);
    expect(summary.stockByItem["GLV-100"]?.["WH-MAIN"]).toBe(60);
    expect(summary.stockByItem["GLV-100"]?.["WH-CLINIC"]).toBe(10);
  });
});

describe("Accruals & Recurring Amortization (Item 017)", () => {
  const contract: PrepaidContract = {
    id: "PRE-INS-01",
    description: "Annual Warehouse Liability Insurance",
    totalCostMinor: 120000, // $1,200.00
    startDateDay: 0,
    durationDays: 120, // 120 days
    expenseAccount: "insurance_expense",
    accumulatedAmortizationMinor: 0,
  };

  it("amortizes straight-line daily expense and produces adjusting entries", () => {
    const { updatedContracts, adjustingEntries, totalAmortizedMinor } = amortizePrepaidContracts([contract], 30);
    expect(adjustingEntries).toHaveLength(1);
    expect(adjustingEntries[0]!.debitAccount).toBe("insurance_expense");
    expect(adjustingEntries[0]!.creditAccount).toBe("prepaid_expenses");
    expect(adjustingEntries[0]!.amountMinor).toBe(30000); // 30/120 * 120,000 = 30,000 ($300.00)
    expect(totalAmortizedMinor).toBe(30000);
    expect(updatedContracts[0]!.accumulatedAmortizationMinor).toBe(30000);
  });

  it("calculates remaining unamortized asset balance", () => {
    const { netPrepaidAssetMinor } = calculatePrepaidAssetBalance([
      { ...contract, accumulatedAmortizationMinor: 40000 },
    ]);
    expect(netPrepaidAssetMinor).toBe(80000); // $800.00 remaining asset
  });
});

describe("Return Merchandise Authorization & Restocking (Item 018)", () => {
  it("creates RMA for non-defective return with standard restocking fee", () => {
    const rma = createRmaRequest({
      purchaseOrderId: "PO-1001",
      itemId: "SAF-220",
      quantity: 10,
      reason: "excess_inventory",
      unitPriceMinor: 2500, // $25.00
      currentDay: 5,
    });
    expect(rma.restockingFeePct).toBe(15);
    expect(rma.status).toBe("authorized");

    const { creditMemo } = issueRmaCreditMemo(rma, "VEN-KETTLE", 6);
    expect(creditMemo.grossAmountMinor).toBe(25000); // $250.00
    expect(creditMemo.restockingFeeMinor).toBe(3750); // $37.50 (15%)
    expect(creditMemo.netCreditMinor).toBe(21250); // $212.50
  });

  it("waives restocking fee on defective vendor items", () => {
    const rma = createRmaRequest({
      purchaseOrderId: "PO-1002",
      itemId: "GLV-100",
      quantity: 5,
      reason: "defective",
      unitPriceMinor: 1500,
      currentDay: 2,
    });
    expect(rma.restockingFeePct).toBe(0);
    const { creditMemo } = issueRmaCreditMemo(rma, "VEN-APEX", 3);
    expect(creditMemo.restockingFeeMinor).toBe(0);
    expect(creditMemo.netCreditMinor).toBe(7500);
  });
});

describe("Emergency Logistics & Freight Engine (Item 019)", () => {
  it("calculates quotes across tiers and identifies best eligible freight", () => {
    const quotes = calculateFreightQuotes({
      originPostal: "M5V2T6",
      destinationPostal: "K1P1J1",
      weightKg: 50,
      requiredDeliveryDay: 7,
      currentDay: 5, // 2 days allowed
    });

    expect(quotes.length).toBe(4);
    const best = findBestFreightOption(quotes, 2);
    expect(best).not.toBeNull();
    expect(best?.tier).toBe("priority_2day");
    expect(best?.leadTimeDays).toBeLessThanOrEqual(2);
  });
});
