import { describe, it, expect } from "vitest";
import { CommercialBillingService, SUBSCRIPTION_PLANS } from "../src/server/billing.ts";

describe("Commercial Billing & Monetization Engine (Sellability & Profitability)", () => {
  const billing = new CommercialBillingService("sk_test_key_123", "whsec_secret_456");

  it("exposes commercial plan tiers with defined seat quotas and pricing", () => {
    expect(SUBSCRIPTION_PLANS.community.pricePerSeatMonthlyUsd).toBe(0);
    expect(SUBSCRIPTION_PLANS.academic.pricePerSeatMonthlyUsd).toBe(49);
    expect(SUBSCRIPTION_PLANS.enterprise.pricePerSeatMonthlyUsd).toBe(199);
    expect(SUBSCRIPTION_PLANS.academic.features).toContain("LTI 1.3 Canvas / Blackboard Sync");
    expect(SUBSCRIPTION_PLANS.enterprise.features).toContain("Dedicated Postgres RLS");
  });

  it("calculates checkout session pricing and generates redirect URLs", () => {
    const session = billing.createCheckoutSessionUrl(
      "org-stanford-ops",
      "academic",
      25,
      "https://app.workworld.org/billing/success",
      "https://app.workworld.org/billing/cancel"
    );

    expect(session.totalMonthlyUsd).toBe(49 * 25); // $1,225/mo
    expect(session.checkoutUrl).toContain("checkout.stripe.com");
    expect(session.sessionId).toContain("org-stanford-ops");
  });

  it("enforces seat quota boundaries for active organizations", () => {
    const check1 = billing.canAddSeat("org-community-test");
    expect(check1.allowed).toBe(false); // 1/1 active seats in community tier
    expect(check1.tier).toBe("community");
  });

  it("processes inbound Stripe webhook events to upgrade organization capacity", () => {
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "org-apex-logistics",
          customer: "cus_stripe_88192",
          subscription: "sub_stripe_99201",
          metadata: {
            orgId: "org-apex-logistics",
            tier: "enterprise",
            seats: "50",
          },
        },
      },
    });

    const res = billing.verifyAndProcessStripeWebhook(payload, "t=12345,v1=mock_signature");
    expect(res.valid).toBe(true);
    expect(res.orgId).toBe("org-apex-logistics");

    const updatedSub = billing.getOrgSubscription("org-apex-logistics");
    expect(updatedSub.tier).toBe("enterprise");
    expect(updatedSub.maxSeats).toBe(50);
    expect(updatedSub.stripeCustomerId).toBe("cus_stripe_88192");
  });
});
