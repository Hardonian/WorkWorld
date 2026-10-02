/**
 * Assessment report: deterministic T1/T2 checks + spaces for the separately
 * recorded human rubric. A FAIL banner can never be flipped by quality scores.
 */
import type { EpisodeState } from "../domain/types.ts";
import { ALL_CHECKS, type CheckResult } from "./checks.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";
import { digestState } from "../domain/engine.ts";

export interface RubricRating {
  criterion: "C1" | "C2" | "C3" | "C4" | "C5";
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
}

export interface RubricRecord {
  assessor: string;
  ratedAt: string;
  ratings: RubricRating[];
  /** model-based judge output — secondary, uncalibrated */
  suggestions?: { criterion: string; rating: number; label: "uncalibrated" }[];
  revisions?: { at: string; by: string; change: string }[];
}

export interface AssessmentReport {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  stateDigest: string;
  gradedAt: string;
  outcome: "pass" | "fail";
  checks: CheckResult[];
  fatalFailures: CheckResult[];
  qualityFindings: CheckResult[];
  counts: { t1Total: number; t1Passed: number; t2Total: number; t2Passed: number };
  claimLimits: string;
}

export function gradeEpisode(
  state: EpisodeState,
  scenario: ScenarioDefinition,
  nowIso = new Date().toISOString(),
): AssessmentReport {
  const checks = ALL_CHECKS.map((fn) => fn({ state, scenario }));
  const fatalFailures = checks.filter((c) => c.tier === "T1" && !c.passed);
  const qualityFindings = checks.filter((c) => c.tier === "T2" && !c.passed);
  const t1 = checks.filter((c) => c.tier === "T1");
  const t2 = checks.filter((c) => c.tier === "T2");

  return {
    runId: state.runId,
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    stateDigest: digestState(state),
    gradedAt: nowIso,
    outcome: fatalFailures.length === 0 ? "pass" : "fail",
    checks,
    fatalFailures,
    qualityFindings,
    counts: {
      t1Total: t1.length,
      t1Passed: t1.filter((c) => c.passed).length,
      t2Total: t2.length,
      t2Passed: t2.filter((c) => c.passed).length,
    },
    claimLimits:
      "Deterministic checks verify narrow tested properties only. Not a proof of " +
      "correctness, not verified skill, employability, accreditation or hiring suitability.",
  };
}
