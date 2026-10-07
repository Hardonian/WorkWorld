import { describe, it, expect } from "vitest";
import { GET as getPlans } from "../src/app/api/billing/plans/route.ts";
import { POST as createCheckout } from "../src/app/api/billing/checkout/route.ts";
import { GET as getSubscription } from "../src/app/api/billing/subscription/route.ts";
import { POST as handleStripeWebhook } from "../src/app/api/webhooks/stripe/route.ts";
import { NextRequest } from "next/server";

describe("Commercial Billing & Stripe Checkout API Endpoints", () => {
  it("GET /api/billing/plans returns available plans and pricing", async () => {
    const res = await getPlans();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.plans.community.pricePerSeatMonthlyUsd).toBe(0);
    expect(data.plans.academic.pricePerSeatMonthlyUsd).toBe(49);
    expect(data.plans.enterprise.pricePerSeatMonthlyUsd).toBe(199);
  });

  it("POST /api/billing/checkout creates a checkout session with validated pricing", async () => {
    const req = new NextRequest("http://localhost:3100/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "org_acme_logistics",
        tier: "academic",
        seatCount: 15,
      }),
    });

    const res = await createCheckout(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.totalMonthlyUsd).toBe(49 * 15); // $735/mo
    expect(data.checkoutUrl).toContain("checkout.stripe.com");
    expect(data.sessionId).toContain("org_acme_logistics");
  });

  it("POST /api/billing/checkout validates payload constraints", async () => {
    const req = new NextRequest("http://localhost:3100/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "",
        tier: "invalid_tier",
        seatCount: -5,
      }),
    });

    const res = await createCheckout(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid checkout request");
  });

  it("GET /api/billing/subscription returns current quota and tier", async () => {
    const req = new NextRequest("http://localhost:3100/api/billing/subscription?orgId=org_acme_logistics");
    const res = await getSubscription(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.subscription.orgId).toBe("org_acme_logistics");
    expect(data.quota).toBeDefined();
  });

  it("POST /api/webhooks/stripe validates signature and updates organization tier", async () => {
    const webhookPayload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "org_test_carrier",
          customer: "cus_live_99182",
          subscription: "sub_live_11293",
          metadata: {
            orgId: "org_test_carrier",
            tier: "enterprise",
            seats: "100",
          },
        },
      },
    });

    // Missing signature fails
    const reqNoSig = new NextRequest("http://localhost:3100/api/webhooks/stripe", {
      method: "POST",
      body: webhookPayload,
    });
    const resNoSig = await handleStripeWebhook(reqNoSig);
    expect(resNoSig.status).toBe(400);

    // Valid signature passes
    const reqWithSig = new NextRequest("http://localhost:3100/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1700000000,v1=mock_signature" },
      body: webhookPayload,
    });
    const resWithSig = await handleStripeWebhook(reqWithSig);
    expect(resWithSig.status).toBe(200);
    const data = await resWithSig.json();
    expect(data.received).toBe(true);
    expect(data.orgId).toBe("org_test_carrier");
    expect(data.eventType).toBe("checkout.session.completed");
  });
});
