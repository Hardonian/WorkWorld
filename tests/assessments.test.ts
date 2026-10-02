import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "ww-assess-"));
process.env.WORKWORLD_ASSESSMENT_DIR = dir;

const { appendRevision, loadAssessment, portableReport, validateRatings } = await import(
  "../src/server/assessments.ts"
);

describe("assessor workflow", () => {
  it("records attributable audited revisions (append-only)", () => {
    const ratings = validateRatings([
      { criterion: "C1", rating: 4, comment: "solid" },
      { criterion: "C2", rating: 3, comment: "" },
      { criterion: "C3", rating: 5, comment: "" },
      { criterion: "C4", rating: 4, comment: "" },
      { criterion: "C5", rating: 3, comment: "" },
    ]);
    const doc1 = appendRevision("11111111-1111-1111-1111-111111111111", {
      assessor: "assessor-a",
      ratings,
      comment: "initial",
    });
    expect(doc1.revisions).toHaveLength(1);
    expect(doc1.revisions[0]!.assessor).toBe("assessor-a");

    appendRevision("11111111-1111-1111-1111-111111111111", {
      assessor: "assessor-a",
      ratings,
      comment: "revised after second look",
      revisionNote: "rating C2 reconsidered",
    });
    const doc = loadAssessment("11111111-1111-1111-1111-111111111111");
    expect(doc.revisions).toHaveLength(2);
    expect(doc.revisions[0]!.comment).toBe("initial"); // original untouched
    expect(doc.revisions[1]!.revisions?.at(-1)?.change).toContain("C2");
  });

  it("rejects malformed or unattributable judgments", () => {
    expect(() =>
      validateRatings([{ criterion: "C1", rating: 4, comment: "" }]),
    ).toThrow(/C1\.\.C5/);
    expect(() =>
      validateRatings([
        { criterion: "C1", rating: 9, comment: "" },
        { criterion: "C2", rating: 3, comment: "" },
        { criterion: "C3", rating: 3, comment: "" },
        { criterion: "C4", rating: 3, comment: "" },
        { criterion: "C5", rating: 3, comment: "" },
      ]),
    ).toThrow(/1\.\.5/);
  });

  it("portable report keeps deterministic and human judgments separate", () => {
    const report = portableReport("11111111-1111-1111-1111-111111111111", {
      scenarioId: "A1",
      scenarioVersion: "1.0.0",
      deterministicOutcome: "fail",
      checks: [{ id: "requirements_met", passed: false, detail: "not met" }],
    });
    const d = report.deterministic as { outcome: string; note: string };
    const h = report.humanRubric as { revisionCount: number; note: string };
    expect(d.outcome).toBe("fail");
    expect(h.revisionCount).toBe(2);
    expect(d.note).toMatch(/narrow tested properties/);
    expect(h.note).toMatch(/attributable/);
    // The human rubric never flips the deterministic outcome field.
    expect(JSON.stringify(report.deterministic)).not.toContain("4");
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

import { afterAll } from "vitest";
