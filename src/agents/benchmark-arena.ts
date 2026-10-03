/**
 * WorkWorld Bench & Public Model Arena (Game Changer #7).
 * Automated comparative benchmarking harness and Elo rating engine for frontier AI models.
 * Pure TypeScript — no React imports.
 */

export interface ModelProfile {
  modelId: string;
  provider: "anthropic" | "openai" | "google" | "deepseek" | "meta";
  displayName: string;
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
  winner: "modelA" | "modelB" | "tie";
  scoreA: number;
  scoreB: number;
  timestamp: string;
}

export class BenchmarkArena {
  private models: Map<string, ModelProfile> = new Map();
  private matches: ArenaMatch[] = [];

  constructor() {
    this.seedDefaultLeaderboard();
  }

  private seedDefaultLeaderboard(): void {
    const defaults: ModelProfile[] = [
      {
        modelId: "claude-3-7-sonnet",
        provider: "anthropic",
        displayName: "Claude 3.7 Sonnet (Thinking)",
        eloRating: 1420,
        episodesEvaluated: 120,
        passRatePct: 98.3,
        policyAdherencePct: 99.1,
        avgTokensPerEpisode: 4200,
        costPerCorrectSettlementUsd: 0.042,
        actionEfficiencyPct: 94.5,
      },
      {
        modelId: "gpt-4o",
        provider: "openai",
        displayName: "GPT-4o (Omni 2024-11)",
        eloRating: 1385,
        episodesEvaluated: 120,
        passRatePct: 94.2,
        policyAdherencePct: 96.5,
        avgTokensPerEpisode: 3800,
        costPerCorrectSettlementUsd: 0.038,
        actionEfficiencyPct: 91.2,
      },
      {
        modelId: "gemini-2-0-flash",
        provider: "google",
        displayName: "Gemini 2.0 Flash",
        eloRating: 1350,
        episodesEvaluated: 120,
        passRatePct: 91.7,
        policyAdherencePct: 94.8,
        avgTokensPerEpisode: 3500,
        costPerCorrectSettlementUsd: 0.012,
        actionEfficiencyPct: 88.0,
      },
      {
        modelId: "deepseek-v3",
        provider: "deepseek",
        displayName: "DeepSeek V3 (671B)",
        eloRating: 1365,
        episodesEvaluated: 120,
        passRatePct: 93.1,
        policyAdherencePct: 95.0,
        avgTokensPerEpisode: 4100,
        costPerCorrectSettlementUsd: 0.009,
        actionEfficiencyPct: 89.4,
      },
    ];

    for (const m of defaults) {
      this.models.set(m.modelId, m);
    }
  }

  getLeaderboard(): ModelProfile[] {
    return Array.from(this.models.values()).sort((a, b) => b.eloRating - a.eloRating);
  }

  getModel(modelId: string): ModelProfile | undefined {
    return this.models.get(modelId);
  }

  /**
   * Computes Elo rating change after a pairwise Arena battle.
   * Standard K-factor = 32.
   */
  recordMatch(
    scenarioId: string,
    modelAId: string,
    modelBId: string,
    scoreA: number,
    scoreB: number
  ): ArenaMatch {
    const modelA = this.models.get(modelAId);
    const modelB = this.models.get(modelBId);
    if (!modelA || !modelB) throw new Error("Models not registered in arena");

    const expectedA = 1 / (1 + Math.pow(10, (modelB.eloRating - modelA.eloRating) / 400));
    const expectedB = 1 - expectedA;

    let actualA = 0.5;
    let actualB = 0.5;
    let winner: ArenaMatch["winner"] = "tie";

    if (scoreA > scoreB) {
      actualA = 1.0;
      actualB = 0.0;
      winner = "modelA";
    } else if (scoreB > scoreA) {
      actualA = 0.0;
      actualB = 1.0;
      winner = "modelB";
    }

    const K = 32;
    modelA.eloRating = Math.round(modelA.eloRating + K * (actualA - expectedA));
    modelB.eloRating = Math.round(modelB.eloRating + K * (actualB - expectedB));

    modelA.episodesEvaluated += 1;
    modelB.episodesEvaluated += 1;

    const match: ArenaMatch = {
      matchId: `MATCH-${Date.now().toString(36).toUpperCase()}`,
      scenarioId,
      modelA: modelAId,
      modelB: modelBId,
      winner,
      scoreA,
      scoreB,
      timestamp: new Date().toISOString(),
    };

    this.matches.push(match);
    return match;
  }

  getRecentMatches(): ArenaMatch[] {
    return [...this.matches].reverse().slice(0, 50);
  }
}
