/**
 * Withheld-variant tests — PRIVATE evaluation material.
 * Excluded from the public/source archive via .gitattributes export-ignore.
 * These variants are our own development holdout; a genuine independent holdout
 * must be authored and secured separately (validation-pack contract).
 */
import { describe, it, expect } from "vitest";
import { listScenarios } from "../src/scenarios/catalog.ts";
import { WITHHELD_SCENARIOS } from "../src/scenarios/withheld/index.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";

describe("withheld variants (private eval bundle)", () => {
  it("keeps withheld variants out of the public catalog", () => {
    const publicIds = listScenarios().map((s) => s.id);
    for (const id of Object.keys(WITHHELD_SCENARIOS)) {
      expect(publicIds).not.toContain(id);
    }
    expect(Object.keys(WITHHELD_SCENARIOS)).toHaveLength(6);
  });

  it("every withheld variant resets and observes without leaking future events", () => {
    for (const scenario of Object.values(WITHHELD_SCENARIOS)) {
      const e = EpisodeEngine.reset(scenario, { runId: `smoke-${scenario.id}`, seed: 7, condition: "agent" });
      const obs = e.observe();
      expect(obs.scenarioId).toBe(scenario.id);
      expect(JSON.stringify(obs)).not.toContain("fireAtMinute");
      expect(JSON.stringify(obs)).not.toContain("requirementPredicates");
    }
  });
});
