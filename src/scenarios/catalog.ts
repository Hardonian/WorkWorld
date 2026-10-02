/**
 * Public scenario catalog: the six initial episodes (2 per family).
 * Withheld variants live in ./withheld/ and must never enter agent context,
 * public archives, or training fixtures.
 */
import { ScenarioDefinition } from "./schema.ts";
import { A1, A2 } from "./family-a.ts";
import { B1, B2 } from "./family-b.ts";
import { C1, C2 } from "./family-c.ts";

const PUBLIC_SCENARIOS = [A1, A2, B1, B2, C1, C2];

// Validate every scenario at module load — a malformed scenario is a build error.
export const SCENARIOS: Record<string, ScenarioDefinition> = Object.fromEntries(
  PUBLIC_SCENARIOS.map((s) => [s.id, ScenarioDefinition.parse(s)]),
);

export function getScenario(id: string): ScenarioDefinition {
  const s = SCENARIOS[id];
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
}

export function listScenarios(): ScenarioDefinition[] {
  return Object.values(SCENARIOS);
}
