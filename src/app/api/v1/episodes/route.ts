import { NextResponse } from "next/server";
import { listScenarios, getScenario } from "../../../../scenarios/catalog.ts";
import { getStore } from "../../../../server/store.ts";
import { EpisodeEngine } from "../../../../domain/engine.ts";
import { buildObservation } from "../../../../domain/observation.ts";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";

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

  const store = getStore();
  const state = await store.loadState(sessionId);
  if (!state) {
    return NextResponse.json({ error: `Session ${sessionId} not found` }, { status: 404 });
  }

  const scenario = getScenario(state.scenarioId);
  const observation = buildObservation(state, scenario);
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
    const body = await request.json();
    const { scenarioId = "A1", condition = "agent", seed = 42 } = body;

    const scenario = getScenario(scenarioId);
    const runId = "run_" + Math.random().toString(36).substring(2, 10);
    const engine = EpisodeEngine.reset(scenario, {
      runId,
      seed,
      condition,
    });

    const store = getStore();
    const sessionId = "sess_" + Math.random().toString(36).substring(2, 12);
    await store.saveState(sessionId, engine.getState());

    const observation = buildObservation(engine.getState(), scenario);

    return NextResponse.json({
      sessionId,
      runId,
      scenarioId,
      observation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initialize episode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
