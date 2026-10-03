import { describe, it, expect } from "vitest";
import { createBlindedPackage } from "../src/grading/double-blind.ts";
import { computeActionLevenshtein, evaluatePathEfficiency } from "../src/grading/path-distance.ts";
import { scoreQuantityProportion, scoreWithTimeDecay, evaluatePartialCreditSet } from "../src/grading/partial-credit.ts";
import { evaluateAssessorCalibration } from "../src/grading/calibration.ts";
import { generateSkillDiagnostics } from "../src/grading/diagnostics.ts";
import { generateEvaluationManifest, verifyEvaluationManifest } from "../src/grading/manifest.ts";
import type { Observation } from "../src/domain/observation.ts";

describe("Double-Blind Anonymizer (Item 043)", () => {
  it("redacts candidate name from notes and generates blind token", () => {
    const mockObs: Observation = {
      runId: "run-101",
      scenarioId: "A1",
      scenarioVersion: "1.0",
      episodeTitle: "Week-14 restock",
      day: 0,
      clockMinute: 0,
      status: "active",
      brief: { role: "Coordinator", company: "Northline", situation: "test", objectives: [], guidance: [] },
      policy: { currency: "CAD", budgetMinor: 250000, approvalThresholdMinor: 40000, helpPolicy: { maxHelpRequests: 3, fatalBeyond: false } },
      budget: { limitMinor: 250000, committedMinor: 0, remainingMinor: 250000 },
      condition: "human",
      items: {},
      suppliers: {},
      purchaseOrders: {},
      deliveries: {},
      invoices: {},
      ledger: { opening: { cash: 0, accounts_receivable: 0, inventory: 0, accounts_payable: 0 }, txns: [] },
      tickets: {},
      workbooks: {},
      workNotes: [{ atMinute: 10, text: "Candidate John Doe completed analysis" }],
      inbox: [],
      recentActions: [],
      requirements: [],
      requirementDueDay: 5,
      submission: null,
      publicChecklist: [],
      helpRequests: [],
      revision: 1,
    };

    const pkg = createBlindedPackage("John Doe", "run-101", mockObs);
    expect(pkg.blindCandidateToken).toContain("BLIND-");
    expect(pkg.scrubbedObservation.workNotes[0]!.text).toContain("[REDACTED_CANDIDATE]");
    expect(pkg.scrubbedObservation.workNotes[0]!.text).not.toContain("John Doe");
  });
});

describe("Path Distance & Efficiency (Item 044)", () => {
  it("computes Levenshtein distance and efficiency ratio", () => {
    const optimal = ["draft_po", "submit_po", "authorize_po", "check_in"];
    const actual = ["draft_po", "submit_po", "request_help", "authorize_po", "check_in"];

    const dist = computeActionLevenshtein(optimal, actual);
    expect(dist).toBe(1); // 1 insertion

    const eff = evaluatePathEfficiency(optimal, actual);
    expect(eff.redundantActionCount).toBe(1);
    expect(eff.efficiencyRatio).toBeLessThan(1.0);
    expect(eff.efficiencyRatio).toBeGreaterThan(0.7);
  });
});

describe("Partial Credit Framework (Item 046)", () => {
  it("awards proportional score for partial fulfillment and applies time decay", () => {
    const qtyScore = scoreQuantityProportion(10, 8, 50);
    expect(qtyScore.awarded).toBe(40); // 80% of 50

    const timeScore = scoreWithTimeDecay(5, 6, 50, 0.2);
    expect(timeScore.awarded).toBe(40); // 1 day late = -20%

    const setRes = evaluatePartialCreditSet([
      { id: "R1", name: "Quantity", maxPoints: 50, evaluator: () => ({ achieved: 8, max: 10, note: "8/10" }) },
      { id: "R2", name: "Timing", maxPoints: 50, evaluator: () => ({ achieved: 50, max: 50, note: "On time" }) },
    ]);
    expect(setRes.totalMax).toBe(100);
    expect(setRes.totalAwarded).toBe(90);
    expect(setRes.overallPercentage).toBe(90);
  });
});

describe("Assessor Calibration (Item 047)", () => {
  it("evaluates assessor ratings against gold standard", () => {
    const gold = {
      scenarioId: "A1",
      expectedScores: { R1: 40, R2: 30, R3: 30 },
      acceptableTolerance: 5,
    };

    const goodAssessor = {
      assessorId: "ASSESSOR-1",
      scenarioId: "A1",
      ratings: { R1: 40, R2: 28, R3: 32 },
    };

    const res = evaluateAssessorCalibration(goodAssessor, gold);
    expect(res.passedCalibration).toBe(true);
    expect(res.meanAbsoluteError).toBeLessThanOrEqual(5.0);
  });
});

describe("Skill Diagnostics (Item 048)", () => {
  it("diagnoses procurement policy violation when manager approval is missing", () => {
    const diagnostics = generateSkillDiagnostics([
      { id: "R_APPROVAL", tier: "T1", detail: "Order authorized without required manager approval" },
    ]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.category).toBe("procurement_policy");
    expect(diagnostics[0]!.severity).toBe("critical");
    expect(diagnostics[0]!.recommendedExercise).toContain("Policy P1");
  });
});

describe("Verifiable Manifests (Item 050)", () => {
  it("generates and cryptographically verifies HMAC-SHA256 evaluation manifests", () => {
    const secret = "top-secret-signing-key-2026";
    const manifest = generateEvaluationManifest({
      runId: "RUN-999",
      candidateId: "CAND-001",
      scenarioId: "A1",
      outcome: "pass",
      scores: {
        stateCorrectness: 100,
        economicEfficiency: 95,
        operationalVelocity: 90,
        professionalPolish: 85,
        compositeScore: 92,
      },
      statePayload: { finalCash: 12500, inventoryCount: 22 },
      signingSecret: secret,
    });

    expect(manifest.signature).toBeDefined();
    expect(verifyEvaluationManifest(manifest, secret)).toBe(true);
    expect(verifyEvaluationManifest(manifest, "wrong-secret")).toBe(false);
  });
});
