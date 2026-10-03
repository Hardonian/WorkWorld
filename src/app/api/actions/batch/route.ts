import { NextResponse, type NextRequest } from "next/server";
import { getSessionId, applyBatchActionsForRun } from "../../../../server/session.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest | Request) {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json(
        { error: "No active session found. Please initialize a run via /api/session" },
        { status: 400 }
      );
    }

    let body: { actions?: Array<Record<string, unknown>>; actorKind?: "human" | "agent" | "assisted" };
    try {
      body = (await request.json()) as { actions?: Array<Record<string, unknown>>; actorKind?: "human" | "agent" | "assisted" };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawActions = body.actions;
    if (!Array.isArray(rawActions) || rawActions.length === 0) {
      return NextResponse.json(
        { error: "Batch request must contain a non-empty array of actions" },
        { status: 400 }
      );
    }

    if (rawActions.length > 50) {
      return NextResponse.json(
        { error: "Batch size limit exceeded. Maximum 50 actions per atomic batch." },
        { status: 413 }
      );
    }

    const actorKind = body.actorKind ?? "human";
    const result = await applyBatchActionsForRun(sessionId, rawActions, actorKind);

    if ("error" in result) {
      const status = result.code === "NO_SESSION" ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      success: true,
      processedCount: result.results.length,
      allSucceeded: result.results.every((r) => r.transition.ok),
      results: result.results,
      observation: result.observation,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error executing batch actions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
