import { describe, it, expect } from "vitest";
import { BenchmarkArena } from "../src/agents/benchmark-arena.ts";

describe("WorkWorld Bench & Arena (Game Changer #7)", () => {
  it("initializes leaderboard and updates Elo ratings after head-to-head battle", () => {
    const arena = new BenchmarkArena();
    const initialLeaders = arena.getLeaderboard();
    expect(initialLeaders.length).toBeGreaterThanOrEqual(4);

    const initialA = arena.getModel("claude-3-7-sonnet")!;
    const initialB = arena.getModel("gpt-4o")!;
    const initialEloA = initialA.eloRating;
    const initialEloB = initialB.eloRating;

    // Simulate match: Model A wins with score 98 vs 85
    const match = arena.recordMatch("A1", "claude-3-7-sonnet", "gpt-4o", 98, 85);
    expect(match.winner).toBe("modelA");

    const updatedA = arena.getModel("claude-3-7-sonnet")!;
    const updatedB = arena.getModel("gpt-4o")!;

    expect(updatedA.eloRating).toBeGreaterThan(initialEloA);
    expect(updatedB.eloRating).toBeLessThan(initialEloB);
    expect(arena.getRecentMatches()).toHaveLength(1);
  });
});
