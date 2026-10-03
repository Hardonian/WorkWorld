/**
 * Multi-Location Warehouse and Bin Management Engine (Pillar 2, Item 015).
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface BinCoordinate {
  aisle: string; // e.g. "A"
  rack: number; // e.g. 1..20
  shelf: number; // e.g. 1..5
  bin: string; // e.g. "01"
}

export function formatBin(coord: BinCoordinate): string {
  return `${coord.aisle}-${String(coord.rack).padStart(2, "0")}-${coord.shelf}-${coord.bin}`;
}

export interface WarehouseLocation {
  id: string; // e.g. "WH-MAIN", "WH-PORT", "WH-CLINIC"
  name: string;
  type: "distribution_center" | "satellite_depot" | "cross_dock" | "point_of_care";
  capacityUnits: number;
  bins: Record<string, { itemId: string | null; maxCapacity: number; currentQty: number }>;
}

export interface InventoryAllocation {
  warehouseId: string;
  binCode: string;
  itemId: string;
  quantity: number;
}

export interface StockTransferOrder {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  itemId: string;
  quantity: number;
  status: "draft" | "in_transit" | "completed" | "cancelled";
  requestedDay: number;
  dispatchedDay?: number;
  deliveredDay?: number;
}

/**
 * Validates whether a bin can accommodate the incoming inventory quantity.
 */
export function checkBinCapacity(
  location: WarehouseLocation,
  binCode: string,
  itemId: string,
  addQuantity: number
): { ok: boolean; reason?: string } {
  const bin = location.bins[binCode];
  if (!bin) {
    return { ok: false, reason: `Bin ${binCode} does not exist in warehouse ${location.id}` };
  }
  if (bin.itemId !== null && bin.itemId !== itemId && bin.currentQty > 0) {
    return {
      ok: false,
      reason: `Bin ${binCode} already contains item ${bin.itemId}, cannot co-locate ${itemId}`,
    };
  }
  if (bin.currentQty + addQuantity > bin.maxCapacity) {
    return {
      ok: false,
      reason: `Capacity exceeded: bin ${binCode} has ${bin.maxCapacity - bin.currentQty} space remaining, requested ${addQuantity}`,
    };
  }
  return { ok: true };
}

/**
 * Creates a stock transfer between warehouses.
 */
export function createStockTransfer(
  fromWarehouse: WarehouseLocation,
  toWarehouse: WarehouseLocation,
  itemId: string,
  quantity: number,
  currentDay: number
): { transfer?: StockTransferOrder; error?: string } {
  if (fromWarehouse.id === toWarehouse.id) {
    return { error: "Source and destination warehouses must be different." };
  }
  if (quantity <= 0) {
    return { error: "Transfer quantity must be positive." };
  }

  // Calculate total stock in source warehouse
  const availableInSource = Object.values(fromWarehouse.bins)
    .filter((b) => b.itemId === itemId)
    .reduce((sum, b) => sum + b.currentQty, 0);

  if (availableInSource < quantity) {
    return {
      error: `Insufficient stock in ${fromWarehouse.id}: available ${availableInSource}, requested ${quantity}.`,
    };
  }

  // Calculate free capacity in target warehouse
  const totalOccupiedTarget = Object.values(toWarehouse.bins).reduce((sum, b) => sum + b.currentQty, 0);
  if (totalOccupiedTarget + quantity > toWarehouse.capacityUnits) {
    return {
      error: `Destination warehouse ${toWarehouse.id} capacity limit exceeded.`,
    };
  }

  const transfer: StockTransferOrder = {
    id: `XFR-${Date.now().toString(36).toUpperCase()}`,
    fromWarehouseId: fromWarehouse.id,
    toWarehouseId: toWarehouse.id,
    itemId,
    quantity,
    status: "in_transit",
    requestedDay: currentDay,
    dispatchedDay: currentDay,
  };

  return { transfer };
}

/**
 * Calculates stock balance distribution across all warehouse locations.
 */
export function summarizeWarehouseNetwork(warehouses: WarehouseLocation[]): {
  totalCapacity: number;
  totalOccupied: number;
  utilizationRate: number;
  stockByItem: Record<string, Record<string, number>>;
} {
  let totalCapacity = 0;
  let totalOccupied = 0;
  const stockByItem: Record<string, Record<string, number>> = {};

  for (const wh of warehouses) {
    totalCapacity += wh.capacityUnits;
    for (const bin of Object.values(wh.bins)) {
      totalOccupied += bin.currentQty;
      if (bin.itemId && bin.currentQty > 0) {
        if (!stockByItem[bin.itemId]) stockByItem[bin.itemId] = {};
        const itemMap = stockByItem[bin.itemId]!;
        itemMap[wh.id] = (itemMap[wh.id] ?? 0) + bin.currentQty;
      }
    }
  }

  const utilizationRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  return { totalCapacity, totalOccupied, utilizationRate, stockByItem };
}
