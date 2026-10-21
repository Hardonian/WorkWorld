/**
 * Evidence-gated pairwise comparison engine for WorkWorld Index.
 *
 * This module deliberately has no seeded models, estimated performance, or
 * generated timestamps. A configuration may enter a battle only after its
 * published, verified live-agent evidence is registered.
 */

export type BenchmarkProvider = "anthropic" | "openai" | "google" | "deepseek" | "meta" | "other";

export interface PublishedEvidence {
  manifestId: string;
  replayId: string;
  suiteVersion: string;
  resultKind: "live-agent";
  verified: true;
  publishedAt: string;
}

export interface ModelProfile {
  modelId: string;
  provider: BenchmarkProvider;
  displayName: string;
  configurationDigest: string;
  evidence: PublishedEvidence;
  eloRating: number;
  episodesEvaluated: number;
  passRatePct: number;
  policyAdherencePct: number;
  avgTokensPerEpisode: number;
  costPerCorrectSettlementUsd: number;
  actionEfficiencyPct: number;
}

export interface ArenaMatch {
  matchId: string;
  scenarioId: string;
  modelA: string;
  modelB: string;
  evidenceA: string;
  evidenceB: string;
  winner: "modelA" | "modelB" | "tie";
  scoreA: number;
  scoreB: number;
  recordedAt: string;
}

export interface RegisterModelInput extends Omit<ModelProfile, "eloRating" | "episodesEvaluated"> {
  initialElo?: number;
}

export interface RecordMatchInput {
  scenarioId: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  modelAId: string;
  modelBId: string;
  scoreA: number;
  scoreB: number;
  recordedAt: string;
}

const INITIAL_ELO = 1200;
const K_FACTOR = 32;

function cloneProfile(profile: ModelProfile): ModelProfile {
  return { ...profile, evidence: { ...profile.evidence } };
}

function assertFiniteInRange(value: number, name: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}`);
  }
}

function assertIsoTimestamp(value: string, name: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${name} must be an ISO-8601 timestamp`);
}

function assertEntrant(input: RegisterModelInput): void {
  if (!/^[a-z0-9][a-z0-9._:-]{2,127}$/i.test(input.modelId)) {
    throw new Error("modelId must be a stable identifier of 3–128 safe characters");
  }
  if (input.displayName.trim().length < 2) throw new Error("displayName must be at least 2 characters");
  if (!/^[a-f0-9]{16,128}$/i.test(input.configurationDigest)) {
    throw new Error("configurationDigest must be a hex digest (16–128 characters)");
  }
  if (!input.evidence.verified || input.evidence.resultKind !== "live-agent") {
    throw new Error("only verified live-agent evidence can enter an arena battle");
  }
  if (!input.evidence.manifestId || !input.evidence.replayId || !input.evidence.suiteVersion) {
    throw new Error("evidence must include manifestId, replayId, and suiteVersion");
  }
  assertIsoTimestamp(input.evidence.publishedAt, "evidence.publishedAt");
  assertFiniteInRange(input.passRatePct, "passRatePct", 0, 100);
  assertFiniteInRange(input.policyAdherencePct, "policyAdherencePct", 0, 100);
  assertFiniteInRange(input.actionEfficiencyPct, "actionEfficiencyPct", 0, 100);
  assertFiniteInRange(input.avgTokensPerEpisode, "avgTokensPerEpisode", 0, Number.MAX_SAFE_INTEGER);
  assertFiniteInRange(input.costPerCorrectSettlementUsd, "costPerCorrectSettlementUsd", 0, Number.MAX_SAFE_INTEGER);
  assertFiniteInRange(input.initialElo ?? INITIAL_ELO, "initialElo", 100, 3000);
}

/**
 * Pairwise Elo ratings are a discovery aid, never a substitute for the run
 * cards. The engine forces each entrant to carry immutable evidence IDs.
 */
export class BenchmarkArena {
  private models = new Map<string, ModelProfile>();
  private matches: ArenaMatch[] = [];

  registerModel(input: RegisterModelInput): ModelProfile {
    assertEntrant(input);
    if (this.models.has(input.modelId)) throw new Error(`model ${input.modelId} is already registered`);
    const profile: ModelProfile = {
      ...input,
      evidence: { ...input.evidence },
      eloRating: input.initialElo ?? INITIAL_ELO,
      episodesEvaluated: 0,
    };
    delete (profile as Partial<RegisterModelInput>).initialElo;
    this.models.set(profile.modelId, profile);
    return cloneProfile(profile);
  }

  getLeaderboard(): ModelProfile[] {
    return Array.from(this.models.values())
      .sort((a, b) => b.eloRating - a.eloRating || a.modelId.localeCompare(b.modelId))
      .map(cloneProfile);
  }

  getModel(modelId: string): ModelProfile | undefined {
    const profile = this.models.get(modelId);
    return profile ? cloneProfile(profile) : undefined;
  }

  recordMatch(input: RecordMatchInput): ArenaMatch {
    if (input.modelAId === input.modelBId) throw new Error("a configuration cannot battle itself");
    const modelA = this.models.get(input.modelAId);
    const modelB = this.models.get(input.modelBId);
    if (!modelA || !modelB) throw new Error("both models must be registered with verified evidence");
    if (modelA.evidence.suiteVersion !== modelB.evidence.suiteVersion) {
      throw new Error("models must use the same suiteVersion for a fair battle");
    }
    assertFiniteInRange(input.scoreA, "scoreA", 0, 100);
    assertFiniteInRange(input.scoreB, "scoreB", 0, 100);
    assertIsoTimestamp(input.recordedAt, "recordedAt");

    const expectedA = 1 / (1 + Math.pow(10, (modelB.eloRating - modelA.eloRating) / 400));
    const expectedB = 1 - expectedA;
    const actualA = input.scoreA === input.scoreB ? 0.5 : input.scoreA > input.scoreB ? 1 : 0;
    const actualB = 1 - actualA;
    modelA.eloRating = Math.round(modelA.eloRating + K_FACTOR * (actualA - expectedA));
    modelB.eloRating = Math.round(modelB.eloRating + K_FACTOR * (actualB - expectedB));
    modelA.episodesEvaluated += 1;
    modelB.episodesEvaluated += 1;

    const match: ArenaMatch = {
      matchId: `MATCH-${String(this.matches.length + 1).padStart(6, "0")}`,
      scenarioId: input.scenarioId,
      modelA: modelA.modelId,
      modelB: modelB.modelId,
      evidenceA: modelA.evidence.manifestId,
      evidenceB: modelB.evidence.manifestId,
      winner: input.scoreA === input.scoreB ? "tie" : input.scoreA > input.scoreB ? "modelA" : "modelB",
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      recordedAt: input.recordedAt,
    };
    this.matches.push(match);
    return { ...match };
  }

  getRecentMatches(): ArenaMatch[] {
    return this.matches.slice().reverse().map((match) => ({ ...match }));
  }
}
