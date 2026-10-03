/**
 * Double-Blind Evaluation Anonymizer (Pillar 5, Item 043).
 * Sanitizes candidate submissions and agent trajectories to eliminate assessor bias.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Observation } from "../domain/observation.ts";

export interface BlindedEvaluationPackage {
  blindCandidateToken: string;
  scenarioId: string;
  scrubbedObservation: Observation;
  actionSequenceCount: number;
}

// Simple hash generator for anonymization
function generateBlindToken(candidateId: string, runId: string): string {
  const raw = `${candidateId}::${runId}::workworld_salt_2026`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `BLIND-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function createBlindedPackage(
  candidateId: string,
  runId: string,
  obs: Observation
): BlindedEvaluationPackage {
  const blindToken = generateBlindToken(candidateId, runId);

  // Deep clone and scrub any candidate identifiers in notes or tickets
  const scrubbed: Observation = JSON.parse(JSON.stringify(obs));

  for (const note of scrubbed.workNotes) {
    note.text = note.text.replace(new RegExp(candidateId, "gi"), "[REDACTED_CANDIDATE]");
  }

  for (const ticket of Object.values(scrubbed.tickets)) {
    const ticketRecord = ticket as { notes?: { text: string }[] } | undefined;
    const notes = ticketRecord?.notes;
    if (Array.isArray(notes)) {
      for (const entry of notes) {
        if (entry && typeof entry.text === "string") {
          entry.text = entry.text.replace(new RegExp(candidateId, "gi"), "[REDACTED_CANDIDATE]");
        }
      }
    }
  }

  return {
    blindCandidateToken: blindToken,
    scenarioId: obs.scenarioId,
    scrubbedObservation: scrubbed,
    actionSequenceCount: obs.recentActions.length,
  };
}
