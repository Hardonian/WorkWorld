/**
 * Automated Data Lake Exporter (Pillar 8, Item 079).
 * Exports evaluation runs and trajectories in columnar CSV and JSONL formats for DuckDB / Pandas.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface EvaluationRecord {
  runId: string;
  candidateId: string;
  scenarioId: string;
  condition: "human" | "agent" | "assisted";
  outcome: "pass" | "fail";
  compositeScore: number;
  totalDurationMinutes: number;
  actionCount: number;
  policyViolations: number;
  timestampIso: string;
}

export function exportEvaluationsCsv(records: EvaluationRecord[]): string {
  const headers = [
    "run_id",
    "candidate_id",
    "scenario_id",
    "condition",
    "outcome",
    "composite_score",
    "duration_minutes",
    "action_count",
    "policy_violations",
    "timestamp",
  ];

  const rows = records.map((r) => [
    r.runId,
    r.candidateId,
    r.scenarioId,
    r.condition,
    r.outcome,
    r.compositeScore,
    r.totalDurationMinutes,
    r.actionCount,
    r.policyViolations,
    r.timestampIso,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportEvaluationsJsonl(records: EvaluationRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n");
}
