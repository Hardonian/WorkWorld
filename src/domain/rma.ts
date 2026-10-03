/**
 * Return Merchandise Authorization (RMA) and Restocking Fee Engine (Pillar 2, Item 018).
 * Pure domain logic: zero React/Next.js dependencies.
 */

export type RmaReason = "defective" | "incorrect_item" | "excess_inventory" | "customer_cancellation";
export type RmaDisposition = "return_to_vendor" | "scrap" | "re_bin_inventory" | "awaiting_inspection";

export interface RmaRequest {
  id: string; // e.g. "RMA-2026-001"
  purchaseOrderId: string;
  itemId: string;
  quantity: number;
  reason: RmaReason;
  unitPriceMinor: number;
  restockingFeePct: number; // e.g. 15 for 15%
  status: "requested" | "authorized" | "goods_received" | "inspected" | "credit_issued" | "closed";
  disposition: RmaDisposition;
  createdAtDay: number;
  resolvedAtDay?: number;
}

export interface CreditMemo {
  id: string; // e.g. "CM-RMA-001"
  rmaId: string;
  vendorId: string;
  grossAmountMinor: number;
  restockingFeeMinor: number;
  netCreditMinor: number;
  dayIssued: number;
}

/**
 * Creates an authorized RMA request and calculates restocking fee and expected credit.
 */
export function createRmaRequest(params: {
  purchaseOrderId: string;
  itemId: string;
  quantity: number;
  reason: RmaReason;
  unitPriceMinor: number;
  restockingFeePct?: number; // default 15% for non-defective returns, 0% for defectives
  currentDay: number;
}): RmaRequest {
  const isVendorFault = params.reason === "defective" || params.reason === "incorrect_item";
  const effectiveRestockingPct = isVendorFault ? 0 : (params.restockingFeePct ?? 15);

  return {
    id: `RMA-${Date.now().toString(36).toUpperCase()}`,
    purchaseOrderId: params.purchaseOrderId,
    itemId: params.itemId,
    quantity: params.quantity,
    reason: params.reason,
    unitPriceMinor: params.unitPriceMinor,
    restockingFeePct: effectiveRestockingPct,
    status: "authorized",
    disposition: isVendorFault ? "return_to_vendor" : "awaiting_inspection",
    createdAtDay: params.currentDay,
  };
}

/**
 * Issues a credit memo upon receipt and verification of returned goods.
 */
export function issueRmaCreditMemo(
  rma: RmaRequest,
  vendorId: string,
  currentDay: number
): { creditMemo: CreditMemo; updatedRma: RmaRequest } {
  const grossAmountMinor = rma.quantity * rma.unitPriceMinor;
  const restockingFeeMinor = Math.round((grossAmountMinor * rma.restockingFeePct) / 100);
  const netCreditMinor = grossAmountMinor - restockingFeeMinor;

  const creditMemo: CreditMemo = {
    id: `CM-${rma.id}`,
    rmaId: rma.id,
    vendorId,
    grossAmountMinor,
    restockingFeeMinor,
    netCreditMinor,
    dayIssued: currentDay,
  };

  const updatedRma: RmaRequest = {
    ...rma,
    status: "credit_issued",
    resolvedAtDay: currentDay,
  };

  return { creditMemo, updatedRma };
}
