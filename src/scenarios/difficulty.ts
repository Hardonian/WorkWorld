/**
 * Multi-Tier Difficulty Modes (Pillar 3, Item 029).
 * Presets modifying operational tolerances, budget constraints, and temporal pressure.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Scenario } from "../domain/types.ts";

export type DifficultyPreset = "apprentice" | "specialist" | "master";

export interface DifficultyModifiers {
  budgetMultiplier: number;
  approvalThresholdMultiplier: number;
  maxHelpRequests: number;
  allowPartialSettlement: boolean;
  varianceTolerancePct: number; // e.g. 5% in apprentice, 0% in master
}

export const DIFFICULTY_CONFIGS: Record<DifficultyPreset, DifficultyModifiers> = {
  apprentice: {
    budgetMultiplier: 1.25, // 25% extra budget cushion
    approvalThresholdMultiplier: 1.5,
    maxHelpRequests: 5,
    allowPartialSettlement: true,
    varianceTolerancePct: 5, // 5% price/qty tolerance
  },
  specialist: {
    budgetMultiplier: 1.0, // Standard baseline
    approvalThresholdMultiplier: 1.0,
    maxHelpRequests: 3,
    allowPartialSettlement: true,
    varianceTolerancePct: 2, // 2% tolerance
  },
  master: {
    budgetMultiplier: 0.9, // 10% tighter budget
    approvalThresholdMultiplier: 0.8, // lower approval limit, tighter control
    maxHelpRequests: 0, // No help allowed
    allowPartialSettlement: false,
    varianceTolerancePct: 0, // Zero tolerance for invoice variance
  },
};

/**
 * Applies difficulty configuration to a scenario.
 */
export function applyDifficultyPreset(
  scenario: Scenario,
  preset: DifficultyPreset
): Scenario {
  const config = DIFFICULTY_CONFIGS[preset];

  return {
    ...scenario,
    policy: {
      ...scenario.policy,
      budgetMinor: Math.round(scenario.policy.budgetMinor * config.budgetMultiplier),
      approvalThresholdMinor: Math.round(
        scenario.policy.approvalThresholdMinor * config.approvalThresholdMultiplier
      ),
      helpPolicy: {
        maxHelpRequests: config.maxHelpRequests,
        fatalBeyond: preset !== "apprentice",
      },
    },
    difficulty: preset === "apprentice" ? "beginner" : preset === "specialist" ? "intermediate" : "advanced",
  };
}
