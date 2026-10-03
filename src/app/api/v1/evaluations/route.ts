import { NextResponse } from "next/server";
import { getStore } from "../../../../server/store.ts";
import { getScenario } from "../../../../scenarios/catalog.ts";
import { gradeEpisode } from "../../../../grading/report.ts";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";

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
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing required parameter: sessionId" }, { status: 400 });
    }

    const store = getStore();
    const state = await store.loadState(sessionId);
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
    const message = err instanceof Error ? err.message : "Failed to grade evaluation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
