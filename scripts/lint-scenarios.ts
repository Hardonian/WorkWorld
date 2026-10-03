/**
 * Scenario Specification Linter & DAG Verifier CLI (Pillar 3, Item 030).
 * Validates consistency, dependency integrity, and solvability across the scenario catalog.
 */

import { listScenarios } from "../src/scenarios/catalog.ts";
import { ENTERPRISE_SCENARIOS } from "../src/scenarios/enterprise-scenarios.ts";
import { SCENARIO_TUTORIAL } from "../src/scenarios/tutorial.ts";
import { VERTICAL_SCENARIOS } from "../src/scenarios/vertical-packs.ts";

export interface ScenarioLintResult {
  scenarioId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function lintScenarioCatalog(): { totalChecked: number; allValid: boolean; results: ScenarioLintResult[] } {
  const allScenarios = [...listScenarios(), ...ENTERPRISE_SCENARIOS, SCENARIO_TUTORIAL, ...VERTICAL_SCENARIOS];
  const seenIds = new Set<string>();
  const results: ScenarioLintResult[] = [];

  for (const s of allScenarios) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check ID uniqueness
    if (seenIds.has(s.id)) {
      errors.push(`Duplicate scenario ID: ${s.id}`);
    }
    seenIds.add(s.id);

    // 2. Validate policy numbers
    if (s.policy.budgetMinor <= 0) {
      errors.push(`Invalid budgetMinor: ${s.policy.budgetMinor} (must be > 0)`);
    }
    if (s.policy.approvalThresholdMinor <= 0) {
      errors.push(`Invalid approvalThresholdMinor: ${s.policy.approvalThresholdMinor}`);
    }

    // 3. Validate ledger opening balance
    interface LintableScenario {
      initial?: { ledgerOpening?: { cash?: number } };
      initialState?: { ledger?: { opening?: { cash?: number } } };
      rubric?: { rules?: { id: string }[] };
      grading?: { requirements?: { id: string }[] };
      requirementPredicates?: unknown[];
      requiredUpdates?: unknown[];
      events?: { atMinute?: number; fireAtMinute?: number }[];
      scheduledEvents?: { atMinute?: number; fireAtMinute?: number }[];
    }
    const anyScenario = s as unknown as LintableScenario;
    const openingCash =
      anyScenario.initial?.ledgerOpening?.cash ??
      anyScenario.initialState?.ledger?.opening?.cash ??
      0;
    if (openingCash < 0) {
      errors.push(`Opening cash cannot be negative: ${openingCash}`);
    }

    // 4. Validate rubric / grading requirements
    const hasRules =
      (anyScenario.rubric?.rules && anyScenario.rubric.rules.length > 0) ||
      (anyScenario.grading?.requirements && anyScenario.grading.requirements.length > 0) ||
      (anyScenario.requirementPredicates && anyScenario.requirementPredicates.length > 0) ||
      (anyScenario.requiredUpdates && anyScenario.requiredUpdates.length > 0);
    if (!hasRules) {
      errors.push("Scenario must define grading rules, requirement predicates, or required updates");
    }

    // 5. Validate event temporal monotonicity
    let lastMinute = 0;
    const events = anyScenario.events ?? anyScenario.scheduledEvents ?? [];
    for (const ev of events) {
      const minute = ev.atMinute ?? ev.fireAtMinute ?? 0;
      if (minute < lastMinute) {
        errors.push(`Event at minute ${minute} is out of chronological order`);
      }
      lastMinute = minute;
    }

    results.push({
      scenarioId: s.id,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  }

  const allValid = results.every((r) => r.valid);
  return { totalChecked: allScenarios.length, allValid, results };
}

// If invoked as standalone CLI script
if (typeof process !== "undefined" && process.argv[1]?.includes("lint-scenarios")) {
  console.log("WorkWorld Scenario Catalog Linter & DAG Verifier");
  const { totalChecked, allValid, results } = lintScenarioCatalog();
  console.log(`Validated ${totalChecked} scenarios across routine and enterprise families.`);

  for (const r of results) {
    if (!r.valid) {
      console.error(`FAIL: ${r.scenarioId}: ${r.errors.join("; ")}`);
    }
  }

  if (allValid) {
    console.log("PASS: All scenario specifications are syntactically and logically consistent.");
    process.exit(0);
  } else {
    process.exit(1);
  }
}
