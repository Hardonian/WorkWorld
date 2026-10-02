import { NextResponse, type NextRequest } from "next/server";
import { startSession, cookieName } from "../../../server/session.ts";
import { SCENARIOS } from "../../../scenarios/catalog.ts";

export const dynamic = "force-dynamic";

/**
 * Start (or restart) a demo episode. Opaque session id in an httpOnly cookie;
 * per-session isolated state. Demo mode only — hosted tenancy is separate.
 */
export async function POST(req: NextRequest) {
  let body: { scenarioId?: string; condition?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const scenarioId = body.scenarioId ?? "";
  if (!SCENARIOS[scenarioId]) {
    return NextResponse.json({ error: `unknown scenario ${scenarioId}` }, { status: 404 });
  }
  const condition = body.condition === "agent" || body.condition === "assisted" ? body.condition : "human";
  const { observation, runId } = await startSession(scenarioId, condition);
  const res = NextResponse.json({ runId, observation }, { status: 201 });
  res.cookies.set(cookieName(), runId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
