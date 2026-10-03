import { NextResponse } from "next/server";
import { getStore } from "../../../../server/store.ts";
import { EpisodeEngine } from "../../../../domain/engine.ts";
import { getScenario } from "../../../../scenarios/catalog.ts";
import { buildObservation } from "../../../../domain/observation.ts";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";
import type { Action, Actor } from "../../../../domain/types.ts";

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
    const { sessionId, action } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId and action" },
        { status: 400 }
      );
    }

    const store = getStore();
    const state = await store.loadState(sessionId);
    if (!state) {
      return NextResponse.json({ error: `Session ${sessionId} not found` }, { status: 404 });
    }

    const scenario = getScenario(state.scenarioId);
    const engine = EpisodeEngine.fromState(scenario, state);
    const actor: Actor = { id: "api_agent", kind: "agent", role: "participant" };
    const transition = engine.step(action as Action, actor);

    if (transition.ok) {
      await store.saveState(sessionId, engine.getState());
    }

    const observation = buildObservation(engine.getState(), scenario);

    return NextResponse.json({
      ok: transition.ok,
      feedback: transition.feedback,
      errors: transition.errors,
      revision: transition.state.revision,
      observation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute action";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
