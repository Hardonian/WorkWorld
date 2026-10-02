import { describe, it, expect } from "vitest";
import { listScenarios, getScenario } from "../src/scenarios/catalog.ts";
import { WITHHELD_SCENARIOS } from "../src/scenarios/withheld/index.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { gradeEpisode } from "../src/grading/report.ts";
import { runBaseline } from "../src/grading/baseline.ts";
import { runNegativeControls } from "../src/grading/negative-controls.ts";

describe("scenario catalog", () => {
  it("defines exactly six initial episodes, two per family", () => {
    const all = listScenarios();
    expect(all.map((s) => s.id).sort()).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    const families = all.map((s) => s.family);
    expect(families.filter((f) => f === "purchase_delivery")).toHaveLength(2);
    expect(families.filter((f) => f === "invoice_reconciliation")).toHaveLength(2);
    expect(families.filter((f) => f === "customer_recovery")).toHaveLength(2);
  });

  it("keeps withheld variants out of the public catalog", () => {
    const publicIds = listScenarios().map((s) => s.id);
    for (const id of Object.keys(WITHHELD_SCENARIOS)) {
      expect(publicIds).not.toContain(id);
    }
    expect(Object.keys(WITHHELD_SCENARIOS)).toHaveLength(6);
  });

  it("resets and observes every episode (including withheld) without leaking future events", () => {
    for (const scenario of [...listScenarios(), ...Object.values(WITHHELD_SCENARIOS)]) {
      const e = EpisodeEngine.reset(scenario, { runId: `smoke-${scenario.id}`, seed: 7, condition: "agent" });
      const obs = e.observe();
      expect(obs.scenarioId).toBe(scenario.id);
      expect(obs.status).toBe("active");
      // Observations expose no scheduled-event payloads (hidden future info).
      expect(JSON.stringify(obs)).not.toContain("fireAtMinute");
    }
  });
});

describe("competent scripted baseline (fixture actor)", () => {
  for (const id of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    it(`baseline passes every T1 check on ${id}`, () => {
      const engine = runBaseline(id);
      const report = gradeEpisode(engine.getState(), getScenario(id));
      const failing = report.checks.filter((c) => !c.passed).map((c) => c.id);
      expect(failing, `baseline ${id} failed: ${failing.join(", ")}`).toEqual([]);
      expect(report.outcome).toBe("pass");
    });
  }
});

describe("negative controls fail for the right reasons", () => {
  const results = runNegativeControls();

  it("has all six controls present", () => {
    expect(results.map((r) => r.id).sort()).toEqual(["N1", "N2", "N3", "N4", "N5", "N6"]);
  });

  for (const r of runNegativeControls()) {
    it(`${r.id} (${r.title}) fails exactly ${r.expectedFailing.join("+")}`, () => {
      expect(r.report.outcome, `${r.id} unexpectedly passed`).toBe("fail");
      expect(r.actualFailing.sort()).toEqual([...r.expectedFailing].sort());
    });
  }

  it("never lets a polished report flip a fatal failure", () => {
    const n1 = results.find((r) => r.id === "N1")!;
    expect(n1.report.fatalFailures.map((c) => c.id)).toContain("requirements_met");
  });
});

describe("grading contract", () => {
  it("keeps claim limits in every report", () => {
    const engine = runBaseline("A1");
    const report = gradeEpisode(engine.getState(), getScenario("A1"));
    expect(report.claimLimits).toMatch(/Not a proof/);
    expect(report.counts.t1Total).toBeGreaterThanOrEqual(9);
  });

  it("treats help policy as T1 only where the episode marks it fatal", () => {
    const b2 = getScenario("B2");
    expect(b2.policy.helpPolicy.fatalBeyond).toBe(true);
    const a1 = getScenario("A1");
    expect(a1.policy.helpPolicy.fatalBeyond).toBe(false);
  });
});
