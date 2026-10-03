/**
 * WorkWorld Supplier SLA & Performance Scorecard.
 * Pure TypeScript — no React imports.
 */

import type { Supplier, PurchaseOrder, Delivery, Invoice, SupplierId } from "./types.ts";

export interface SupplierScorecard {
  supplierId: SupplierId;
  supplierName: string;
  totalOrdersIssued: number;
  totalDeliveriesCompleted: number;
  totalInvoicesProcessed: number;
  onTimeDeliveryRate: number; // 0.0 - 1.0 (100%)
  fulfillmentAccuracyRate: number; // 0.0 - 1.0 (quantity matched)
  priceComplianceRate: number; // 0.0 - 1.0 (invoiced price matched PO)
  compositeScore: number; // 0 - 100
  letterGrade: "A" | "B" | "C" | "D" | "F";
  riskLevel: "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
  notes: string[];
}

/**
 * Calculates quantitative performance metrics for a supplier.
 */
export function calculateSupplierScorecard(
  supplier: Supplier,
  pos: PurchaseOrder[],
  deliveries: Delivery[],
  invoices: Invoice[]
): SupplierScorecard {
  const supplierPos = pos.filter((p) => p.supplierId === supplier.id);
  const supplierInvoices = invoices.filter((i) => i.supplierId === supplier.id);

  // Link deliveries
  const poIds = new Set(supplierPos.map((p) => p.id));
  const supplierDeliveries = deliveries.filter((d) => poIds.has(d.poId));

  const totalOrdersIssued = supplierPos.length;
  const totalDeliveries = supplierDeliveries.length;
  const totalInvoices = supplierInvoices.length;

  let onTimeDeliveries = 0;
  let accurateDeliveries = 0;

  for (const del of supplierDeliveries) {
    const matchingPo = supplierPos.find((p) => p.id === del.poId);
    if (!matchingPo) continue;

    // Estimated delivery day based on arrival minute
    const arrivedDay = Math.floor(del.arrivedAtMinute / (8 * 60)) + 1;
    if (arrivedDay <= matchingPo.requestedDeliveryDay) {
      onTimeDeliveries++;
    }

    // Check line qty accuracy
    const poLineMap = new Map(matchingPo.lines.map((l) => [l.itemId, l.qty]));
    let lineAccurate = true;
    for (const delLine of del.lines) {
      const expected = poLineMap.get(delLine.itemId) ?? 0;
      if (delLine.qty < expected || delLine.substituteFor) {
        lineAccurate = false;
        break;
      }
    }
    if (lineAccurate) accurateDeliveries++;
  }

  // Price compliance
  let priceCompliantInvoices = 0;
  for (const inv of supplierInvoices) {
    if (inv.status !== "disputed" && !inv.disputeReason) {
      priceCompliantInvoices++;
    }
  }

  const onTimeDeliveryRate = totalDeliveries > 0 ? onTimeDeliveries / totalDeliveries : 1.0;
  const fulfillmentAccuracyRate = totalDeliveries > 0 ? accurateDeliveries / totalDeliveries : 1.0;
  const priceComplianceRate = totalInvoices > 0 ? priceCompliantInvoices / totalInvoices : 1.0;

  // Composite: 40% on-time, 35% fulfillment accuracy, 25% price compliance
  const compositeScore = Math.round(
    onTimeDeliveryRate * 40 + fulfillmentAccuracyRate * 35 + priceComplianceRate * 25
  );

  let letterGrade: SupplierScorecard["letterGrade"] = "A";
  let riskLevel: SupplierScorecard["riskLevel"] = "LOW";

  if (compositeScore >= 90) {
    letterGrade = "A";
    riskLevel = "LOW";
  } else if (compositeScore >= 80) {
    letterGrade = "B";
    riskLevel = "MODERATE";
  } else if (compositeScore >= 70) {
    letterGrade = "C";
    riskLevel = "ELEVATED";
  } else if (compositeScore >= 60) {
    letterGrade = "D";
    riskLevel = "HIGH";
  } else {
    letterGrade = "F";
    riskLevel = "HIGH";
  }

  const notes: string[] = [];
  if (onTimeDeliveryRate < 0.8) {
    notes.push(`Frequent delivery delays observed (${Math.round((1 - onTimeDeliveryRate) * 100)}% late).`);
  }
  if (fulfillmentAccuracyRate < 0.8) {
    notes.push(`Short-shipments or unauthorized substitutions detected on ${totalDeliveries - accurateDeliveries} shipments.`);
  }
  if (priceComplianceRate < 0.9) {
    notes.push(`Unapproved price hikes or billing variances flagged on ${totalInvoices - priceCompliantInvoices} invoices.`);
  }

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    totalOrdersIssued,
    totalDeliveriesCompleted: totalDeliveries,
    totalInvoicesProcessed: totalInvoices,
    onTimeDeliveryRate,
    fulfillmentAccuracyRate,
    priceComplianceRate,
    compositeScore,
    letterGrade,
    riskLevel,
    notes,
  };
}
