import { NextRequest, NextResponse } from "next/server";
import { billingService } from "../../../../server/billing.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId") ?? "org-default";
  const sub = billingService.getOrgSubscription(orgId);
  const quota = billingService.canAddSeat(orgId);

  return NextResponse.json({
    status: "ok",
    subscription: sub,
    quota,
  });
}
