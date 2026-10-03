/**
 * Cryptographically Verifiable Evaluation Manifests (Pillar 5, Item 050).
 * Generates HMAC-SHA256 signed evaluation manifests for verifiable credentialing.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import { createHmac, createHash } from "node:crypto";

export interface EvaluationManifest {
  version: "1.0.0";
  manifestId: string;
  runId: string;
  candidateId: string;
  scenarioId: string;
  issuedAt: string;
  outcome: "pass" | "fail";
  scoreBreakdown: {
    stateCorrectness: number;
    economicEfficiency: number;
    operationalVelocity: number;
    professionalPolish: number;
    compositeScore: number;
  };
  stateDigestSha256: string;
  signature: string;
}

export function generateEvaluationManifest(params: {
  runId: string;
  candidateId: string;
  scenarioId: string;
  outcome: "pass" | "fail";
  scores: EvaluationManifest["scoreBreakdown"];
  statePayload: Record<string, unknown>;
  signingSecret: string;
}): EvaluationManifest {
  const issuedAt = new Date().toISOString();
  const manifestId = `MAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`;

  // Hash the entire final state
  const stateDigestSha256 = createHash("sha256")
    .update(JSON.stringify(params.statePayload))
    .digest("hex");

  // Construct canonical payload for signing
  const payloadToSign = `${manifestId}|${params.runId}|${params.candidateId}|${params.scenarioId}|${params.outcome}|${params.scores.compositeScore}|${stateDigestSha256}|${issuedAt}`;

  const signature = createHmac("sha256", params.signingSecret)
    .update(payloadToSign)
    .digest("hex");

  return {
    version: "1.0.0",
    manifestId,
    runId: params.runId,
    candidateId: params.candidateId,
    scenarioId: params.scenarioId,
    issuedAt,
    outcome: params.outcome,
    scoreBreakdown: params.scores,
    stateDigestSha256,
    signature,
  };
}

export function verifyEvaluationManifest(
  manifest: EvaluationManifest,
  signingSecret: string
): boolean {
  const payloadToSign = `${manifest.manifestId}|${manifest.runId}|${manifest.candidateId}|${manifest.scenarioId}|${manifest.outcome}|${manifest.scoreBreakdown.compositeScore}|${manifest.stateDigestSha256}|${manifest.issuedAt}`;

  const expectedSignature = createHmac("sha256", signingSecret)
    .update(payloadToSign)
    .digest("hex");

  return manifest.signature === expectedSignature;
}
