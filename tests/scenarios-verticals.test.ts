import { describe, it, expect } from "vitest";
import {
  VERTICAL_SCENARIOS,
  SCENARIO_HEALTHCARE_1,
  SCENARIO_IT_MSP_1,
  SCENARIO_COLD_CHAIN_1,
} from "../src/scenarios/vertical-packs.ts";
import { lintScenarioCatalog } from "../scripts/lint-scenarios.ts";

describe("Vertical Scenario Packs (Tier 3 Expansion)", () => {
  it("provides 3 fully specified vertical industry scenarios", () => {
    expect(VERTICAL_SCENARIOS).toHaveLength(3);
    expect(SCENARIO_HEALTHCARE_1.id).toBe("MED1");
    expect(SCENARIO_IT_MSP_1.id).toBe("MSP1");
    expect(SCENARIO_COLD_CHAIN_1.id).toBe("LOG1");
  });

  it("verifies Healthcare Clinic operations parameters and rubric", () => {
    expect(SCENARIO_HEALTHCARE_1.policy.budgetMinor).toBe(350000);
    expect(SCENARIO_HEALTHCARE_1.supplierCatalog["VEN-PHARMACOLD"]).toBeDefined();
    expect(SCENARIO_HEALTHCARE_1.supplierCatalog["VEN-PHARMACOLD"]?.items["VAC-MMR"]).toBeDefined();
    expect(SCENARIO_HEALTHCARE_1.rubric?.rules).toHaveLength(4);
    expect(SCENARIO_HEALTHCARE_1.initialState.inventory["VAC-MMR"]).toBe(2);
  });

  it("verifies IT MSP SLA incident escalation parameters and catalog", () => {
    expect(SCENARIO_IT_MSP_1.policy.approvalThresholdMinor).toBe(50000);
    expect(SCENARIO_IT_MSP_1.supplierCatalog["VEN-CLOUDDOCS"]).toBeDefined();
    expect(SCENARIO_IT_MSP_1.supplierCatalog["VEN-CLOUDDOCS"]?.items["LIC-SEAT-EXP"]).toBeDefined();
    expect(SCENARIO_IT_MSP_1.rubric?.rules).toHaveLength(4);
  });

  it("verifies Cold-Chain Logistics Reefer Failure policy and telemetry alerts", () => {
    expect(SCENARIO_COLD_CHAIN_1.policy.budgetMinor).toBe(150000);
    expect(SCENARIO_COLD_CHAIN_1.supplierCatalog["VEN-POLARTRANS"]).toBeDefined();
    const firstMsg = SCENARIO_COLD_CHAIN_1.initialState.inbox?.[0] as { subject?: string } | undefined;
    expect(firstMsg?.subject).toContain("Temp Excursion");
    expect(SCENARIO_COLD_CHAIN_1.rubric?.rules).toHaveLength(4);
  });

  it("passes automated DAG and consistency linter across all scenarios including verticals", () => {
    const lint = lintScenarioCatalog();
    expect(lint.totalChecked).toBe(15);
    expect(lint.allValid).toBe(true);

    const medLint = lint.results.find((r) => r.scenarioId === "MED1");
    expect(medLint?.valid).toBe(true);

    const mspLint = lint.results.find((r) => r.scenarioId === "MSP1");
    expect(mspLint?.valid).toBe(true);

    const logLint = lint.results.find((r) => r.scenarioId === "LOG1");
    expect(logLint?.valid).toBe(true);
  });
});
