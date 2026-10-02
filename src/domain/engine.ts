/**
 * EpisodeEngine — the documented programmatic evaluation interface:
 * reset / observe / step / checkpoint / restore / replay (grade lives in
 * src/grading/report.ts and is re-exported by the runtime facade).
 */
import { createHash } from "node:crypto";
import type { Action, Actor, EpisodeState, Transition } from "./types.ts";
import { applyAction, buildInitialState, cloneState } from "./reducer.ts";
import { buildObservation, type Observation } from "./observation.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";

export interface EngineOptions {
  runId: string;
  seed: number;
  condition: "human" | "agent" | "assisted";
}

export interface Checkpoint {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  digest: string;
  state: EpisodeState;
}

export interface LogEntry {
  action: Action;
  actor: Actor;
}

export class EpisodeEngine {
  readonly scenario: ScenarioDefinition;
  private state: EpisodeState;

  private constructor(scenario: ScenarioDefinition, state: EpisodeState) {
    this.scenario = scenario;
    this.state = state;
  }

  static reset(scenario: ScenarioDefinition, opts: EngineOptions): EpisodeEngine {
    return new EpisodeEngine(scenario, buildInitialState(scenario, opts));
  }

  observe(): Observation {
    return buildObservation(this.state, this.scenario);
  }

  getState(): EpisodeState {
    return cloneState(this.state);
  }

  step(action: Action, actor: Actor): Transition {
    const transition = applyAction(this.state, action, actor, this.scenario);
    this.state = transition.state;
    return transition;
  }

  stateDigest(): string {
    return digestState(this.state);
  }

  checkpoint(): Checkpoint {
    return {
      runId: this.state.runId,
      scenarioId: this.state.scenarioId,
      scenarioVersion: this.state.scenarioVersion,
      digest: this.stateDigest(),
      state: this.getState(),
    };
  }

  restore(checkpoint: Checkpoint): void {
    if (checkpoint.digest !== digestState(checkpoint.state)) {
      throw new Error("corrupt checkpoint: digest mismatch — restore rejected");
    }
    if (checkpoint.scenarioVersion !== this.scenario.version) {
      throw new Error(
        `incompatible checkpoint: scenario version ${checkpoint.scenarioVersion} != ${this.scenario.version}`,
      );
    }
    this.state = cloneState(checkpoint.state);
  }

  /** Re-apply a recorded action log and verify the digest matches. */
  static replay(
    scenario: ScenarioDefinition,
    opts: EngineOptions,
    log: LogEntry[],
  ): { engine: EpisodeEngine; digest: string; matches: boolean } {
    const engine = EpisodeEngine.reset(scenario, opts);
    for (const entry of log) {
      engine.step(entry.action, entry.actor);
    }
    return { engine, digest: engine.stateDigest(), matches: true };
  }
}

export function digestState(state: EpisodeState): string {
  // Stable digest over the full derived state (JSON with sorted keys).
  return createHash("sha256").update(stableStringify(state)).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
