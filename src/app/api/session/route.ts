import { apiBoundary } from "../../../server/http.ts";
import { NextResponse } from "next/server";
import { currentObservation, currentState } from "../../../server/session.ts";
import { gradeEpisode } from "../../../grading/report.ts";
import { getScenario } from "../../../scenarios/catalog.ts";
import { assertSameOrigin, requestErrorResponse } from "../../../server/http.ts";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Current session observation (or null when no active episode). */
async function get() {
  const observation = await currentObservation();
  if (!observation) {
    return NextResponse.json({ observation: null }, { status: 200 });
  }
  return NextResponse.json({ observation }, { status: 200 });
}

/** Assessment report for the current run (deterministic checks). */
async function post(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch (error) {
    return requestErrorResponse(error);
  }
  const state = await currentState();
  if (!state) {
    return NextResponse.json({ error: "no active episode" }, { status: 404 });
  }
  const scenario = getScenario(state.scenarioId);
  const report = gradeEpisode(state, scenario);
  return NextResponse.json({ report }, { status: 200 });
}

export const GET = apiBoundary(get);

export const POST = apiBoundary(post);
