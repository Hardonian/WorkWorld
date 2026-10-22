import { hostedAssessmentStore, loadHostedAssessment, appendHostedAssessment } from "../../../server/hosted-assessments.ts";
import { apiBoundary } from "../../../server/http.ts";
import { NextResponse, type NextRequest } from "next/server";
import { appendRevision, loadAssessment, listAssessedRuns, portableReport, validateRatings } from "../../../server/assessments.ts";
import { makeStore } from "../../../server/store.ts";
import { getScenario } from "../../../scenarios/catalog.ts";
import { gradeEpisode } from "../../../grading/report.ts";
import { readJsonObject, requestErrorResponse } from "../../../server/http.ts";

export const dynamic = "force-dynamic";

function store() {
  return makeStore((process.env.WORKWORLD_STORE ?? "file") as "memory" | "file");
}

/** GET /api/assessor — list runs with evidence summaries. */
async function get() {
  const activeStore = process.env.WORKWORLD_MODE === "hosted" ? await hostedAssessmentStore() : store();
  const runs = await activeStore.listRuns();
  const assessed = process.env.WORKWORLD_MODE === "hosted"
    ? await (await hostedAssessmentStore()).withClient(async (client) => (await client.query<{ run_id: string }>("select distinct run_id from workworld.assessments")).rows.map((row) => row.run_id))
    : listAssessedRuns();
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
async function post(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(req);
  } catch (error) {
    return requestErrorResponse(error);
  }
  const runId = String(body.runId ?? "");
  const assessor = String(body.assessor ?? "").slice(0, 200);
  if (!assessor && process.env.WORKWORLD_MODE !== "hosted") {
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
  if (process.env.WORKWORLD_MODE === "hosted") {
    const revisionCount = await appendHostedAssessment(await hostedAssessmentStore(), runId, validateRatings(body.ratings), String(body.comment ?? "").slice(0, 4000));
    return NextResponse.json({ ok: true, revisionCount }, { status: 201 });
  }
  try {
    const doc = appendRevision(runId, {
      assessor,
      ratings: validateRatings(body.ratings),
      comment: String(body.comment ?? "").slice(0, 4000),
      revisionNote: typeof body.revisionNote === "string" ? body.revisionNote.slice(0, 2000) : undefined,
    });
    return NextResponse.json({ ok: true, revisionCount: doc.revisions.length }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** PATCH /api/assessor?action=report — portable report for one run. */
async function patch(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "report") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const runId = url.searchParams.get("runId") ?? "";
  try {
    const activeStore = process.env.WORKWORLD_MODE === "hosted" ? await hostedAssessmentStore() : store();
    const state = await activeStore.loadState(runId);
    const scenario = getScenario(state.scenarioId);
    const report = gradeEpisode(state, scenario);
    const assessment = process.env.WORKWORLD_MODE === "hosted" ? await loadHostedAssessment(await hostedAssessmentStore(), runId) : loadAssessment(runId);
    const portable = process.env.WORKWORLD_MODE === "hosted" ? { runId, deterministic: { outcome: report.outcome, checks: report.checks }, humanRubric: { latest: assessment.revisions.at(-1) ?? null, revisionCount: assessment.revisions.length } } : portableReport(runId, {
      scenarioId: state.scenarioId,
      scenarioVersion: state.scenarioVersion,
      deterministicOutcome: report.outcome,
      checks: report.checks.map((c) => ({ id: c.id, passed: c.passed, detail: c.detail })),
    });
    return NextResponse.json({
      report: portable,
      assessment,
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
    if (process.env.WORKWORLD_MODE === "hosted") return requestErrorResponse(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export const GET = apiBoundary(get);

export const POST = apiBoundary(post);

export const PATCH = apiBoundary(patch);
