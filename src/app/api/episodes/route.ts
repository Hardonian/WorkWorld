import { NextResponse, type NextRequest } from "next/server";
import { startSession, cookieName } from "../../../server/session.ts";
import { SCENARIOS } from "../../../scenarios/catalog.ts";
import { readJsonObject, requestErrorResponse } from "../../../server/http.ts";

export const dynamic = "force-dynamic";

/**
 * Start (or restart) a demo episode. Opaque session id in an httpOnly cookie;
 * per-session isolated state. Demo mode only — hosted tenancy is separate.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(req, 8 * 1024);
  } catch (error) {
    return requestErrorResponse(error);
  }
  const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId : "";
  if (!SCENARIOS[scenarioId]) {
    return NextResponse.json({ error: `unknown scenario ${scenarioId}` }, { status: 404 });
  }
  const condition = body.condition === "agent" || body.condition === "assisted" ? body.condition : "human";
  let observation;
  let runId;
  try {
    ({ observation, runId } = await startSession(scenarioId, condition));
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not start episode";
    if (message.includes("authenticated Supabase session")) {
      return NextResponse.json({ error: "sign in to start a private workspace episode" }, { status: 401 });
    }
    if (message.includes("participant membership")) {
      return NextResponse.json(
        { error: "your account has no active workspace membership; contact your organization administrator" },
        { status: 403 },
      );
    }
    if (message.includes("hosted configuration") || message.includes("hosted database policies")) {
      return NextResponse.json({ error: "hosted workspace is not ready" }, { status: 503 });
    }
    return NextResponse.json({ error: "could not start episode" }, { status: 500 });
  }
  const res = NextResponse.json({ runId, observation }, { status: 201 });
  res.cookies.set(cookieName(), runId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    priority: "high",
  });
  return res;
}
