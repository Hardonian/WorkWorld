/**
 * Applicant Tracking System (ATS) Integration (Greenhouse & Lever).
 * Enables automated candidate dispatch and structured score write-back.
 * Pure TypeScript — no React imports.
 */

import { randomBytes, createHmac } from "node:crypto";

export interface AtsCandidateProfile {
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobId: string;
  jobTitle: string;
  atsSystem: "greenhouse" | "lever";
}

export interface AtsAssessmentInvitation {
  invitationToken: string;
  assessmentUrl: string;
  candidateId: string;
  assignedScenarioId: string;
  expiresAt: string;
}

export interface AtsScorecardPayload {
  candidateId: string;
  jobId: string;
  overallScore: number;
  recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  summary: string;
  attributes: Record<string, number>;
  credentialVerificationUrl: string;
}

export class AtsIntegrationService {
  private webhookSecret: string;
  private appBaseUrl: string;

  constructor(
    webhookSecret = "workworld_ats_webhook_secret_2026",
    appBaseUrl = "https://app.workworld.org"
  ) {
    this.webhookSecret = webhookSecret;
    this.appBaseUrl = appBaseUrl;
  }

  /**
   * Generates a single-use tokenized assessment invitation for a candidate.
   */
  createCandidateInvitation(candidate: AtsCandidateProfile, scenarioId = "A1"): AtsAssessmentInvitation {
    const token = `ats_${randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days valid

    return {
      invitationToken: token,
      assessmentUrl: `${this.appBaseUrl}/assessment?token=${token}&scenario=${scenarioId}`,
      candidateId: candidate.candidateId,
      assignedScenarioId: scenarioId,
      expiresAt,
    };
  }

  /**
   * Generates structured scorecard payload formatted for Greenhouse/Lever webhooks.
   */
  generateScorecardPayload(
    candidateId: string,
    jobId: string,
    scores: {
      stateCorrectness: number;
      economicEfficiency: number;
      operationalVelocity: number;
      professionalPolish: number;
      compositeScore: number;
    },
    verificationCertificateId: string
  ): AtsScorecardPayload {
    let recommendation: AtsScorecardPayload["recommendation"] = "no";
    if (scores.compositeScore >= 90) recommendation = "strong_yes";
    else if (scores.compositeScore >= 75) recommendation = "yes";
    else if (scores.compositeScore < 50) recommendation = "strong_no";

    return {
      candidateId,
      jobId,
      overallScore: scores.compositeScore,
      recommendation,
      summary: `Candidate completed WorkWorld Assessment with ${scores.compositeScore}% composite score. Correctness: ${scores.stateCorrectness}%, Efficiency: ${scores.economicEfficiency}%.`,
      attributes: {
        "Accounting Invariants & State": scores.stateCorrectness,
        "Cost & Budget Prudence": scores.economicEfficiency,
        "Operational Execution Speed": scores.operationalVelocity,
        "Documentation & Communication": scores.professionalPolish,
      },
      credentialVerificationUrl: `${this.appBaseUrl}/verify/${verificationCertificateId}`,
    };
  }

  /**
   * Validates inbound webhook signature from Greenhouse / Lever.
   */
  verifyAtsWebhookSignature(signatureHeader: string, rawBody: string): boolean {
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    return signatureHeader === expected || signatureHeader === `sha256=${expected}`;
  }
}
