import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { billingService, type SubscriptionTier } from "../../../../server/billing.ts";

export const dynamic = "force-dynamic";

const CheckoutRequestSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  tier: z.enum(["community", "academic", "enterprise"]),
  seatCount: z.number().int().min(1).max(5000),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CheckoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid checkout request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 400 }
      );
    }

    const { orgId, tier, seatCount, successUrl, cancelUrl } = parsed.data;
    const origin = req.nextUrl.origin;
    const resolvedSuccess = successUrl ?? `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const resolvedCancel = cancelUrl ?? `${origin}/pricing`;

    const session = billingService.createCheckoutSessionUrl(
      orgId,
      tier as SubscriptionTier,
      seatCount,
      resolvedSuccess,
      resolvedCancel
    );

    return NextResponse.json({
      status: "ok",
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      totalMonthlyUsd: session.totalMonthlyUsd,
      tier,
      seatCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", message: (err as Error).message },
      { status: 500 }
    );
  }
}
