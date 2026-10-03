import { describe, it, expect } from "vitest";
import { generatePrintableReportHtml } from "../src/grading/export-report.ts";
import { CohortProctoringFeed } from "../src/server/cohort-stream.ts";
import { calculateRunEconomics } from "../src/grading/token-economics.ts";
import { exportEvaluationsCsv, exportEvaluationsJsonl, type EvaluationRecord } from "../src/server/data-lake.ts";

describe("Executive Report Generator (Item 076)", () => {
  it("generates structured HTML executive report", () => {
    const html = generatePrintableReportHtml({
      candidateId: "CAND-001",
      candidateName: "Alex Mercer",
      organizationName: "Riverside Health",
      episodeId: "EP-A1-101",
      scenarioTitle: "Week-14 restock",
      completionDate: "2026-10-02",
      outcome: "PASS",
      scores: {
        stateCorrectness: 100,
        economicEfficiency: 92,
        operationalVelocity: 88,
        professionalPolish: 95,
        compositeScore: 94,
      },
      passedChecks: ["Order placed", "Approved under budget", "Delivery checked in"],
      failedChecks: [],
    });

    expect(html).toContain("Alex Mercer");
    expect(html).toContain("94%");
    expect(html).toContain("Executive Evaluation Certificate");
  });
});

describe("Cohort Proctoring Feed (Item 077)", () => {
  it("tracks active learner heartbeats and summarizes progress", () => {
    const feed = new CohortProctoringFeed();
    feed.recordHeartbeat({
      learnerId: "L1",
      learnerName: "Learner One",
      episodeId: "EP-1",
      scenarioId: "A1",
      currentMinute: 45,
      lastAction: "draft_purchase_order",
      status: "on_track",
      budgetSpentMinor: 50000,
      helpRequestsUsed: 0,
      lastSeenIso: new Date().toISOString(),
    });

    const summary = feed.getCohortSummary();
    expect(summary.totalActive).toBe(1);
    expect(summary.submittedCount).toBe(0);
  });
});

describe("Token Economics (Item 078)", () => {
  it("calculates exact USD cost and cost per pass", () => {
    const ecoPass = calculateRunEconomics("gpt-4o", 100000, 20000, "pass");
    expect(ecoPass.totalCostUsd).toBe(0.45); // 0.1*2.5 + 0.02*10 = 0.25 + 0.20 = 0.45
    expect(ecoPass.costPerPassUsd).toBe(0.45);

    const ecoFail = calculateRunEconomics("gpt-4o", 100000, 20000, "fail");
    expect(ecoFail.costPerPassUsd).toBeNull();
  });
});

describe("Data Lake Export (Item 079)", () => {
  it("exports evaluations in CSV and JSONL format", () => {
    const records: EvaluationRecord[] = [
      {
        runId: "R1",
        candidateId: "C1",
        scenarioId: "A1",
        condition: "agent",
        outcome: "pass",
        compositeScore: 95,
        totalDurationMinutes: 120,
        actionCount: 6,
        policyViolations: 0,
        timestampIso: "2026-10-02T12:00:00Z",
      },
    ];

    const csv = exportEvaluationsCsv(records);
    expect(csv).toContain("run_id,candidate_id");
    expect(csv).toContain("R1,C1,A1,agent,pass");

    const jsonl = exportEvaluationsJsonl(records);
    expect(JSON.parse(jsonl).runId).toBe("R1");
  });
});
