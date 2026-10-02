/**
 * Server-side session handling for the demo workspace.
 * - Opaque random session id in an httpOnly cookie (never a client-supplied tenant).
 * - State persists through the EventStore so refresh/resume works.
 * - Every action goes through the shared domain core (same as agents/evaluator).
 */
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { EpisodeEngine } from "../domain/engine.ts";
import type { Action, ActionInput, EpisodeState, Transition } from "../domain/types.ts";
import { getScenario } from "../scenarios/catalog.ts";
import { buildObservation, type Observation } from "../domain/observation.ts";
import { makeStore, STORE_SCHEMA_VERSION, type EventStore } from "./store.ts";
import { sanitizeActionInput } from "./actions.ts";

const COOKIE = "ww_session";
const RUN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

let storeSingleton: EventStore | null = null;
function store(): EventStore {
  if (!storeSingleton) {
    const kind = (process.env.WORKWORLD_STORE ?? "file") as "memory" | "file";
    storeSingleton = makeStore(kind);
  }
  return storeSingleton;
}

export interface SessionInfo {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  condition: "human" | "agent" | "assisted";
  seed: number;
  createdAt: string;
  storeSchemaVersion: number;
}

function isValidSessionId(id: string): boolean {
  return /^[0-9a-f-]{36}$/.test(id);
}

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  return id && isValidSessionId(id) ? id : null;
}

export async function startSession(
  scenarioId: string,
  condition: "human" | "agent" | "assisted",
): Promise<{ observation: Observation; runId: string }> {
  const scenario = getScenario(scenarioId);
  const runId = randomUUID();
  const meta: SessionInfo = {
    runId,
    scenarioId,
    scenarioVersion: scenario.version,
    condition,
    seed: Date.now() % 100000,
    createdAt: new Date().toISOString(),
    storeSchemaVersion: STORE_SCHEMA_VERSION,
  };
  await store().createRun(meta);
  const engine = EpisodeEngine.reset(scenario, { runId, seed: meta.seed, condition });
  await store().saveState(runId, engine.getState());
  return { observation: engine.observe(), runId };
}

export async function loadEngine(): Promise<{ engine: EpisodeEngine; runId: string } | null> {
  const runId = await getSessionId();
  if (!runId) return null;
  try {
    const state = await store().loadState(runId);
    const scenario = getScenario(state.scenarioId);
    return { engine: EpisodeEngine.fromState(scenario, state), runId };
  } catch {
    // Missing or corrupt state: caller presents the recovery path (restart episode).
    return null;
  }
}

export async function applyActionInput(
  input: Record<string, unknown>,
): Promise<{ transition: Transition; observation: Observation } | { error: string; code: string }> {
  const loaded = await loadEngine();
  if (!loaded) {
    return {
      error:
        "No active episode (or stored state failed verification). Start an episode; prior evidence is preserved in the store.",
      code: "NO_SESSION",
    };
  }
  const { engine, runId } = loaded;
  let action: Action;
  try {
    const sanitized = sanitizeActionInput(input);
    action = {
      ...sanitized,
      actionId: randomUUID(),
      idempotencyKey: String(input.idempotencyKey ?? randomUUID()),
      expectedRevision: Number(input.expectedRevision ?? engine.observe().revision),
    } as Action;
  } catch (e) {
    return { error: (e as Error).message, code: "PAYLOAD_INVALID" };
  }

  const condition = engine.observe().condition;
  const actor = {
    id: "participant",
    kind: condition === "assisted" ? ("assisted" as const) : ("human" as const),
    role: "participant" as const,
  };
  const transition = engine.step(action, actor);
  await store().saveState(runId, engine.getState());
  await store().appendAction(runId, { action, actor });
  return { transition, observation: engine.observe() };
}

export async function currentObservation(): Promise<Observation | null> {
  const loaded = await loadEngine();
  return loaded ? loaded.engine.observe() : null;
}

export async function currentState(): Promise<EpisodeState | null> {
  const loaded = await loadEngine();
  return loaded ? loaded.engine.getState() : null;
}

export function cookieName(): string {
  return COOKIE;
}

export function sessionTtlMs(): number {
  return RUN_TTL_MS;
}

export { sanitizeActionInput };
