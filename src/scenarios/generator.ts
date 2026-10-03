/**
 * Dynamic Stochastic Scenario Generator (Pillar 3, Item 026).
 * Injects deterministic pseudo-random perturbations (seeded PRNG) into scenario baselines.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Scenario, SupplierCatalog } from "../domain/types.ts";

export interface PerturbationOptions {
  seed: number;
  priceVolatilityPct?: number; // e.g. ±10%
  leadTimeVarianceDays?: number; // e.g. ±1-2 days
  unexpectedInboundCount?: number;
  initialStockDeviationPct?: number;
}

// Simple seedable Linear Congruential Generator (LCG) for reproducible randomness
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates a perturbed variant of a base scenario using a deterministic random seed.
 */
export function generateStochasticScenario(
  base: Scenario,
  options: PerturbationOptions
): Scenario {
  const rand = createPrng(options.seed);
  const pricePct = (options.priceVolatilityPct ?? 5) / 100;
  const leadVariance = options.leadTimeVarianceDays ?? 1;

  // Perturb supplier catalog
  const perturbedCatalog: SupplierCatalog = {};
  for (const [vendorId, vendor] of Object.entries(base.supplierCatalog)) {
    const perturbedItems: typeof vendor.items = {};
    for (const [itemId, item] of Object.entries(vendor.items)) {
      const deltaFactor = 1 + (rand() * 2 - 1) * pricePct;
      perturbedItems[itemId] = {
        ...item,
        unitPriceMinor: Math.round(item.unitPriceMinor * deltaFactor),
      };
    }

    const deltaLead = Math.round((rand() * 2 - 1) * leadVariance);
    perturbedCatalog[vendorId] = {
      ...vendor,
      leadDays: Math.max(1, vendor.leadDays + deltaLead),
      items: perturbedItems,
    };
  }

  // Perturb initial inventory
  const perturbedInventory: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(base.initialState.inventory)) {
    const stockPct = (options.initialStockDeviationPct ?? 10) / 100;
    const factor = 1 + (rand() * 2 - 1) * stockPct;
    perturbedInventory[itemId] = Math.max(0, Math.round(qty * factor));
  }

  return {
    ...base,
    id: `${base.id}-STOCH-${options.seed.toString(16).toUpperCase()}`,
    title: `${base.title} (Perturbed #${options.seed})`,
    supplierCatalog: perturbedCatalog,
    initialState: {
      ...base.initialState,
      inventory: perturbedInventory,
    },
  };
}
