/**
 * Emergency Logistics and Expedited Freight Engine (Pillar 2, Item 019).
 * Pure domain logic: zero React/Next.js dependencies.
 */

export type FreightTier = "standard_ground" | "priority_2day" | "overnight_express" | "hotshot_dedicated";

export interface FreightQuote {
  tier: FreightTier;
  carrierName: string;
  leadTimeDays: number;
  baseCostMinor: number;
  fuelSurchargeMinor: number;
  emergencyExpediteSurchargeMinor: number;
  totalCostMinor: number;
}

export interface FreightRequest {
  originPostal: string;
  destinationPostal: string;
  weightKg: number;
  isHazardous?: boolean;
  requiredDeliveryDay: number;
  currentDay: number;
}

const TIER_CONFIG: Record<
  FreightTier,
  {
    leadDays: number;
    basePerKgMinor: number;
    fixedDispatchMinor: number;
    expediteMultiplier: number;
  }
> = {
  standard_ground: { leadDays: 5, basePerKgMinor: 150, fixedDispatchMinor: 2500, expediteMultiplier: 1.0 },
  priority_2day: { leadDays: 2, basePerKgMinor: 450, fixedDispatchMinor: 6000, expediteMultiplier: 1.25 },
  overnight_express: { leadDays: 1, basePerKgMinor: 950, fixedDispatchMinor: 12000, expediteMultiplier: 1.6 },
  hotshot_dedicated: { leadDays: 0, basePerKgMinor: 2200, fixedDispatchMinor: 35000, expediteMultiplier: 2.2 },
};

/**
 * Calculates freight quotes across shipping tiers for emergency or standard replenishment.
 */
export function calculateFreightQuotes(
  req: FreightRequest,
  fuelSurchargeRatePct = 12 // e.g. 12% national average diesel index
): FreightQuote[] {
  const daysAllowed = Math.max(0, req.requiredDeliveryDay - req.currentDay);

  return (Object.keys(TIER_CONFIG) as FreightTier[]).map((tier) => {
    const config = TIER_CONFIG[tier];
    const rawBase = config.fixedDispatchMinor + Math.round(req.weightKg * config.basePerKgMinor);
    const hazardousSurcharge = req.isHazardous ? 5000 : 0;
    const baseWithHaz = rawBase + hazardousSurcharge;

    const fuelSurchargeMinor = Math.round((baseWithHaz * fuelSurchargeRatePct) / 100);

    // If required lead time is tighter than tier's standard lead, apply emergency surcharge
    const isEmergency = config.leadDays <= 1 || config.leadDays <= daysAllowed;
    const emergencyExpediteSurchargeMinor =
      config.expediteMultiplier > 1
        ? Math.round(baseWithHaz * (config.expediteMultiplier - 1))
        : 0;

    const totalCostMinor = baseWithHaz + fuelSurchargeMinor + emergencyExpediteSurchargeMinor;

    return {
      tier,
      carrierName:
        tier === "hotshot_dedicated"
          ? "Northline Hotshot Express"
          : tier === "overnight_express"
          ? "AirCargo Priority"
          : "Regional Freightways",
      leadTimeDays: config.leadDays,
      baseCostMinor: baseWithHaz,
      fuelSurchargeMinor,
      emergencyExpediteSurchargeMinor,
      totalCostMinor,
    };
  });
}

/**
 * Selects the optimal freight option that meets the deadline with lowest cost.
 */
export function findBestFreightOption(
  quotes: FreightQuote[],
  maxLeadTimeDays: number
): FreightQuote | null {
  const eligible = quotes
    .filter((q) => q.leadTimeDays <= maxLeadTimeDays)
    .sort((a, b) => a.totalCostMinor - b.totalCostMinor);

  return eligible[0] ?? null;
}
