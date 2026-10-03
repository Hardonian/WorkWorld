import { describe, it, expect } from "vitest";
import { ScenarioForge } from "../src/scenarios/forge.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { verifyDomainInvariants } from "../src/domain/invariants.ts";

describe("Instant Scenario Forge (Game Changer #1)", () => {
  it("compiles a natural language crisis prompt into an executable scenario", () => {
    const scenario = ScenarioForge.compile({
      companyName: "Metro General Health",
      crisisType: "supply_shortage",
      itemCategory: "medical",
      targetBudgetCad: 3000,
      urgencyLevel: "high",
      customInstructions: "Primary supplier inventory locked due to unexpected audit.",
    });

    expect(scenario.title).toContain("SUPPLY SHORTAGE");
    expect(scenario.policy.budgetMinor).toBe(300000);
    expect(scenario.suppliers).toHaveLength(2);
    expect(scenario.items).toHaveLength(3);
    expect(scenario.initial.tickets["TCK-FORGE-01"]).toBeDefined();

    // Verify scenario can be instantiated by EpisodeEngine
    const engine = EpisodeEngine.reset(scenario, { runId: "forge-run-1", seed: 123, condition: "agent" });
    const state = engine.getState();
    expect(state.policy.budgetMinor).toBe(300000);

    // Verify initial invariants are fully satisfied
    const inv = verifyDomainInvariants(state);
    expect(inv.passed).toBe(true);
  });

  it("adjusts urgency duration and parameters for critical crisis", () => {
    const scenario = ScenarioForge.compile({
      companyName: "Quantum Micro Labs",
      crisisType: "logistics_delay",
      itemCategory: "electronics",
      urgencyLevel: "critical",
    });

    expect(scenario.durationMinutes).toBe(30);
    expect(scenario.policy.helpPolicy.maxHelpRequests).toBe(1);
    expect(scenario.suppliers[1]?.name).toContain("Kettle Domestic");
  });
});
