/**
 * WorkWorld Inventory Reordering & Stock Level Monitor.
 * Pure TypeScript — no React imports.
 */

import type { ItemId } from "./types.ts";

export interface InventoryItemStatus {
  itemId: ItemId;
  name: string;
  onHandQty: number;
  allocatedQty: number; // Reserved for outgoing customer orders
  onOrderQty: number; // Incoming on authorized purchase orders
  netAvailableQty: number; // onHand - allocated + onOrder
  dailyDemandRate: number; // units consumed per business day
  leadTimeDays: number;
  safetyStockQty: number;
  reorderPointQty: number;
  daysOfInventoryRemaining: number;
  isBelowReorderPoint: boolean;
  stockoutRisk: "CRITICAL" | "HIGH" | "MODERATE" | "HEALTHY";
  recommendedReorderQty: number;
}

export interface InventoryCalculationParams {
  itemId: ItemId;
  name: string;
  onHandQty: number;
  allocatedQty?: number;
  onOrderQty?: number;
  dailyDemandRate: number;
  leadTimeDays: number;
  holdingCostPerUnitYearMinor?: number;
  orderCostFixedMinor?: number;
  serviceLevelFactor?: number; // e.g. 1.65 for 95% service level
}

/**
 * Calculates safety stock, reorder point (ROP), and economic order quantity (EOQ).
 */
export function evaluateInventoryHealth(params: InventoryCalculationParams): InventoryItemStatus {
  const {
    itemId,
    name,
    onHandQty,
    allocatedQty = 0,
    onOrderQty = 0,
    dailyDemandRate,
    leadTimeDays,
    serviceLevelFactor = 1.65,
  } = params;

  const netAvailable = onHandQty - allocatedQty + onOrderQty;

  // Safety stock = Z * sqrt(LeadTime) * standard_deviation_demand
  // Operations heuristic: serviceLevelFactor * sqrt(leadTime) * (0.25 * dailyDemand)
  const demandStdDev = Math.max(1, dailyDemandRate * 0.25);
  const safetyStock = Math.ceil(serviceLevelFactor * Math.sqrt(Math.max(1, leadTimeDays)) * demandStdDev);

  // Reorder Point = (Lead Time Demand) + Safety Stock
  const leadTimeDemand = Math.ceil(dailyDemandRate * leadTimeDays);
  const reorderPoint = leadTimeDemand + safetyStock;

  const effectiveAvailable = onHandQty - allocatedQty;
  const daysRemaining = dailyDemandRate > 0 ? Math.floor(effectiveAvailable / dailyDemandRate) : 999;

  let stockoutRisk: InventoryItemStatus["stockoutRisk"] = "HEALTHY";
  if (daysRemaining <= 1 || effectiveAvailable <= 0) {
    stockoutRisk = "CRITICAL";
  } else if (daysRemaining <= leadTimeDays) {
    stockoutRisk = "HIGH";
  } else if (effectiveAvailable <= reorderPoint) {
    stockoutRisk = "MODERATE";
  }

  const isBelowReorderPoint = effectiveAvailable <= reorderPoint;

  // Recommended order qty: replenish up to (ROP + 2 weeks demand)
  const targetInventory = reorderPoint + Math.ceil(dailyDemandRate * 14);
  const recommendedReorderQty = Math.max(0, targetInventory - netAvailable);

  return {
    itemId,
    name,
    onHandQty,
    allocatedQty,
    onOrderQty,
    netAvailableQty: netAvailable,
    dailyDemandRate,
    leadTimeDays,
    safetyStockQty: safetyStock,
    reorderPointQty: reorderPoint,
    daysOfInventoryRemaining: daysRemaining,
    isBelowReorderPoint,
    stockoutRisk,
    recommendedReorderQty,
  };
}
