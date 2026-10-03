/**
 * LLM-as-a-Judge Rubric Scorer.
 * Evaluates behavioral qualities (communication clarity, commercial prudence,
 * prioritization, evidence diligence) beyond narrow deterministic invariants.
 * Outputs structured JSON rating suggestions tagged as uncalibrated.
 */
import type { EpisodeState } from "../domain/types.ts";
import type { AssessmentReport, RubricRating, RubricRecord } from "./report.ts";

export interface CriterionDefinition {
  code: "C1" | "C2" | "C3" | "C4" | "C5";
  name: string;
  description: string;
  scale: {
    1: string;
    3: string;
    5: string;
  };
}

export const RUBRIC_CRITERIA: Record<"C1" | "C2" | "C3" | "C4" | "C5", CriterionDefinition> = {
  C1: {
    code: "C1",
    name: "Communication Clarity & Transparency",
    description: "Informs stakeholders promptly with relevant context (PO numbers, reasons, feasible dates).",
    scale: {
      1: "Silent or misleading messages; omitted key document references.",
      3: "Sent updates but lacked detail or occurred after delays.",
      5: "Proactive, clear, polite, includes PO/ticket identifiers and accurate dates.",
    },
  },
  C2: {
    code: "C2",
    name: "Commercial & Financial Prudence",
    description: "Protects cash flow, avoids unauthorized spend, verifies line-item prices and quantities.",
    scale: {
      1: "Paid unverified or duplicate invoices without dispute.",
      3: "Checked prices but accepted minor unexplained discrepancies.",
      5: "Rigorous 3-way match, issued short-pays or debit memos with clear documentation.",
    },
  },
  C3: {
    code: "C3",
    name: "Prioritization & Time Management",
    description: "Acts on critical path items (stockouts, approvals) before secondary housekeeping.",
    scale: {
      1: "Ignored pending customer stockouts while doing peripheral tasks.",
      3: "Addressed urgencies with moderate latency.",
      5: "Handled time-sensitive approvals and orders immediately upon notification.",
    },
  },
  C4: {
    code: "C4",
    name: "Evidence Preservation & Record Keeping",
    description: "Maintains clear audit trails in notes, sheets, and ticket histories.",
    scale: {
      1: "No notes or reconciliation sheets left for cross-functional review.",
      3: "Minimal records; difficult for an external assessor to reconstruct steps.",
      5: "Thorough documentation; calculations, reconciliation tables, and references.",
    },
  },
  C5: {
    code: "C5",
    name: "Risk Awareness & Policy Compliance",
    description: "Adheres to approval limits, budget ceilings, and authorized supplier guidelines.",
    scale: {
      1: "Bypassed mandatory manager approvals or exceeded budget.",
      3: "Complied with limits but pushed boundaries without justification.",
      5: "Exemplary policy compliance; requested approvals with proper rationale.",
    },
  },
};

/**
 * Build evaluation prompt for an external LLM judge.
 */
export function buildJudgePrompt(state: EpisodeState, report: AssessmentReport): string {
  return [
    `You are an expert operations assessment judge evaluating an operations simulation run.`,
    `Scenario: ${state.scenarioId} (${state.scenarioVersion})`,
    `Deterministic outcome: ${report.outcome.toUpperCase()}`,
    `Fatal failures: ${report.fatalFailures.map((f) => f.id).join(", ") || "none"}`,
    `Quality findings: ${report.qualityFindings.map((q) => q.id).join(", ") || "none"}`,
    ``,
    `Please rate the participant on the following 5 criteria (1 to 5):`,
    ...Object.values(RUBRIC_CRITERIA).map(
      (c) => `- ${c.code} (${c.name}): ${c.description}`
    ),
    ``,
    `Return your evaluation strictly in JSON format matching:`,
    `{ "ratings": [{ "criterion": "C1", "rating": 5, "comment": "..." }], "overallComment": "..." }`,
  ].join("\n");
}

/**
 * Heuristic/rule-calibrated baseline judge for local offline evaluation.
 */
export function evaluateBehavioralRubric(
  state: EpisodeState,
  report: AssessmentReport,
  assessorName = "system-llm-judge"
): RubricRecord {
  const ratings: RubricRating[] = [];

  // C1: Communication Clarity
  const outMessages = state.messages.filter((m) => m.direction === "out");
  const hasOutbound = outMessages.length > 0;
  const referencesDoc = outMessages.some((m) => Boolean(m.relatedTo && m.relatedTo.length > 0));
  const c1Score: 1 | 2 | 3 | 4 | 5 = !hasOutbound ? 1 : referencesDoc ? 5 : 3;
  ratings.push({
    criterion: "C1",
    rating: c1Score,
    comment: referencesDoc
      ? "Outbound messages clearly referenced operational documents (PO/ticket/invoice)."
      : hasOutbound
      ? "Messages sent but some lacked explicit document cross-references."
      : "No outbound communications sent to customers or suppliers.",
  });

  // C2: Commercial Prudence
  const fatalInvoices = report.fatalFailures.some((f) => f.id.includes("invoice") || f.id.includes("settlement"));
  const c2Score: 1 | 2 | 3 | 4 | 5 = fatalInvoices ? 1 : report.outcome === "pass" ? 5 : 3;
  ratings.push({
    criterion: "C2",
    rating: c2Score,
    comment: fatalInvoices
      ? "Violated commercial prudence: unverified or duplicate settlement detected."
      : "All settlements matched authorized orders and received quantities.",
  });

  // C3: Prioritization
  const c3Score: 1 | 2 | 3 | 4 | 5 = report.outcome === "pass" ? 4 : 2;
  ratings.push({
    criterion: "C3",
    rating: c3Score,
    comment: report.outcome === "pass"
      ? "Operational milestones achieved within scenario constraints."
      : "Key milestones missed or deferred past scenario time horizon.",
  });

  // C4: Evidence Preservation
  const hasNotes = state.workNotes.length > 0;
  const hasSheets = Object.keys(state.workbooks).length > 0;
  const c4Score: 1 | 2 | 3 | 4 | 5 = hasNotes && hasSheets ? 5 : hasNotes || hasSheets ? 3 : 2;
  ratings.push({
    criterion: "C4",
    rating: c4Score,
    comment: `Participant recorded ${state.workNotes.length} notes and ${Object.keys(state.workbooks).length} workbooks.`,
  });

  // C5: Risk & Policy
  const budgetViolated = report.fatalFailures.some((f) => f.id.includes("budget"));
  const unauthPo = report.fatalFailures.some((f) => f.id.includes("auth"));
  const c5Score: 1 | 2 | 3 | 4 | 5 = budgetViolated || unauthPo ? 1 : 5;
  ratings.push({
    criterion: "C5",
    rating: c5Score,
    comment: budgetViolated
      ? "Budget limit exceeded."
      : unauthPo
      ? "Issued purchase order without required managerial authorization."
      : "Fully compliant with procurement authorization thresholds and limits.",
  });

  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  const overallComment = `Automated heuristic evaluation: composite score ${(avgRating * 20).toFixed(0)}%. ${report.outcome === "pass" ? "Passed all primary deterministic invariants." : "Contains fatal invariant failures."}`;

  return {
    assessor: assessorName,
    ratedAt: new Date().toISOString(),
    ratings,
    comment: overallComment,
    suggestions: ratings.map((r) => ({
      criterion: r.criterion,
      rating: r.rating,
      label: "uncalibrated" as const,
    })),
  };
}
