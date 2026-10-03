import { NextResponse } from "next/server";
import { listScenarios } from "../../../../scenarios/catalog.ts";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";
import { currentObservationForRun, startSession } from "../../../../server/session.ts";
import { readJsonObject, RequestError, requestErrorResponse } from "../../../../server/http.ts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    const scenarios = listScenarios().map((s) => ({
      id: s.id,
      family: s.family,
      title: s.title,
      brief: s.brief,
      durationMinutes: s.durationMinutes,
      policy: s.policy,
    }));
    return NextResponse.json({ scenarios });
  }

  const observation = await currentObservationForRun(sessionId);
  if (!observation) {
    return NextResponse.json({ error: `Session ${sessionId} not found` }, { status: 404 });
  }
  return NextResponse.json({ observation });
}

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
    const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId : "A1";
    const condition =
      body.condition === "human" || body.condition === "assisted" ? body.condition : "agent";
    const seed = body.seed === undefined ? 42 : Number(body.seed);
    if (!Number.isSafeInteger(seed)) {
      return NextResponse.json({ error: "seed must be an integer" }, { status: 400 });
    }
    const { runId, observation } = await startSession(scenarioId, condition, seed);

    return NextResponse.json({
      sessionId: runId,
      runId,
      scenarioId,
      observation,
    });
  } catch (err: unknown) {
    if (err instanceof RequestError) return requestErrorResponse(err);
    const message = err instanceof Error ? err.message : "Failed to initialize episode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
