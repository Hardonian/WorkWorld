import { describe, expect, it } from "vitest";
import { BenchmarkArena, type RegisterModelInput } from "../src/agents/benchmark-arena.ts";

const entrant = (modelId: string, overrides: Partial<RegisterModelInput> = {}): RegisterModelInput => ({
  modelId,
  provider: "other",
  displayName: modelId,
  configurationDigest: "a".repeat(64),
  evidence: {
    manifestId: `manifest-${modelId}`,
    replayId: `replay-${modelId}`,
    suiteVersion: "1.0.0",
    resultKind: "live-agent",
    verified: true,
    publishedAt: "2026-10-20T00:00:00.000Z",
  },
  passRatePct: 80,
  policyAdherencePct: 95,
  avgTokensPerEpisode: 1200,
  costPerCorrectSettlementUsd: 0.12,
  actionEfficiencyPct: 88,
  ...overrides,
});

describe("WorkWorld Index evidence-gated battle engine", () => {
  it("registers only published live-agent evidence and records a deterministic, attributable battle", () => {
    const arena = new BenchmarkArena();
    arena.registerModel(entrant("agent-alpha"));
    arena.registerModel(entrant("agent-beta", { configurationDigest: "b".repeat(64) }));

    const match = arena.recordMatch({
      scenarioId: "A1",
      modelAId: "agent-alpha",
      modelBId: "agent-beta",
      scoreA: 98,
      scoreB: 85,
      recordedAt: "2026-10-20T12:00:00.000Z",
    });

    expect(match).toMatchObject({
      matchId: "MATCH-000001",
      winner: "modelA",
      evidenceA: "manifest-agent-alpha",
      evidenceB: "manifest-agent-beta",
    });
    expect(arena.getModel("agent-alpha")?.eloRating).toBeGreaterThan(1200);
    expect(arena.getModel("agent-beta")?.eloRating).toBeLessThan(1200);
  });

  it("rejects invented, unverified, incompatible, or malformed battle records", () => {
    const arena = new BenchmarkArena();
    expect(() => arena.registerModel(entrant("fixture", { evidence: { ...entrant("fixture").evidence, resultKind: "live-agent", verified: false } as never }))).toThrow(/verified live-agent evidence/);
    arena.registerModel(entrant("agent-alpha"));
    arena.registerModel(entrant("agent-beta", { configurationDigest: "b".repeat(64), evidence: { ...entrant("agent-beta").evidence, suiteVersion: "2.0.0" } }));
    expect(() => arena.recordMatch({ scenarioId: "A1", modelAId: "agent-alpha", modelBId: "agent-beta", scoreA: 50, scoreB: 50, recordedAt: "2026-10-20T12:00:00.000Z" })).toThrow(/same suiteVersion/);
    expect(() => arena.recordMatch({ scenarioId: "A1", modelAId: "agent-alpha", modelBId: "agent-alpha", scoreA: 50, scoreB: 50, recordedAt: "2026-10-20T12:00:00.000Z" })).toThrow(/cannot battle itself/);
  });

  it("returns defensive snapshots and sorts tied ratings deterministically", () => {
    const arena = new BenchmarkArena();
    const beta = arena.registerModel(entrant("agent-beta"));
    beta.displayName = "mutated outside the arena";
    arena.registerModel(entrant("agent-alpha", { configurationDigest: "b".repeat(64) }));

    expect(arena.getModel("agent-beta")?.displayName).toBe("agent-beta");
    expect(arena.getLeaderboard().map((model) => model.modelId)).toEqual(["agent-alpha", "agent-beta"]);
  });
});
