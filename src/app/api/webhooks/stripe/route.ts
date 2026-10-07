import { NextRequest, NextResponse } from "next/server";
import { billingService } from "../../../../server/billing.ts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const result = billingService.verifyAndProcessStripeWebhook(rawBody, signature);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid webhook signature or payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      received: true,
      eventType: result.eventType,
      orgId: result.orgId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Webhook processing error", message: (err as Error).message },
      { status: 500 }
    );
  }
}
