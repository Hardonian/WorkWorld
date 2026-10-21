import { describe, expect, it } from "vitest";
import { modelWorkflowRoi } from "../src/index/roi.ts";
import { prepareCertificationPreflight } from "../src/server/certification-preflight.ts";

describe("WorkWorld Index ROI and preflight foundations", () => {
  it("models economics transparently and rejects invalid inputs", () => {
    const result = modelWorkflowRoi({ monthlyWorkflowVolume: 100, minutesPerWorkflow: 30, loadedHourlyRateUsd: 60, agentCompletionRatePct: 80, humanInterventionRatePct: 25, minutesPerIntervention: 10, agentCostPerRunUsd: 0.2, preventableFailureRatePct: 2, costPerPreventedFailureUsd: 100, platformMonthlyCostUsd: 500 });
    expect(result.modeledMonthlyNetBenefitUsd).toBeGreaterThan(0);
    expect(result.modeledAnnualNetBenefitUsd).toBe(result.modeledMonthlyNetBenefitUsd * 12);
    expect(() => modelWorkflowRoi({ monthlyWorkflowVolume: -1 } as never)).toThrow(/monthlyWorkflowVolume/);
  });

  it("produces a credential-free, bounded private certification preflight", () => {
    const preflight = prepareCertificationPreflight({ agentName: "FinanceOps", adapter: "openai-compatible", maxBudgetUsd: 25, contact: "ops@example.com" });
    expect(preflight.credentialPolicy).toBe("not-collected");
    expect(preflight.suites).toEqual(["purchasing", "reconciliation", "customer-recovery"]);
    expect(preflight.configurationDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(() => prepareCertificationPreflight({ agentName: "x", adapter: "bad", maxBudgetUsd: -1 })).toThrow();
  });
});
