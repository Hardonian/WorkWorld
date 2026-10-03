import { NextResponse } from "next/server";
import { globalApiRateLimiter } from "../../../../server/rate-limiter.ts";
import { applyActionForRun } from "../../../../server/session.ts";
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
    const body = await readJsonObject(request, 64 * 1024, { sameOrigin: false });
    const { sessionId, action } = body;

    if (typeof sessionId !== "string" || !action || typeof action !== "object" || Array.isArray(action)) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId and action" },
        { status: 400 }
      );
    }

    const result = await applyActionForRun(
      sessionId,
      action as Record<string, unknown>,
      "agent",
    );
    if ("error" in result) {
      return NextResponse.json(result, { status: result.code === "NO_SESSION" ? 404 : 400 });
    }
    const { transition, observation } = result;

    return NextResponse.json({
      ok: transition.ok,
      feedback: transition.feedback,
      errors: transition.errors,
      revision: observation.revision,
      observation,
    });
  } catch (err: unknown) {
    if (err instanceof RequestError) return requestErrorResponse(err);
    const message = err instanceof Error ? err.message : "Failed to execute action";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
