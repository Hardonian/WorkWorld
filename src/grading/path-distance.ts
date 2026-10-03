/**
 * Action Path Distance & Operational Efficiency Metric (Pillar 5, Item 044).
 * Compares learner/agent executed action sequence against canonical optimal DAG sequence.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface PathEfficiencyResult {
  optimalLength: number;
  actualLength: number;
  levenshteinDistance: number;
  redundantActionCount: number;
  efficiencyRatio: number; // 1.0 = perfectly optimal, < 1.0 = extraneous steps
}

/**
 * Computes Levenshtein distance between two sequences of action types.
 */
export function computeActionLevenshtein(optimal: string[], actual: string[]): number {
  const m = optimal.length;
  const n = actual.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    const prevRow = dp[i - 1]!;
    const currRow = dp[i]!;
    for (let j = 1; j <= n; j++) {
      if (optimal[i - 1] === actual[j - 1]) {
        currRow[j] = prevRow[j - 1]!;
      } else {
        currRow[j] = 1 + Math.min(prevRow[j]!, currRow[j - 1]!, prevRow[j - 1]!);
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Evaluates operational path efficiency.
 */
export function evaluatePathEfficiency(
  optimalPath: string[],
  actualPath: string[]
): PathEfficiencyResult {
  const distance = computeActionLevenshtein(optimalPath, actualPath);
  const redundant = Math.max(0, actualPath.length - optimalPath.length);

  // Efficiency ratio penalizes extra extraneous actions
  const efficiencyRatio =
    actualPath.length === 0
      ? 0
      : Math.max(0, Number((optimalPath.length / Math.max(optimalPath.length, actualPath.length + distance * 0.5)).toFixed(2)));

  return {
    optimalLength: optimalPath.length,
    actualLength: actualPath.length,
    levenshteinDistance: distance,
    redundantActionCount: redundant,
    efficiencyRatio,
  };
}
