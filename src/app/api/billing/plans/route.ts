import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS } from "../../../../server/billing.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    currency: "USD",
    billingCycle: "monthly",
    plans: SUBSCRIPTION_PLANS,
  });
}
