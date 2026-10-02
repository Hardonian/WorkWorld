import { NextResponse, type NextRequest } from "next/server";
import { applyActionInput } from "../../../server/session.ts";

export const dynamic = "force-dynamic";

/**
 * Apply one typed domain action. Stable error states: 400 invalid payload,
 * 409 domain rejection (policy/permission/state), 404 no session. Work is
 * preserved across rejections (state saved after every step).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body", code: "PAYLOAD_INVALID" }, { status: 400 });
  }
  const result = await applyActionInput(body);
  if ("error" in result) {
    const status = result.code === "NO_SESSION" ? 404 : 400;
    return NextResponse.json(result, { status });
  }
  const { transition, observation } = result;
  return NextResponse.json(
    {
      ok: transition.ok,
      errors: transition.errors,
      feedback: transition.feedback,
      effects: transition.effects,
      observation,
    },
    { status: transition.ok ? 200 : 409 },
  );
}
