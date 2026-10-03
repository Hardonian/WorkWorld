import { NextResponse } from "next/server";
import { getScenario } from "../../../../scenarios/catalog.ts";
import { gradeEpisode } from "../../../../grading/report.ts";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";
import { currentStateForRun } from "../../../../server/session.ts";
import { readJsonObject, RequestError, requestErrorResponse } from "../../../../server/http.ts";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rate = globalApiRateLimiter.check(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rate.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rate.resetSeconds.toString(),
        },
      }
    );
  }

  try {
    const body = await readJsonObject(request, 8 * 1024, { sameOrigin: false });
    const { sessionId } = body;

    if (typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing required parameter: sessionId" }, { status: 400 });
    }

    const state = await currentStateForRun(sessionId);
    if (!state) {
      return NextResponse.json({ error: `Session ${sessionId} not found` }, { status: 404 });
    }

    const scenario = getScenario(state.scenarioId);
    const report = gradeEpisode(state, scenario);

    return NextResponse.json({
      report,
      sessionId,
      runId: state.runId,
      scenarioId: state.scenarioId,
    });
  } catch (err: unknown) {
    if (err instanceof RequestError) return requestErrorResponse(err);
    const message = err instanceof Error ? err.message : "Failed to grade evaluation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
