import { NextResponse } from "next/server";
import { AtsIntegrationService, type AtsCandidateProfile } from "../../../../server/ats.ts";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-workworld-signature") ?? "";
    const rawBody = await request.text();

    const atsService = new AtsIntegrationService();
    if (signature && !atsService.verifyAtsWebhookSignature(signature, rawBody)) {
      return NextResponse.json({ error: "Invalid webhook HMAC signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      action?: string;
      candidate?: AtsCandidateProfile;
      scenarioId?: string;
    };

    if (payload.action === "candidate_stage_change" && payload.candidate) {
      const invitation = atsService.createCandidateInvitation(
        payload.candidate,
        payload.scenarioId ?? "A1"
      );

      return NextResponse.json({
        success: true,
        action: "invitation_created",
        invitation,
      });
    }

    return NextResponse.json({
      success: true,
      action: "acknowledged",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error processing ATS webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
