/**
 * Assessor workflow storage: attributable, auditable rubric judgments.
 * Revisions are appended (never mutated in place) — mirrors the DB design.
 * A grader never impersonates a human reviewer: model suggestions are stored
 * in a separate `suggestions` field labeled uncalibrated.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { RubricRecord, RubricRating } from "../grading/report.ts";

export interface AssessmentDocument {
  runId: string;
  revisions: RubricRecord[];
}

const DIR = process.env.WORKWORLD_ASSESSMENT_DIR ?? "./var/assessments";

function pathFor(runId: string): string {
  if (!/^[0-9a-f-]{36}$/.test(runId)) throw new Error("invalid run id");
  return join(DIR, `${runId}.json`);
}

export function loadAssessment(runId: string): AssessmentDocument {
  const path = pathFor(runId);
  if (!existsSync(path)) return { runId, revisions: [] };
  return JSON.parse(readFileSync(path, "utf8")) as AssessmentDocument;
}

export function appendRevision(
  runId: string,
  record: Omit<RubricRecord, "ratedAt" | "revisions"> & { revisionNote?: string },
): AssessmentDocument {
  // comment lives on the record itself (overall judgment)
  mkdirSync(DIR, { recursive: true });
  const doc = loadAssessment(runId);
  const previous = doc.revisions.at(-1);
  const revision: RubricRecord = {
    assessor: record.assessor,
    ratedAt: new Date().toISOString(),
    ratings: record.ratings,
    comment: record.comment,
    ...(record.suggestions ? { suggestions: record.suggestions } : {}),
    revisions: [
      ...(previous
        ? previous.revisions ?? []
        : []),
      {
        at: new Date().toISOString(),
        by: record.assessor,
        change: record.revisionNote ?? (previous ? `revision ${doc.revisions.length + 1}` : "initial judgment"),
      },
    ],
  };
  doc.revisions.push(revision);
  writeFileSync(pathFor(runId), JSON.stringify(doc, null, 2));
  return doc;
}

export function listAssessedRuns(): string[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

/** Portable report: assessment + identity + links to deterministic evidence. */
export function portableReport(
  runId: string,
  evidence: {
    scenarioId: string;
    scenarioVersion: string;
    deterministicOutcome: string;
    checks: { id: string; passed: boolean; detail: string }[];
  },
): Record<string, unknown> {
  const doc = loadAssessment(runId);
  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    runId,
    scenario: { id: evidence.scenarioId, version: evidence.scenarioVersion },
    deterministic: {
      outcome: evidence.deterministicOutcome,
      checks: evidence.checks,
      note: "Deterministic checks verify narrow tested properties only; they are not verified skill.",
    },
    humanRubric: {
      latest: doc.revisions.at(-1) ?? null,
      revisionCount: doc.revisions.length,
      note: "Human judgments are attributable and editable only through appended revisions.",
    },
  };
}

export function validateRatings(ratings: unknown): RubricRating[] {
  if (!Array.isArray(ratings) || ratings.length !== 5) {
    throw new Error("ratings must cover exactly C1..C5");
  }
  const criteria = ["C1", "C2", "C3", "C4", "C5"];
  return ratings.map((r, i) => {
    const raw = r as { criterion?: string; rating?: number; comment?: string };
    if (raw.criterion !== criteria[i]) throw new Error(`expected criterion ${criteria[i]}`);
    const rating = Number(raw.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error(`rating for ${criteria[i]} must be 1..5`);
    }
    return {
      criterion: criteria[i] as RubricRating["criterion"],
      rating: rating as RubricRating["rating"],
      comment: String(raw.comment ?? "").slice(0, 2000),
    };
  });
}
