import { NextResponse, type NextRequest } from "next/server";
import { prepareCertificationPreflight } from "../../../../server/certification-preflight.ts";
import { readJsonObject, requestErrorResponse } from "../../../../server/http.ts";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const preflight = prepareCertificationPreflight(body);
    return NextResponse.json({ schema: "workworld-index/preflight@1", preflight }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
