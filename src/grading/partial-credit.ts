/**
 * Non-Binary Partial Credit Scoring Framework (Pillar 5, Item 046).
 * Computes proportional credit for quantitative tolerances, time delays, and partial recovery.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface PartialCreditRule {
  id: string;
  name: string;
  maxPoints: number;
  evaluator: () => { achieved: number; max: number; note: string };
}

export interface PartialScoreBreakdown {
  ruleId: string;
  maxPoints: number;
  awardedPoints: number;
  percentage: number;
  note: string;
}

/**
 * Calculates proportional quantity credit.
 */
export function scoreQuantityProportion(required: number, delivered: number, maxPoints: number): {
  awarded: number;
  note: string;
} {
  if (required <= 0) return { awarded: maxPoints, note: "No requirement" };
  const ratio = Math.min(1.0, Math.max(0, delivered / required));
  const awarded = Math.round(ratio * maxPoints);
  return {
    awarded,
    note: `Fulfilled ${delivered}/${required} (${Math.round(ratio * 100)}%)`,
  };
}

/**
 * Calculates time-decay penalty for late delivery or ticket updates.
 */
export function scoreWithTimeDecay(
  targetDay: number,
  actualDay: number,
  maxPoints: number,
  decayPerDay = 0.2 // 20% penalty per delayed day
): { awarded: number; note: string } {
  if (actualDay <= targetDay) {
    return { awarded: maxPoints, note: `On-time delivery on day ${actualDay}` };
  }
  const daysLate = actualDay - targetDay;
  const decayFactor = Math.max(0, 1 - daysLate * decayPerDay);
  const awarded = Math.round(maxPoints * decayFactor);
  return {
    awarded,
    note: `Delivered ${daysLate} day(s) late on day ${actualDay} (decay factor ${decayFactor.toFixed(2)})`,
  };
}

/**
 * Evaluates a set of partial credit rules into a composite score.
 */
export function evaluatePartialCreditSet(rules: PartialCreditRule[]): {
  totalMax: number;
  totalAwarded: number;
  overallPercentage: number;
  breakdown: PartialScoreBreakdown[];
} {
  let totalMax = 0;
  let totalAwarded = 0;
  const breakdown: PartialScoreBreakdown[] = [];

  for (const r of rules) {
    const res = r.evaluator();
    const ratio = res.max > 0 ? res.achieved / res.max : 0;
    const awarded = Math.round(ratio * r.maxPoints);

    totalMax += r.maxPoints;
    totalAwarded += awarded;

    breakdown.push({
      ruleId: r.id,
      maxPoints: r.maxPoints,
      awardedPoints: awarded,
      percentage: Math.round(ratio * 100),
      note: res.note,
    });
  }

  const overallPercentage = totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0;
  return { totalMax, totalAwarded, overallPercentage, breakdown };
}
