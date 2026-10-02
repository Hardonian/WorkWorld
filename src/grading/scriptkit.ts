/**
 * ScriptRunner — small helper for deterministic scripted actors (baseline and
 * negative controls). Fixtures only: these are not model runs.
 */
import { EpisodeEngine } from "../domain/engine.ts";
import type { Action, ActionInput, Actor, Transition } from "../domain/types.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";

export class ScriptRunner {
  readonly engine: EpisodeEngine;
  readonly actor: Actor;
  readonly log: { action: Action; actor: Actor }[] = [];
  private n = 0;

  constructor(
    scenario: ScenarioDefinition,
    label: string,
    condition: "human" | "agent" | "assisted" = "agent",
    engine?: EpisodeEngine,
  ) {
    this.engine =
      engine ??
      EpisodeEngine.reset(scenario, {
        runId: `run-${scenario.id}-${label}`,
        seed: 42,
        condition,
      });
    this.actor = { id: label, kind: "agent", role: "participant" };
  }

  /** Step with an auto-filled actionId/idempotencyKey/expectedRevision. */
  step(payload: ActionInput): Transition {
    this.n += 1;
    const action = {
      ...payload,
      actionId: `${this.actor.id}-${this.n}`,
      idempotencyKey: `${this.actor.id}-key-${this.n}`,
      expectedRevision: this.engine.observe().revision,
    } as Action;
    this.log.push({ action, actor: this.actor });
    const t = this.engine.step(action, this.actor);
    return t;
  }

  /** Step and fail loudly if the engine rejected it (for must-succeed steps). */
  must(payload: ActionInput): Transition {
    const t = this.step(payload);
    if (!t.ok) {
      throw new Error(
        `scripted step ${payload.type} unexpectedly rejected: ${t.errors.map((e) => e.code).join(",")}`,
      );
    }
    return t;
  }
}

export const PARTICIPANT: Actor = { id: "script", kind: "agent", role: "participant" };
