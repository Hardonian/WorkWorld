import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateMagicLinkToken } from "../src/server/auth.ts";
import { OrganizationRegistry } from "../src/server/organizations.ts";
import { InvitationService } from "../src/server/invitations.ts";
import { applyPolicyOverrides } from "../src/domain/policy-overrides.ts";
import { generateDataTakeout, anonymizeStudentRecord } from "../src/server/privacy.ts";
import { SessionRegistry } from "../src/server/sessions.ts";
import type { Policy } from "../src/domain/types.ts";

describe("Enterprise Authentication (Item 051)", () => {
  it("hashes and securely verifies passwords", () => {
    const { hash, salt } = hashPassword("P@ssw0rdSecure2026!");
    expect(verifyPassword("P@ssw0rdSecure2026!", hash, salt)).toBe(true);
    expect(verifyPassword("WrongPassword!", hash, salt)).toBe(false);
  });

  it("generates time-bounded magic link tokens", () => {
    const { token, expiresAt } = generateMagicLinkToken("ops@northline.local", 30);
    expect(token).toMatch(/^ml_[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("Organization & Cohort Registry (Item 053)", () => {
  it("enforces seat license limits on cohort creation", () => {
    const registry = new OrganizationRegistry();
    registry.registerOrganization({
      id: "ORG-01",
      name: "Ontario Operations Academy",
      domain: "ooa.edu",
      seatLimit: 5,
      activeSeats: 0,
      departments: ["Supply Chain"],
    });

    const res1 = registry.createCohort({
      id: "COHORT-A",
      organizationId: "ORG-01",
      name: "Spring 2026",
      instructorId: "INST-1",
      assignedScenarios: ["A1", "B1"],
      learnerIds: ["L1", "L2", "L3"],
      startsAt: "2026-04-01",
      endsAt: "2026-06-01",
    });
    expect(res1.ok).toBe(true);

    // Requesting 4 more exceeds limit of 5 (3 + 4 = 7 > 5)
    const res2 = registry.createCohort({
      id: "COHORT-B",
      organizationId: "ORG-01",
      name: "Overflow",
      instructorId: "INST-1",
      assignedScenarios: ["A1"],
      learnerIds: ["L4", "L5", "L6", "L7"],
      startsAt: "2026-04-01",
      endsAt: "2026-06-01",
    });
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain("Seat license exceeded");
  });
});

describe("Team Invitations (Item 055)", () => {
  it("creates and accepts team invitations", () => {
    const service = new InvitationService();
    const invite = service.createInvitation({
      email: "newlearner@northline.local",
      organizationId: "ORG-01",
      assignedRole: "learner",
    });

    const accepted = service.acceptInvitation(invite.token);
    expect(accepted.ok).toBe(true);
    expect(accepted.invite?.status).toBe("accepted");

    // Re-accepting fails
    const reaccept = service.acceptInvitation(invite.token);
    expect(reaccept.ok).toBe(false);
  });
});

describe("Tenant Policy Overrides (Item 057)", () => {
  it("overrides policy approval limits and help constraints", () => {
    const base: Policy = {
      currency: "CAD",
      budgetMinor: 250000,
      approvalThresholdMinor: 40000,
      helpPolicy: { maxHelpRequests: 3, fatalBeyond: false },
    };

    const customized = applyPolicyOverrides(base, {
      organizationId: "ORG-01",
      customApprovalThresholdMinor: 60000,
      maxAllowedHelpRequests: 1,
    });

    expect(customized.approvalThresholdMinor).toBe(60000);
    expect(customized.helpPolicy.maxHelpRequests).toBe(1);
  });
});

describe("Privacy & Data Takeout (Item 058)", () => {
  it("generates GDPR takeout and anonymizes records", () => {
    const takeout = generateDataTakeout("U1", { email: "u1@work.com" }, [{ episodeId: "A1" }], []);
    expect(takeout.userId).toBe("U1");
    expect(takeout.evaluationHistory).toHaveLength(1);

    const anon = anonymizeStudentRecord("U1", "u1@work.com");
    expect(anon.anonymizedId).toContain("ANON-U1");
    expect(anon.anonymizedEmail).toContain("@privacy.local");
  });
});

describe("Active Session Registry & Revocation (Item 059)", () => {
  it("tracks active sessions and revokes user sessions remotely", () => {
    const reg = new SessionRegistry();
    reg.createSession({ sessionId: "S1", userId: "U1", ipAddress: "127.0.0.1", userAgent: "Chrome" });
    reg.createSession({ sessionId: "S2", userId: "U1", ipAddress: "127.0.0.1", userAgent: "Firefox" });

    expect(reg.getActiveSessionsForUser("U1")).toHaveLength(2);

    const revokedCount = reg.revokeAllForUser("U1");
    expect(revokedCount).toBe(2);
    expect(reg.getActiveSessionsForUser("U1")).toHaveLength(0);
  });
});
