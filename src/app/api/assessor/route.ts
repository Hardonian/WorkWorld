import { NextResponse, type NextRequest } from "next/server";
import { appendRevision, loadAssessment, listAssessedRuns, portableReport, validateRatings } from "../../../server/assessments.ts";
import { makeStore } from "../../../server/store.ts";
import { getScenario } from "../../../scenarios/catalog.ts";
import { gradeEpisode } from "../../../grading/report.ts";

export const dynamic = "force-dynamic";

function store() {
  return makeStore((process.env.WORKWORLD_STORE ?? "file") as "memory" | "file");
}

/** GET /api/assessor — list runs with evidence summaries. */
export async function GET() {
  const runs = await store().listRuns();
  const assessed = listAssessedRuns();
  return NextResponse.json({
    runs: runs.map((r) => ({
      runId: r.runId,
      scenarioId: r.scenarioId,
      condition: r.condition,
      createdAt: r.createdAt,
      assessed: assessed.includes(r.runId),
    })),
  });
}

/** POST /api/assessor — record an attributable rubric revision. */
export async function POST(req: NextRequest) {
  let body: {
    runId?: string;
    assessor?: string;
    ratings?: unknown;
    comment?: string;
    revisionNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const runId = String(body.runId ?? "");
  const assessor = String(body.assessor ?? "").slice(0, 200);
  if (!assessor) {
    return NextResponse.json(
      { error: "assessor identity is required — judgments are attributable" },
      { status: 400 },
    );
  }
  try {
    validateRatings(body.ratings);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const doc = appendRevision(runId, {
      assessor,
      ratings: validateRatings(body.ratings),
      comment: String(body.comment ?? "").slice(0, 4000),
      revisionNote: body.revisionNote,
    });
    return NextResponse.json({ ok: true, revisionCount: doc.revisions.length }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** PATCH /api/assessor?action=report — portable report for one run. */
export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "report") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const runId = url.searchParams.get("runId") ?? "";
  try {
    const state = await store().loadState(runId);
    const scenario = getScenario(state.scenarioId);
    const report = gradeEpisode(state, scenario);
    const portable = portableReport(runId, {
      scenarioId: state.scenarioId,
      scenarioVersion: state.scenarioVersion,
      deterministicOutcome: report.outcome,
      checks: report.checks.map((c) => ({ id: c.id, passed: c.passed, detail: c.detail })),
    });
    return NextResponse.json({
      report: portable,
      assessment: loadAssessment(runId),
      evidence: {
        actionLog: state.actionLog.map((a) => ({
          type: a.type,
          outcome: a.outcome,
          atMinute: a.atMinute,
          actorKind: a.actor.kind,
          errors: a.errors.map((e) => e.code),
        })),
        submission: state.submission,
        artifacts: Object.keys(state.workbooks),
        messages: state.messages.length,
        clockMinute: state.clockMinute,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
