import { NextResponse, type NextRequest } from "next/server";
import { modelWorkflowRoi, type RoiModelInput } from "../../../../index/roi.ts";
import { readJsonObject, requestErrorResponse } from "../../../../server/http.ts";

export async function POST(request: NextRequest) {
  try {
    const input = await readJsonObject(request) as unknown as RoiModelInput;
    return NextResponse.json({ schema: "workworld-index/roi@1", result: modelWorkflowRoi(input) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
