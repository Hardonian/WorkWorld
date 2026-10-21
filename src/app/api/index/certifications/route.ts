import { NextResponse, type NextRequest } from "next/server";
import { prepareCertificationPreflight } from "../../../../server/certification-preflight.ts";
import { RequestError, readJsonObject, requestErrorResponse } from "../../../../server/http.ts";
import { getHostedIdentity } from "../../../../server/supabase-auth.ts";

export async function POST(request: NextRequest) {
  try {
    // A hosted certification workspace is tenant-scoped. Demo preflights remain
    // local/ephemeral, but a configured hosted deployment must not accept an
    // anonymous request that a user could mistake for a private certification.
    if (process.env.WORKWORLD_MODE === "hosted" && !(await getHostedIdentity())) {
      throw new RequestError("authentication is required for a hosted certification workspace", 401, "AUTH_REQUIRED");
    }
    const body = await readJsonObject(request);
    const preflight = prepareCertificationPreflight(body);
    return NextResponse.json({ schema: "workworld-index/preflight@1", preflight }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
