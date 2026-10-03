/**
 * WorkWorld 3-Way Matching Engine.
 * Reconciles Purchase Orders, Delivery Goods Receipts, and Vendor Invoices.
 * Pure TypeScript — no React imports.
 */

import type { PurchaseOrder, Delivery, Invoice, ItemId, Minor } from "./types.ts";

export type MatchStatus =
  | "perfect_match"
  | "price_discrepancy"
  | "quantity_discrepancy"
  | "unauthorized_po"
  | "missing_goods_receipt"
  | "multi_variance";

export interface LineMatchResult {
  itemId: ItemId;
  poQty: number;
  receivedQty: number;
  invoicedQty: number;
  poUnitPriceMinor: Minor;
  invoicedUnitPriceMinor: Minor;
  qtyDiscrepancy: number; // invoicedQty - receivedQty
  priceDiscrepancyMinor: Minor; // invoicedUnitPriceMinor - poUnitPriceMinor
  expectedTotalMinor: Minor; // receivedQty * poUnitPriceMinor
  invoicedTotalMinor: Minor; // invoicedQty * invoicedUnitPriceMinor
  status: "match" | "price_variance" | "quantity_variance" | "both_variance";
}

export interface ThreeWayMatchResult {
  status: MatchStatus;
  isPayableInFull: boolean;
  poId: string;
  deliveryId: string | null;
  invoiceId: string;
  lineResults: LineMatchResult[];
  poTotalMinor: Minor;
  receivedTotalMinor: Minor;
  invoicedTotalMinor: Minor;
  recommendedAdjustedAmountMinor: Minor; // Short-pay amount based on received goods at PO price
  varianceMinor: Minor; // invoicedTotal - receivedTotal
  discrepancyReasons: string[];
}

export interface MatchingToleranceOptions {
  priceToleranceMinor?: Minor; // allowable absolute minor variance (default 0)
  allowOverdelivery?: boolean; // default false
}

/**
 * Executes a deterministic 3-way match across PO, Delivery, and Vendor Invoice.
 */
export function performThreeWayMatch(
  po: PurchaseOrder,
  delivery: Delivery | null,
  invoice: Invoice,
  options: MatchingToleranceOptions = {}
): ThreeWayMatchResult {
  const { priceToleranceMinor = 0, allowOverdelivery = false } = options;
  const discrepancyReasons: string[] = [];

  if (po.status !== "authorized" && po.status !== "received" && po.status !== "partially_received") {
    discrepancyReasons.push(`Purchase Order ${po.id} is not in an authorized state (current: ${po.status})`);
  }

  if (!delivery) {
    discrepancyReasons.push(`No delivery goods receipt record linked to invoice ${invoice.id}`);
    return {
      status: "missing_goods_receipt",
      isPayableInFull: false,
      poId: po.id,
      deliveryId: null,
      invoiceId: invoice.id,
      lineResults: [],
      poTotalMinor: po.lines.reduce((acc, l) => acc + l.qty * l.unitPriceMinor, 0),
      receivedTotalMinor: 0,
      invoicedTotalMinor: invoice.amountMinor,
      recommendedAdjustedAmountMinor: 0,
      varianceMinor: invoice.amountMinor,
      discrepancyReasons,
    };
  }

  // Create lookups
  const poLinesMap = new Map(po.lines.map((l) => [l.itemId, l]));
  const deliveryLinesMap = new Map(delivery.lines.map((l) => [l.itemId, l]));

  const lineResults: LineMatchResult[] = [];
  let calculatedReceivedTotalMinor = 0;
  let hasPriceVariance = false;
  let hasQtyVariance = false;

  for (const invLine of invoice.lines) {
    const poLine = poLinesMap.get(invLine.itemId);
    const delLine = deliveryLinesMap.get(invLine.itemId);

    const poQty = poLine?.qty ?? 0;
    const poUnitPrice = poLine?.unitPriceMinor ?? 0;
    const receivedQty = delLine?.qty ?? 0;
    const invoicedQty = invLine.qty;
    const invoicedPrice = invLine.unitPriceMinor;

    const qtyDiff = invoicedQty - receivedQty;
    const priceDiff = invoicedPrice - poUnitPrice;

    const isPriceOk = Math.abs(priceDiff) <= priceToleranceMinor;
    const isQtyOk = allowOverdelivery ? invoicedQty <= receivedQty : invoicedQty === receivedQty;

    let lineStatus: LineMatchResult["status"] = "match";
    if (!isPriceOk && !isQtyOk) {
      lineStatus = "both_variance";
      hasPriceVariance = true;
      hasQtyVariance = true;
      discrepancyReasons.push(
        `Item ${invLine.itemId}: invoiced for ${invoicedQty} units at ${invoicedPrice / 100} CAD, but only ${receivedQty} received at authorized PO price ${poUnitPrice / 100} CAD`
      );
    } else if (!isPriceOk) {
      lineStatus = "price_variance";
      hasPriceVariance = true;
      discrepancyReasons.push(
        `Item ${invLine.itemId}: unit price mismatch (PO: ${poUnitPrice / 100} CAD vs Invoice: ${invoicedPrice / 100} CAD)`
      );
    } else if (!isQtyOk) {
      lineStatus = "quantity_variance";
      hasQtyVariance = true;
      discrepancyReasons.push(
        `Item ${invLine.itemId}: quantity mismatch (Received: ${receivedQty} vs Invoiced: ${invoicedQty})`
      );
    }

    const expectedTotal = receivedQty * poUnitPrice;
    calculatedReceivedTotalMinor += expectedTotal;

    lineResults.push({
      itemId: invLine.itemId,
      poQty,
      receivedQty,
      invoicedQty,
      poUnitPriceMinor: poUnitPrice,
      invoicedUnitPriceMinor: invoicedPrice,
      qtyDiscrepancy: qtyDiff,
      priceDiscrepancyMinor: priceDiff,
      expectedTotalMinor: expectedTotal,
      invoicedTotalMinor: invoicedQty * invoicedPrice,
      status: lineStatus,
    });
  }

  let overallStatus: MatchStatus = "perfect_match";
  if (discrepancyReasons.some((r) => r.includes("not in an authorized state"))) {
    overallStatus = "unauthorized_po";
  } else if (hasPriceVariance && hasQtyVariance) {
    overallStatus = "multi_variance";
  } else if (hasPriceVariance) {
    overallStatus = "price_discrepancy";
  } else if (hasQtyVariance) {
    overallStatus = "quantity_discrepancy";
  }

  const isPayableInFull = overallStatus === "perfect_match";
  const varianceMinor = invoice.amountMinor - calculatedReceivedTotalMinor;

  return {
    status: overallStatus,
    isPayableInFull,
    poId: po.id,
    deliveryId: delivery.id,
    invoiceId: invoice.id,
    lineResults,
    poTotalMinor: po.lines.reduce((acc, l) => acc + l.qty * l.unitPriceMinor, 0),
    receivedTotalMinor: calculatedReceivedTotalMinor,
    invoicedTotalMinor: invoice.amountMinor,
    recommendedAdjustedAmountMinor: calculatedReceivedTotalMinor,
    varianceMinor,
    discrepancyReasons,
  };
}
