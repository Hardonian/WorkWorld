import { describe, it, expect } from "vitest";
import { ENTERPRISE_SCENARIOS, SCENARIO_D1, SCENARIO_F1 } from "../src/scenarios/enterprise-scenarios.ts";
import { generateStochasticScenario } from "../src/scenarios/generator.ts";
import { StorylineEngine } from "../src/scenarios/storylines.ts";
import { applyDifficultyPreset } from "../src/scenarios/difficulty.ts";
import { SCENARIO_TUTORIAL, TUTORIAL_CHECKPOINTS } from "../src/scenarios/tutorial.ts";
import { lintScenarioCatalog } from "../scripts/lint-scenarios.ts";

describe("Enterprise Scenario Families (Pillar 3, Items 021-025)", () => {
  it("defines all enterprise scenario families D, E, F, G, H", () => {
    expect(ENTERPRISE_SCENARIOS).toHaveLength(5);
    const families = ENTERPRISE_SCENARIOS.map((s) => s.family);
    expect(families).toContain("D");
    expect(families).toContain("E");
    expect(families).toContain("F");
    expect(families).toContain("G");
    expect(families).toContain("H");
  });

  it("includes fraud red flags and dual-authorization constraints in F1", () => {
    const msg = SCENARIO_F1.initialState.inbox?.[0] as { from?: string } | undefined;
    expect(msg?.from).toContain("apex-dlst.com");
    expect(SCENARIO_F1.rubric?.rules?.[0]?.id).toBe("R_F1_PAYMENT_FROZEN");
  });
});

describe("Dynamic Stochastic Generator (Item 026)", () => {
  it("deterministically perturbs prices and inventory given seed", () => {
    const perturbedA = generateStochasticScenario(SCENARIO_D1, { seed: 42, priceVolatilityPct: 15 });
    const perturbedB = generateStochasticScenario(SCENARIO_D1, { seed: 42, priceVolatilityPct: 15 });
    const perturbedC = generateStochasticScenario(SCENARIO_D1, { seed: 99, priceVolatilityPct: 15 });

    // Same seed produces exact same perturbation
    expect(perturbedA.supplierCatalog["VEN-KETTLE"]?.items["GLV-100"]?.unitPriceMinor).toBe(
      perturbedB.supplierCatalog["VEN-KETTLE"]?.items["GLV-100"]?.unitPriceMinor
    );

    // Different seed produces different price
    expect(perturbedA.supplierCatalog["VEN-KETTLE"]?.items["GLV-100"]?.unitPriceMinor).not.toBe(
      perturbedC.supplierCatalog["VEN-KETTLE"]?.items["GLV-100"]?.unitPriceMinor
    );
  });
});

describe("Multi-Branch Dynamic Storylines (Item 027)", () => {
  it("transitions between storyline branches upon meeting predicates", () => {
    const engine = new StorylineEngine(
      {
        id: "TREE-1",
        scenarioId: "D1",
        nodes: [
          {
            id: "START",
            narrative: "Initial port strike news",
            triggerCondition: {
              predicate: (state) => Boolean(state.orderPlacedWithSecondary),
            },
            outcomes: {
              nextBranchId: "SECONDARY_ACTIVATED",
              supplierRelationshipChange: 15,
              incomingMessage: {
                sender: "kettle@domestic.local",
                subject: "Order confirmed",
                body: "Shipment leaving warehouse tomorrow.",
              },
            },
          },
          {
            id: "SECONDARY_ACTIVATED",
            narrative: "Order in transit",
            triggerCondition: {
              predicate: () => false,
            },
            outcomes: { supplierRelationshipChange: 0 },
          },
        ],
      },
      "START"
    );

    const check1 = engine.evaluateTransition({ orderPlacedWithSecondary: false });
    expect(check1.transitioned).toBe(false);

    const check2 = engine.evaluateTransition({ orderPlacedWithSecondary: true });
    expect(check2.transitioned).toBe(true);
    expect(check2.newNodeId).toBe("SECONDARY_ACTIVATED");
    expect(check2.outcomes?.supplierRelationshipChange).toBe(15);
  });
});

describe("Apprenticeship Tutorial & Difficulty Modes (Items 028-029)", () => {
  it("provides 5 sequential tutorial checkpoints", () => {
    expect(TUTORIAL_CHECKPOINTS).toHaveLength(5);
    expect(SCENARIO_TUTORIAL.difficulty).toBe("beginner");
  });

  it("scales budget, approval limits, and tolerance across difficulty presets", () => {
    const apprentice = applyDifficultyPreset(SCENARIO_D1, "apprentice");
    const master = applyDifficultyPreset(SCENARIO_D1, "master");

    expect(apprentice.policy.budgetMinor).toBeGreaterThan(SCENARIO_D1.policy.budgetMinor);
    expect(master.policy.budgetMinor).toBeLessThan(SCENARIO_D1.policy.budgetMinor);
    expect(master.policy.helpPolicy.maxHelpRequests).toBe(0);
  });
});

describe("Scenario Catalog Linter CLI (Item 030)", () => {
  it("validates catalog consistency without errors", () => {
    const { allValid, totalChecked } = lintScenarioCatalog();
    expect(allValid).toBe(true);
    expect(totalChecked).toBeGreaterThanOrEqual(12);
  });
});
