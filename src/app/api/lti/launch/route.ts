import { NextResponse } from "next/server";
import { LtiAdvantageService } from "../../../../server/lti.ts";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const idToken = formData.get("id_token")?.toString() ?? "";
    const state = formData.get("state")?.toString() ?? "";

    const ltiService = new LtiAdvantageService();
    const result = ltiService.validateLaunchToken(idToken, state);

    if (!result.valid || !result.claims) {
      return NextResponse.json(
        { error: result.error ?? "Invalid LTI 1.3 launch signature" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: "authenticated",
      course: result.claims.context.title,
      courseCode: result.claims.context.label,
      studentId: result.claims.sub,
      workspaceRedirect: "/workspace",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during LTI launch";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
