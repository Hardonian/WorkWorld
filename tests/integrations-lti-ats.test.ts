import { describe, it, expect } from "vitest";
import { LtiAdvantageService } from "../src/server/lti.ts";
import { AtsIntegrationService } from "../src/server/ats.ts";

describe("LTI 1.3 Canvas & Blackboard Integration (Distribution Moat)", () => {
  const service = new LtiAdvantageService();

  it("validates launch token and extracts course context", () => {
    const launch = service.validateLaunchToken("mock_jwt_token", "state_12345");
    expect(launch.valid).toBe(true);
    expect(launch.claims?.context.label).toBe("OPS-401");
    expect(launch.claims?.context.title).toContain("Operations Strategy");
  });

  it("formats and signs grade passback payload for university gradebook", () => {
    const grade = service.formatGradePassback("std_8891", 94, "Flawless reconciliation and PO placement");
    expect(grade.scoreGiven).toBe(94);
    expect(grade.scoreMaximum).toBe(100);
    expect(grade.gradingProgress).toBe("FullyGraded");

    const signature = service.signGradePayload(grade);
    expect(signature).toHaveLength(64); // SHA256 hex
  });
});

describe("ATS Integration - Greenhouse & Lever (Distribution Moat)", () => {
  const ats = new AtsIntegrationService();

  it("generates time-bounded candidate invitation links", () => {
    const invitation = ats.createCandidateInvitation({
      candidateId: "CAND-771",
      firstName: "Sarah",
      lastName: "Connor",
      email: "sarah.connor@example.com",
      jobId: "JOB-OPS-01",
      jobTitle: "Operations Specialist",
      atsSystem: "greenhouse",
    }, "A1");

    expect(invitation.invitationToken).toMatch(/^ats_[0-9a-f]{48}$/);
    expect(invitation.assessmentUrl).toContain("/assessment?token=ats_");
    expect(new Date(invitation.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("generates structured ATS scorecard with hiring recommendation", () => {
    const scorecard = ats.generateScorecardPayload("CAND-771", "JOB-OPS-01", {
      stateCorrectness: 100,
      economicEfficiency: 92,
      operationalVelocity: 88,
      professionalPolish: 90,
      compositeScore: 94,
    }, "CERT-WW-12345");

    expect(scorecard.recommendation).toBe("strong_yes");
    expect(scorecard.attributes["Accounting Invariants & State"]).toBe(100);
    expect(scorecard.credentialVerificationUrl).toContain("/verify/CERT-WW-12345");
  });
});
